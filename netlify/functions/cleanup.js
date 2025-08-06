// Simple in-memory storage (shared with other functions)
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
    const now = new Date();
    const thirtyMinutes = 30 * 60 * 1000;
    let deletedCount = 0;

    // Check all files for expiration
    for (const [code, fileData] of fileStorage.entries()) {
      const createdAt = new Date(fileData.createdAt);
      
      if (now - createdAt > thirtyMinutes) {
        fileStorage.delete(code);
        deletedCount++;
        console.log(`Deleted expired file: ${code}`);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Cleanup completed',
        deletedCount,
        remainingFiles: fileStorage.size
      })
    };

  } catch (error) {
    console.error('Cleanup error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Cleanup failed' })
    };
  }
};