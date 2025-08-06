// Simple in-memory storage (shared with upload function)
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

    if (!code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Code is required' })
      };
    }

    // Get file from storage
    const fileData = fileStorage.get(code);
    
    if (!fileData) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'File not found' })
      };
    }

    // Check if file is expired (30 minutes)
    const createdAt = new Date(fileData.createdAt);
    const now = new Date();
    const thirtyMinutes = 30 * 60 * 1000;
    
    if (now - createdAt > thirtyMinutes) {
      // Remove expired file
      fileStorage.delete(code);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'File expired' })
      };
    }

    // Increment download count
    fileData.downloadCount++;

    // Convert base64 back to binary
    const fileBuffer = Buffer.from(fileData.content, 'base64');

    console.log(`File downloaded: ${code}, downloads: ${fileData.downloadCount}`);

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

  } catch (error) {
    console.error('Download error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Download failed' })
    };
  }
};