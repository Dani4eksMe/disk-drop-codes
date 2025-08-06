#!/bin/bash

echo "🎵 Starting Custom Discs Server..."
echo "📦 Installing dependencies..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    npm install
fi

echo "🚀 Starting server..."
node index.js