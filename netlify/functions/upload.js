const multipart = require('lambda-multipart-parser');

// Simple in-memory storage for demo (in production use database)
const fileStorage = new Map();

// Generate unique 6-character code
function generateUniqueCode() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Check if code exists
  if (fileStorage.has(code)) {
    return generateUniqueCode(); // Recursive retry
  }
  
  return code;
}

exports.handler = async (event, context) => {
  // Enable CORS
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
    if (!file.contentType || !file.contentType.startsWith('audio/')) {
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
    const code = generateUniqueCode();
    
    // Store file data in memory (base64 encoded)
    const fileData = {
      code,
      filename: file.filename,
      contentType: file.contentType,
      content: file.content.toString('base64'),
      size: file.content.length,
      createdAt: new Date().toISOString(),
      downloadCount: 0
    };

    fileStorage.set(code, fileData);

    console.log(`File uploaded with code: ${code}, size: ${file.content.length} bytes`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ code })
    };

  } catch (error) {
    console.error('Upload error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Upload failed' })
    };
  }
};