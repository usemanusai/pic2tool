# 🎬 Recording Functionality Guide

## 🚀 Quick Start

### Testing the Recording System
1. **Start the application**: `npm start`
2. **Select test source**: Choose "🎬 Test Recording (Demo Video)" from the dropdown
3. **Start recording**: Click the "Start Recording" button
4. **Wait**: Let it record for a few seconds
5. **Stop recording**: Click "Stop Recording"
6. **Verify**: Check the `recordings/` directory for the generated video file

## 🔧 How It Works

### Current Implementation
The recording system uses a **test video approach** for initial development and testing:

1. **FFmpeg Integration**: Uses `ffmpeg-static` to generate test videos
2. **File Management**: Automatically creates `recordings/` directory
3. **Naming Convention**: Files named as `recording-YYYY-MM-DDTHH-mm-ss.mp4`
4. **Quality Settings**: Supports low/medium/high quality presets
5. **Error Handling**: Comprehensive logging and error reporting

### Architecture
```
RecordingModule
├── startRecording() - Initiates recording process
├── stopRecording() - Stops and finalizes recording
├── createTestVideo() - Generates test video using FFmpeg
├── verifyRecordingFile() - Validates output file
└── cleanup() - Cleans up resources
```

## 📁 File Structure

### Generated Files
```
recordings/
├── recording-2025-06-20T20-07-25.mp4  # Test video (10 seconds)
├── recording-2025-06-20T20-08-15.mp4  # Another recording
└── frames/                             # Temporary frames (if used)
```

### File Properties
- **Format**: MP4 (H.264 codec)
- **Resolution**: 1920x1080 (configurable)
- **Frame Rate**: 30 FPS (configurable)
- **Duration**: 10 seconds (test video)
- **Size**: ~500KB - 2MB depending on quality

## 🎯 Quality Settings

### Low Quality
- Resolution: 1280x720
- Frame Rate: 15 FPS
- Bitrate: 1000k
- Use Case: Quick tests, low storage

### Medium Quality (Default)
- Resolution: 1920x1080
- Frame Rate: 30 FPS
- Bitrate: 2500k
- Use Case: Standard recording

### High Quality
- Resolution: 1920x1080
- Frame Rate: 60 FPS
- Bitrate: 5000k
- Use Case: Detailed analysis

## 🔍 Debugging

### Console Logs to Watch For
```
🎬 Starting recording with config: {...}
📁 Output path: /path/to/recording.mp4
📁 Created output directory: /path/to/recordings
🎬 Creating test video file
🔧 Creating test video with FFmpeg: [args]
✅ Test video creation started
📹 FFmpeg process exited with code: 0
📊 Recording file stats: 1234567 bytes, created: ...
✅ Recording stopped successfully
```

### Common Issues and Solutions

#### ❌ "FFmpeg binary not found"
- **Cause**: ffmpeg-static package not installed
- **Solution**: Run `npm install` to ensure all dependencies

#### ❌ "Recording file not found"
- **Cause**: FFmpeg process failed or was interrupted
- **Solution**: Check FFmpeg logs in console, ensure write permissions

#### ❌ "Recording file is empty"
- **Cause**: FFmpeg process terminated prematurely
- **Solution**: Check available disk space, verify FFmpeg arguments

#### ❌ "No recording in progress"
- **Cause**: Trying to stop recording when none is active
- **Solution**: Ensure recording was started successfully first

## 🛠️ Development Roadmap

### Phase 1: Test Video (✅ Current)
- [x] FFmpeg integration
- [x] Test video generation
- [x] File management
- [x] Error handling
- [x] Quality settings

### Phase 2: Real Screen Capture (🚧 Next)
- [ ] Implement actual screen recording
- [ ] Desktop capturer integration
- [ ] Window/screen selection
- [ ] Real-time preview

### Phase 3: Advanced Features (📋 Future)
- [ ] Audio recording
- [ ] Pause/resume functionality
- [ ] Recording duration limits
- [ ] Multiple monitor support
- [ ] Webcam overlay

## 🧪 Testing Checklist

### Basic Functionality
- [ ] Application starts without errors
- [ ] Test recording source appears in dropdown
- [ ] Recording starts successfully
- [ ] UI shows recording status
- [ ] Recording stops successfully
- [ ] Video file is created
- [ ] File size > 0 bytes
- [ ] File can be played

### Error Handling
- [ ] Graceful handling of FFmpeg errors
- [ ] Proper cleanup on failure
- [ ] User-friendly error messages
- [ ] Recovery from interrupted recordings

### File Management
- [ ] Recordings directory auto-creation
- [ ] Proper file naming
- [ ] No file conflicts
- [ ] Cleanup of temporary files

## 📊 Performance Metrics

### Expected Performance
- **Startup Time**: < 2 seconds
- **Recording Start**: < 1 second
- **Recording Stop**: < 3 seconds
- **File Generation**: < 5 seconds
- **Memory Usage**: < 100MB during recording

### Monitoring
- Check console logs for timing information
- Monitor file system for proper cleanup
- Verify FFmpeg process termination
- Track memory usage during long recordings

## 🔗 Integration Points

### AI Analysis Pipeline
1. **Recording** → Video file saved to `recordings/`
2. **Processing** → VideoProcessingModule extracts frames
3. **Analysis** → VisionAnalysisModule analyzes frames
4. **Generation** → CodeGenerationModule creates code

### User Interface
- **RecordingPanel**: Start/stop controls
- **StatusBar**: Recording progress and status
- **ConfigPanel**: Quality and output settings
- **MainContent**: File management and results

## 📝 API Reference

### RecordingConfig Interface
```typescript
interface RecordingConfig {
  sourceId: string;        // Source identifier
  outputPath?: string;     // Optional custom output path
  quality?: 'low' | 'medium' | 'high';
  frameRate?: number;      // Custom frame rate
  duration?: number;       // Max duration in seconds
}
```

### RecordingResult Interface
```typescript
interface RecordingResult {
  success: boolean;        // Operation success status
  videoPath?: string;      // Path to generated video
  duration?: number;       // Recording duration in ms
  error?: string;          // Error message if failed
  fileSize?: number;       // File size in bytes
}
```

This recording system provides a solid foundation for the pic2tool application's screen recording capabilities!
