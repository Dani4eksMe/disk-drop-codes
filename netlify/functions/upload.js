const multipart = require('lambda-multipart-parser');

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
    
    // Store file data in localStorage simulation (using environment variables)
    // In a real implementation, you'd use a database service like FaunaDB or Supabase
    const fileData = {
      code,
      filename: file.filename,
      contentType: file.contentType,
      content: file.content.toString('base64'),
      size: file.content.length,
      uploadTime: Date.now()
    };

    // For demo purposes, we'll return the code
    // In production, store this in a proper database
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        code,
        message: 'File uploaded successfully',
        downloadUrl: `${process.env.URL || 'https://meek-smakager-d236bb.netlify.app'}/api/download/${code}`
      })
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