const { createClient } = require('webdav');

// WebDAV client configuration
const webdavClient = createClient('https://www.megadisk.net/cloud11/remote.php/webdav/', {
  username: '89027447339da@gmail.com',
  password: 'WGRPI-QFWNJ-DGBHY-OZQUS'
});

// Simple in-memory storage for demo (in production use a database)
const fileStorage = new Map();

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

    if (!code || code.length !== 6) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid code format' })
      };
    }

    // Get file metadata from storage
    const fileData = fileStorage.get(code);
    
    if (!fileData) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'File not found' })
      };
    }

    // Check if file is expired (30 minutes)
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    if (fileData.uploadTime < thirtyMinutesAgo) {
      // File expired, clean up
      try {
        await webdavClient.deleteFile(fileData.webdavPath);
        fileStorage.delete(code);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
      
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'File expired and has been removed' })
      };
    }

    try {
      // Download file from WebDAV
      const fileBuffer = await webdavClient.getFileContents(fileData.webdavPath);
      
      // Increment download count
      fileData.downloadCount++;
      fileStorage.set(code, fileData);

      // Return file with proper headers
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': fileData.contentType,
          'Content-Disposition': `attachment; filename="${fileData.filename}"`,
          'Content-Length': fileData.size.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: fileBuffer.toString('base64'),
        isBase64Encoded: true
      };

    } catch (webdavError) {
      console.error('WebDAV download error:', webdavError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to download from WebDAV storage',
          details: webdavError.message 
        })
      };
    }

  } catch (error) {
    console.error('Download error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Download failed: ' + error.message })
    };
  }
};