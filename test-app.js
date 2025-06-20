#!/usr/bin/env node

/**
 * Test script to verify the application is working correctly
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing pic2tool application...\n');

// Test 1: Build the application
console.log('1️⃣ Testing build process...');
const buildProcess = spawn('npm', ['run', 'build'], {
  stdio: 'inherit',
  cwd: __dirname,
});

buildProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Build successful!\n');
    
    // Test 2: Start web dev server
    console.log('2️⃣ Starting web development server...');
    console.log('🌐 Web interface will be available at: http://localhost:3000/');
    console.log('🌐 Network interface will be available at: http://192.168.178.105:3000/');
    console.log('📱 Use Ctrl+C to stop the server\n');
    
    const webServer = spawn('npm', ['run', 'dev:web'], {
      stdio: 'inherit',
      cwd: __dirname,
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping web server...');
      webServer.kill('SIGINT');
      process.exit(0);
    });
    
  } else {
    console.error('❌ Build failed with code:', code);
    process.exit(1);
  }
});

buildProcess.on('error', (error) => {
  console.error('❌ Build error:', error);
  process.exit(1);
});
