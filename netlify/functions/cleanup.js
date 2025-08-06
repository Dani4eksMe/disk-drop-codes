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

// Simple in-memory storage for metadata (shared with other functions)
const fileMetadata = new Map();

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
    const now = new Date();
    const thirtyMinutes = 30 * 60 * 1000;
    let deletedCount = 0;
    let errors = [];

    // Clean up from metadata
    for (const [code, metadata] of fileMetadata.entries()) {
      const createdAt = new Date(metadata.createdAt);
      
      if (now - createdAt > thirtyMinutes) {
        try {
          await client.deleteFile(metadata.remotePath);
          fileMetadata.delete(code);
          deletedCount++;
          console.log(`Deleted expired file from metadata: ${code}`);
        } catch (error) {
          console.error(`Failed to delete file ${code}:`, error);
          errors.push(`Failed to delete ${code}: ${error.message}`);
        }
      }
    }

    // Also scan WebDAV directory for orphaned files
    try {
      const files = await client.getDirectoryContents('/mp3-uploads/');
      
      for (const file of files) {
        if (file.type === 'file') {
          const createdAt = new Date(file.lastmod);
          
          if (now - createdAt > thirtyMinutes) {
            try {
              await client.deleteFile(file.filename);
              deletedCount++;
              console.log(`Deleted expired orphaned file: ${file.basename}`);
            } catch (error) {
              console.error(`Failed to delete orphaned file ${file.basename}:`, error);
              errors.push(`Failed to delete orphaned file ${file.basename}: ${error.message}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error scanning WebDAV directory for cleanup:', error);
      errors.push(`Directory scan failed: ${error.message}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Cleanup completed',
        deletedCount,
        remainingFiles: fileMetadata.size,
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