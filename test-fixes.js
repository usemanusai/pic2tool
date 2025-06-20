#!/usr/bin/env node

/**
 * Comprehensive test script for both critical fixes:
 * 1. Global keyboard shortcuts
 * 2. FFprobe binary path fix
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Critical Fixes Verification Test');
console.log('===================================\n');

// Test 1: FFprobe Binary Path Fix
console.log('1️⃣ Testing FFprobe Binary Path Fix');
console.log('-----------------------------------');

// Check if ffprobe-static is installed
try {
  const ffprobeStatic = require('ffprobe-static');
  if (ffprobeStatic && fs.existsSync(ffprobeStatic)) {
    console.log('✅ ffprobe-static installed and binary found at:', ffprobeStatic);
  } else {
    console.log('❌ ffprobe-static binary not found');
  }
} catch (error) {
  console.log('❌ ffprobe-static package not installed:', error.message);
}

// Check if ffmpeg-static is still available
try {
  const ffmpegStatic = require('ffmpeg-static');
  if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
    console.log('✅ ffmpeg-static available at:', ffmpegStatic);
  } else {
    console.log('❌ ffmpeg-static binary not found');
  }
} catch (error) {
  console.log('❌ ffmpeg-static package not available:', error.message);
}

// Check VideoProcessingModule build
const mainJsPath = path.join(__dirname, 'dist', 'main.js');
if (fs.existsSync(mainJsPath)) {
  const mainContent = fs.readFileSync(mainJsPath, 'utf8');
  console.log('✅ VideoProcessingModule in build:', mainContent.includes('VideoProcessingModule'));
  console.log('✅ ffprobe-static import:', mainContent.includes('ffprobe-static'));
  console.log('✅ ffmpeg-static import:', mainContent.includes('ffmpeg-static'));
  console.log('✅ getVideoInfo method:', mainContent.includes('getVideoInfo'));
} else {
  console.log('❌ main.js not found - run npm run build');
}

console.log('\n2️⃣ Testing Global Keyboard Shortcuts');
console.log('-------------------------------------');

// Check GlobalShortcutManager build
if (fs.existsSync(mainJsPath)) {
  const mainContent = fs.readFileSync(mainJsPath, 'utf8');
  console.log('✅ GlobalShortcutManager in build:', mainContent.includes('GlobalShortcutManager'));
  console.log('✅ globalShortcut import:', mainContent.includes('globalShortcut'));
  console.log('✅ Notification support:', mainContent.includes('Notification'));
  console.log('✅ Shortcut handlers:', mainContent.includes('get-shortcut-config'));
} else {
  console.log('❌ main.js not found for shortcut testing');
}

// Check preload script for shortcut APIs
const preloadJsPath = path.join(__dirname, 'dist', 'preload.js');
if (fs.existsSync(preloadJsPath)) {
  const preloadContent = fs.readFileSync(preloadJsPath, 'utf8');
  console.log('✅ Shortcut APIs in preload:', preloadContent.includes('getShortcutConfig'));
  console.log('✅ Shortcut events:', preloadContent.includes('shortcut-notification'));
} else {
  console.log('❌ preload.js not found for shortcut testing');
}

// Check renderer for ShortcutConfigPanel
const rendererJsPath = path.join(__dirname, 'dist', 'renderer.js');
if (fs.existsSync(rendererJsPath)) {
  const rendererContent = fs.readFileSync(rendererJsPath, 'utf8');
  console.log('✅ ShortcutConfigPanel in renderer:', rendererContent.includes('ShortcutConfigPanel'));
  console.log('✅ Shortcut UI components:', rendererContent.includes('shortcut-config-panel'));
} else {
  console.log('❌ renderer.js not found for UI testing');
}

console.log('\n3️⃣ Package Dependencies Check');
console.log('------------------------------');

// Check package.json for new dependencies
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  console.log('✅ ffmpeg-static dependency:', !!packageJson.dependencies['ffmpeg-static']);
  console.log('✅ ffprobe-static dependency:', !!packageJson.dependencies['ffprobe-static']);
  
  // Check if both binaries are in node_modules
  const ffmpegPath = path.join(__dirname, 'node_modules', 'ffmpeg-static');
  const ffprobePath = path.join(__dirname, 'node_modules', 'ffprobe-static');
  
  console.log('✅ ffmpeg-static in node_modules:', fs.existsSync(ffmpegPath));
  console.log('✅ ffprobe-static in node_modules:', fs.existsSync(ffprobePath));
} else {
  console.log('❌ package.json not found');
}

console.log('\n4️⃣ Build Verification');
console.log('---------------------');

// Check all required files are built
const requiredFiles = [
  'dist/main.js',
  'dist/preload.js', 
  'dist/renderer.js',
  'dist/index.html'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    console.log(`✅ ${file} (${Math.round(stats.size / 1024)}KB)`);
  } else {
    console.log(`❌ ${file} - MISSING`);
  }
});

console.log('\n🧪 Testing Instructions');
console.log('=======================');

console.log('\n📹 Recording & Video Processing Test:');
console.log('1. Run: npm start');
console.log('2. Go to "Record" tab');
console.log('3. Select "🎬 Test Recording (Demo Video)"');
console.log('4. Click "Start Recording" → should create video file');
console.log('5. Click "Stop Recording" → should save to recordings/');
console.log('6. Go to "Process" tab');
console.log('7. Select the recorded video file');
console.log('8. Click "Process Video" → should extract frames without ENOENT error');

console.log('\n🎹 Global Shortcuts Test:');
console.log('1. Run: npm start');
console.log('2. Go to "Shortcuts" tab');
console.log('3. Verify default shortcut is "CommandOrControl+Shift+R"');
console.log('4. Enable global shortcuts toggle');
console.log('5. Minimize or focus another application');
console.log('6. Press Ctrl+Shift+R (or Cmd+Shift+R on Mac)');
console.log('7. Should see notification and recording start/stop');
console.log('8. Test shortcut customization by editing the shortcut');

console.log('\n✅ Expected Results:');
console.log('- Video processing works without "spawn ffprobe ENOENT" errors');
console.log('- Global shortcuts work system-wide when app is not focused');
console.log('- Shortcut conflicts are detected and alternatives offered');
console.log('- UI shows current shortcut configuration and allows editing');
console.log('- System notifications appear when shortcuts are used');

console.log('\n🔧 Troubleshooting:');
console.log('- If ffprobe errors persist: Check console for binary path issues');
console.log('- If shortcuts don\'t work: Check permissions and conflicts');
console.log('- If UI doesn\'t show shortcuts tab: Check renderer build');
console.log('- If notifications don\'t appear: Check system notification permissions');

console.log('\n🎯 Success Criteria:');
console.log('✅ Recording → Video Processing pipeline works end-to-end');
console.log('✅ Global shortcuts control recording from anywhere in system');
console.log('✅ No ENOENT errors during video processing');
console.log('✅ Shortcut configuration UI is functional');
console.log('✅ System notifications work for shortcut feedback');

console.log('\n🚀 Ready to test! Run: npm start');
