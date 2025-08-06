const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Ensure directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const dbDir = path.join(__dirname, 'database');
fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(dbDir);

// Database setup
const db = new sqlite3.Database(path.join(dbDir, 'files.db'));

// Initialize database
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS mp3_uploads (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      filename TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'audio/mpeg',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      download_count INTEGER DEFAULT 0
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_mp3_uploads_code ON mp3_uploads(code)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_mp3_uploads_created_at ON mp3_uploads(created_at)`);
});

// Generate unique 6-character code
function generateUniqueCode() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Check if code exists
function isCodeUnique(code) {
  return new Promise((resolve, reject) => {
    db.get('SELECT code FROM mp3_uploads WHERE code = ?', [code], (err, row) => {
      if (err) reject(err);
      else resolve(!row);
    });
  });
}

// Get unique code
async function getUniqueCode() {
  let code;
  let isUnique = false;
  let attempts = 0;
  
  while (!isUnique && attempts < 10) {
    code = generateUniqueCode();
    isUnique = await isCodeUnique(code);
    attempts++;
  }
  
  if (!isUnique) {
    throw new Error('Could not generate unique code');
  }
  
  return code;
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

// Upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const code = await getUniqueCode();
    const id = uuidv4();
    
    const fileData = {
      id,
      code,
      filename: req.file.filename,
      original_filename: req.file.originalname,
      file_path: req.file.path,
      file_size: req.file.size,
      mime_type: req.file.mimetype
    };

    db.run(
      `INSERT INTO mp3_uploads (id, code, filename, original_filename, file_path, file_size, mime_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [fileData.id, fileData.code, fileData.filename, fileData.original_filename, 
       fileData.file_path, fileData.file_size, fileData.mime_type],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          // Clean up uploaded file
          fs.unlink(req.file.path, () => {});
          return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({ code: fileData.code });
      }
    );
  } catch (error) {
    console.error('Upload error:', error);
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({ error: error.message });
  }
});

// Download endpoint
app.get('/api/download/:code', (req, res) => {
  const { code } = req.params;
  
  // Check if file exists and is not expired (30 minutes)
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  
  db.get(
    'SELECT * FROM mp3_uploads WHERE code = ? AND created_at > ?',
    [code, thirtyMinutesAgo],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'File not found or expired' });
      }
      
      // Check if file exists on disk
      if (!fs.existsSync(row.file_path)) {
        return res.status(404).json({ error: 'File not found on disk' });
      }
      
      // Increment download count
      db.run('UPDATE mp3_uploads SET download_count = download_count + 1 WHERE code = ?', [code]);
      
      // Send file
      res.setHeader('Content-Type', row.mime_type);
      res.setHeader('Content-Disposition', `attachment; filename="${row.original_filename}"`);
      res.setHeader('Content-Length', row.file_size);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const fileStream = fs.createReadStream(row.file_path);
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('File stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'File read error' });
        }
      });
    }
  );
});

// Cleanup expired files endpoint
app.post('/api/cleanup', (req, res) => {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  
  db.all(
    'SELECT * FROM mp3_uploads WHERE created_at < ?',
    [thirtyMinutesAgo],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!rows || rows.length === 0) {
        return res.json({ message: 'No expired files found', count: 0 });
      }
      
      let deletedCount = 0;
      let errors = [];
      
      rows.forEach((row) => {
        // Delete file from disk
        fs.unlink(row.file_path, (unlinkErr) => {
          if (unlinkErr && unlinkErr.code !== 'ENOENT') {
            console.error(`Failed to delete file: ${row.file_path}`, unlinkErr);
            errors.push(`File deletion failed for ${row.code}: ${unlinkErr.message}`);
          }
        });
        
        // Delete from database
        db.run('DELETE FROM mp3_uploads WHERE id = ?', [row.id], (deleteErr) => {
          if (deleteErr) {
            console.error(`Failed to delete from database: ${row.id}`, deleteErr);
            errors.push(`Database deletion failed for ${row.code}: ${deleteErr.message}`);
          } else {
            deletedCount++;
            console.log(`Successfully deleted expired file: ${row.code}`);
          }
        });
      });
      
      setTimeout(() => {
        res.json({
          message: 'Cleanup completed',
          deletedCount,
          totalExpired: rows.length,
          errors: errors.length > 0 ? errors : undefined
        });
      }, 1000);
    }
  );
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Cleanup on startup
function cleanupOnStartup() {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  
  db.all('SELECT * FROM mp3_uploads WHERE created_at < ?', [thirtyMinutesAgo], (err, rows) => {
    if (err) {
      console.error('Startup cleanup error:', err);
      return;
    }
    
    if (rows && rows.length > 0) {
      console.log(`Cleaning up ${rows.length} expired files on startup...`);
      
      rows.forEach((row) => {
        fs.unlink(row.file_path, () => {});
        db.run('DELETE FROM mp3_uploads WHERE id = ?', [row.id]);
      });
    }
  });
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Upload endpoint: http://localhost:${PORT}/api/upload`);
  console.log(`⬇️  Download endpoint: http://localhost:${PORT}/api/download/:code`);
  console.log(`🌐 Web interface: http://localhost:${PORT}`);
  
  // Cleanup expired files on startup
  cleanupOnStartup();
  
  // Schedule cleanup every 10 minutes
  setInterval(() => {
    console.log('🧹 Running scheduled cleanup...');
    // Simple cleanup without fetch
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    db.all('SELECT * FROM mp3_uploads WHERE created_at < ?', [thirtyMinutesAgo], (err, rows) => {
      if (err) {
        console.error('Scheduled cleanup error:', err);
        return;
      }
      
      if (rows && rows.length > 0) {
        console.log(`🗑️  Cleaning up ${rows.length} expired files...`);
        
        rows.forEach((row) => {
          fs.unlink(row.file_path, () => {});
          db.run('DELETE FROM mp3_uploads WHERE id = ?', [row.id]);
        });
      }
    });
  }, 10 * 60 * 1000);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('✅ Database connection closed.');
    }
    process.exit(0);
  });
});