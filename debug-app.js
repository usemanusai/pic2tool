#!/usr/bin/env node

/**
 * Debug script to help diagnose white screen issues
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔍 pic2tool Debug Script');
console.log('========================\n');

// Check build files
console.log('📁 Checking build files...');
const buildFiles = [
  'dist/main.js',
  'dist/preload.js', 
  'dist/renderer.js',
  'dist/index.html'
];

buildFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    console.log(`✅ ${file} (${Math.round(stats.size / 1024)}KB)`);
  } else {
    console.log(`❌ ${file} - MISSING`);
  }
});

// Check HTML content
console.log('\n📄 Checking HTML content...');
if (fs.existsSync('dist/index.html')) {
  const htmlContent = fs.readFileSync('dist/index.html', 'utf8');
  console.log('HTML includes renderer.js:', htmlContent.includes('renderer.js') ? '✅' : '❌');
  console.log('HTML has root div:', htmlContent.includes('id="root"') ? '✅' : '❌');
} else {
  console.log('❌ HTML file not found');
}

console.log('\n🚀 Starting Electron with enhanced debugging...');
console.log('Watch the console output for detailed debugging information.\n');

// Start Electron with debugging
const electronProcess = spawn('electron', ['.', '--dev'], {
  stdio: 'inherit',
  cwd: __dirname,
  env: {
    ...process.env,
    NODE_ENV: 'development',
    ELECTRON_ENABLE_LOGGING: '1',
    ELECTRON_ENABLE_STACK_DUMPING: '1'
  }
});

electronProcess.on('close', (code) => {
  console.log(`\n📊 Electron process exited with code: ${code}`);
  
  if (code !== 0) {
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('1. Check the console output above for React errors');
    console.log('2. Look for "electronAPI available" messages');
    console.log('3. Check for component mounting/unmounting logs');
    console.log('4. Verify preload script is loading correctly');
    console.log('5. Check for any IPC communication errors');
  }
});

electronProcess.on('error', (error) => {
  console.error('❌ Failed to start Electron:', error);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping debug session...');
  electronProcess.kill('SIGINT');
  process.exit(0);
});
