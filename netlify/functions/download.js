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

    // For demo purposes, return a sample response
    // In production, you'd retrieve the file from your database
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ 
        error: 'File not found or expired',
        message: 'This is a demo - files are not actually stored on Netlify'
      })
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