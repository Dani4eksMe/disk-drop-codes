const { createClient } = require('webdav');

// WebDAV configuration
const WEBDAV_URL = 'https://www.megadisk.net/cloud11/remote.php/webdav/';
const WEBDAV_USERNAME = '89027447339da@gmail.com';
const WEBDAV_PASSWORD = 'WGRPI-QFWNJ-DGBHY-OZQUS';

// Create WebDAV client
const client = createClient(WEBDAV_URL, {
  username: WEBDAV_USERNAME,
  password: WEBDAV_PASSWORD
});

// Simple in-memory storage for metadata (shared with upload function)
const fileMetadata = new Map();

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Extract code from path
    const pathParts = event.path.split('/');
    const code = pathParts[pathParts.length - 1];

    if (!code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Code is required' })
      };
    }

    // Get metadata
    const metadata = fileMetadata.get(code);
    
    if (!metadata) {
      // Try to find file by scanning WebDAV directory
      try {
        const files = await client.getDirectoryContents('/mp3-uploads/');
        const matchingFile = files.find(file => file.basename.startsWith(code + '_'));
        
        if (!matchingFile) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'File not found' })
          };
        }

        // Create metadata from file info
        const createdAt = new Date(matchingFile.lastmod);
        const now = new Date();
        const thirtyMinutes = 30 * 60 * 1000;
        
        if (now - createdAt > thirtyMinutes) {
          // File is expired, delete it
          await client.deleteFile(matchingFile.filename);
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'File expired' })
          };
        }

        // Reconstruct metadata
        const reconstructedMetadata = {
          code,
          remotePath: matchingFile.filename,
          contentType: 'audio/mpeg',
          size: matchingFile.size,
          originalFilename: `${code}.mp3`,
          createdAt: createdAt.toISOString(),
          downloadCount: 0
        };

        fileMetadata.set(code, reconstructedMetadata);
        metadata = reconstructedMetadata;
      } catch (error) {
        console.error('Error scanning WebDAV directory:', error);
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'File not found' })
        };
      }
    }

    // Check if file is expired (30 minutes)
    const createdAt = new Date(metadata.createdAt);
    const now = new Date();
    const thirtyMinutes = 30 * 60 * 1000;
    
    if (now - createdAt > thirtyMinutes) {
      // Remove expired file
      try {
        await client.deleteFile(metadata.remotePath);
      } catch (error) {
        console.error('Error deleting expired file:', error);
      }
      fileMetadata.delete(code);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'File expired' })
      };
    }

    // Download file from WebDAV
    const fileBuffer = await client.getFileContents(metadata.remotePath, { format: 'binary' });

    // Increment download count
    metadata.downloadCount++;

    console.log(`File downloaded: ${code}, downloads: ${metadata.downloadCount}`);

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': metadata.contentType,
        'Content-Disposition': `attachment; filename="${metadata.originalFilename}"`,
        'Content-Length': metadata.size.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      body: fileBuffer.toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('Download error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Download failed: ' + error.message })
    };
  }
};