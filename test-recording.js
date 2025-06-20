#!/usr/bin/env node

/**
 * Test script to verify recording functionality
 */

const fs = require('fs');
const path = require('path');

console.log('🎬 Recording Functionality Test');
console.log('===============================\n');

// Check if recordings directory exists
const recordingsDir = path.join(__dirname, 'recordings');
console.log('📁 Checking recordings directory...');
console.log(`Path: ${recordingsDir}`);

if (!fs.existsSync(recordingsDir)) {
  console.log('📁 Creating recordings directory...');
  fs.mkdirSync(recordingsDir, { recursive: true });
  console.log('✅ Recordings directory created');
} else {
  console.log('✅ Recordings directory exists');
}

// Check FFmpeg availability
console.log('\n🎥 Checking FFmpeg availability...');
try {
  const ffmpegStatic = require('ffmpeg-static');
  if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
    console.log('✅ FFmpeg binary found at:', ffmpegStatic);
  } else {
    console.log('❌ FFmpeg binary not found');
  }
} catch (error) {
  console.log('❌ FFmpeg-static package not available:', error.message);
}

// Check RecordingModule build
console.log('\n🔍 Checking RecordingModule build...');
const mainJsPath = path.join(__dirname, 'dist', 'main.js');
if (fs.existsSync(mainJsPath)) {
  const mainContent = fs.readFileSync(mainJsPath, 'utf8');
  console.log('Contains RecordingModule:', mainContent.includes('RecordingModule') ? '✅' : '❌');
  console.log('Contains startRecording:', mainContent.includes('startRecording') ? '✅' : '❌');
  console.log('Contains stopRecording:', mainContent.includes('stopRecording') ? '✅' : '❌');
  console.log('Contains ffmpeg-static:', mainContent.includes('ffmpeg-static') ? '✅' : '❌');
} else {
  console.log('❌ main.js not found - run npm run build');
}

// List existing recordings
console.log('\n📹 Existing recordings:');
if (fs.existsSync(recordingsDir)) {
  const files = fs.readdirSync(recordingsDir);
  const videoFiles = files.filter(file => 
    file.endsWith('.mp4') || 
    file.endsWith('.webm') || 
    file.endsWith('.avi')
  );
  
  if (videoFiles.length === 0) {
    console.log('📭 No recordings found');
  } else {
    videoFiles.forEach(file => {
      const filePath = path.join(recordingsDir, file);
      const stats = fs.statSync(filePath);
      console.log(`📹 ${file} (${Math.round(stats.size / 1024)}KB, ${stats.birthtime.toLocaleString()})`);
    });
  }
} else {
  console.log('📭 Recordings directory not found');
}

console.log('\n🚀 Recording Test Instructions:');
console.log('1. Run: npm start');
console.log('2. Select "🎬 Test Recording (Demo Video)" from the sources dropdown');
console.log('3. Click "Start Recording"');
console.log('4. Wait a few seconds');
console.log('5. Click "Stop Recording"');
console.log('6. Check the recordings/ directory for the generated video file');
console.log('7. The test video should be approximately 10 seconds long');

console.log('\n📊 Expected Results:');
console.log('✅ Recording starts without errors');
console.log('✅ Video file is created in recordings/ directory');
console.log('✅ File size is greater than 0 bytes');
console.log('✅ File can be opened and played');
console.log('✅ Recording status updates correctly in UI');

console.log('\n🔧 Troubleshooting:');
console.log('- If no video file is created: Check console logs for FFmpeg errors');
console.log('- If file is 0 bytes: FFmpeg process may have failed');
console.log('- If recording never stops: Check FFmpeg process termination');
console.log('- If UI shows errors: Check electronAPI availability');

console.log('\n📝 Next Steps After Testing:');
console.log('1. Verify test recording works');
console.log('2. Implement real screen capture (replace test video)');
console.log('3. Add audio recording support');
console.log('4. Implement recording quality settings');
console.log('5. Add recording duration limits');
console.log('6. Implement pause/resume functionality');
