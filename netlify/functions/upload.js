const multipart = require('lambda-multipart-parser');
const { createClient } = require('webdav');

// WebDAV client configuration
const webdavClient = createClient('https://www.megadisk.net/cloud11/remote.php/webdav/', {
  username: '89027447339da@gmail.com',
  password: 'WGRPI-QFWNJ-DGBHY-OZQUS'
});

// Simple in-memory storage for demo (in production use a database)
const fileStorage = new Map();

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse multipart form data
    const result = await multipart.parse(event);
    
    if (!result.files || result.files.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No file uploaded' })
      };
    }

    const file = result.files[0];
    
    // Validate file type
    if (!file.contentType.startsWith('audio/')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Only audio files are allowed' })
      };
    }

    // Validate file size (20MB)
    if (file.content.length > 20 * 1024 * 1024) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'File size must be less than 20MB' })
      };
    }

    // Generate unique code
    const generateCode = () => {
      const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    const code = generateCode();
    const timestamp = Date.now();
    const fileExtension = file.filename.split('.').pop() || 'mp3';
    const webdavFileName = `${code}_${timestamp}.${fileExtension}`;
    const webdavPath = `/mp3-uploads/${webdavFileName}`;

    try {
      // Create directory if it doesn't exist
      try {
        await webdavClient.createDirectory('/mp3-uploads');
      } catch (dirError) {
        // Directory might already exist, ignore error
      }

      // Upload file to WebDAV
      await webdavClient.putFileContents(webdavPath, file.content, {
        contentType: file.contentType,
        overwrite: true
      });

      // Store file metadata
      const fileData = {
        code,
        filename: file.filename,
        contentType: file.contentType,
        size: file.content.length,
        uploadTime: timestamp,
        webdavPath,
        downloadCount: 0
      };

      // Store in memory (in production, use a proper database)
      fileStorage.set(code, fileData);

      console.log(`File uploaded successfully: ${code} -> ${webdavPath}`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          code,
          message: 'File uploaded successfully to WebDAV storage'
        })
      };

    } catch (webdavError) {
      console.error('WebDAV upload error:', webdavError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to upload to WebDAV storage',
          details: webdavError.message 
        })
      };
    }

  } catch (error) {
    console.error('Upload error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Upload failed: ' + error.message })
    };
  }
};