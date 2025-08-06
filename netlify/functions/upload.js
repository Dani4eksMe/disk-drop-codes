const { createClient } = require('webdav');
const multipart = require('lambda-multipart-parser');

// WebDAV configuration
const WEBDAV_URL = 'https://www.megadisk.net/cloud11/remote.php/webdav/';
const WEBDAV_USERNAME = '89027447339da@gmail.com';
const WEBDAV_PASSWORD = 'WGRPI-QFWNJ-DGBHY-OZQUS';

// Create WebDAV client
const client = createClient(WEBDAV_URL, {
  username: WEBDAV_USERNAME,
  password: WEBDAV_PASSWORD
});

// Simple in-memory storage for metadata
const fileMetadata = new Map();

// Generate unique 6-character code
function generateUniqueCode() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Check if code exists
  if (fileMetadata.has(code)) {
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
    const timestamp = Date.now();
    const fileName = `${code}_${timestamp}.mp3`;
    const remotePath = `/mp3-uploads/${fileName}`;

    try {
      // Ensure directory exists
      await client.createDirectory('/mp3-uploads/', { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
      console.log('Directory creation info:', error.message);
    }

    // Upload file to WebDAV
    await client.putFileContents(remotePath, file.content, {
      contentType: file.contentType,
      overwrite: true
    });

    // Store metadata
    const metadata = {
      code,
      filename: file.filename,
      originalFilename: file.filename,
      remotePath,
      contentType: file.contentType,
      size: file.content.length,
      createdAt: new Date().toISOString(),
      downloadCount: 0
    };

    fileMetadata.set(code, metadata);

    console.log(`File uploaded to WebDAV: ${code}, path: ${remotePath}, size: ${file.content.length} bytes`);

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
      body: JSON.stringify({ error: 'Upload failed: ' + error.message })
    };
  }
};