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
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

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
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    let deletedCount = 0;
    let errors = [];

    // Check all stored files for expiration
    for (const [code, fileData] of fileStorage.entries()) {
      if (fileData.uploadTime < thirtyMinutesAgo) {
        try {
          // Delete from WebDAV
          await webdavClient.deleteFile(fileData.webdavPath);
          // Remove from memory storage
          fileStorage.delete(code);
          deletedCount++;
          console.log(`Cleaned up expired file: ${code}`);
        } catch (deleteError) {
          console.error(`Failed to delete ${code}:`, deleteError);
          errors.push(`Failed to delete ${code}: ${deleteError.message}`);
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Cleanup completed',
        deletedCount,
        errors: errors.length > 0 ? errors : undefined
      })
    };

  } catch (error) {
    console.error('Cleanup error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Cleanup failed: ' + error.message })
    };
  }
};