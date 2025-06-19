# Development Guide

This guide provides detailed instructions for developing, building, and deploying the Automated Development Recorder application.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

4. **Create distribution package:**
   ```bash
   npm run dist
   ```

## Prerequisites

### Required Software

- **Node.js 18+**: Download from [nodejs.org](https://nodejs.org/)
- **Git**: For version control
- **FFmpeg**: For video processing
  - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
  - Add to system PATH or place in project root

### Development Tools (Recommended)

- **VS Code**: With recommended extensions
- **Windows Terminal**: For better command line experience

## Project Structure

```
pic2tool/
├── src/
│   ├── main/           # Electron main process
│   │   └── main.ts     # Application entry point
│   ├── preload/        # Preload scripts
│   │   └── preload.ts  # IPC bridge
│   ├── renderer/       # React UI
│   │   ├── App.tsx     # Main app component
│   │   ├── components/ # UI components
│   │   └── index.tsx   # Renderer entry point
│   ├── modules/        # Core business logic
│   │   ├── RecordingModule.ts
│   │   ├── VideoProcessingModule.ts
│   │   ├── VisionAnalysisModule.ts
│   │   ├── ActionSequenceModule.ts
│   │   └── CodeGenerationModule.ts
│   ├── shared/         # Shared utilities
│   │   ├── ErrorHandler.ts
│   │   └── SettingsManager.ts
│   └── test/           # Test files
├── assets/             # Application assets
├── scripts/            # Build scripts
├── dist/               # Built application
└── release/            # Distribution packages
```

## Development Workflow

### 1. Setting Up Development Environment

```bash
# Clone the repository
git clone <repository-url>
cd automated-development-recorder

# Install dependencies
npm install

# Verify FFmpeg installation
ffmpeg -version
```

### 2. Running in Development Mode

```bash
# Start development server (hot reload enabled)
npm run dev
```

This command:
- Starts webpack dev server on port 3000
- Launches Electron with development settings
- Enables hot module replacement
- Opens DevTools automatically

### 3. Code Quality

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

### 4. Building

```bash
# Development build
npm run build:dev

# Production build
npm run build

# Clean build artifacts
npm run clean
```

### 5. Distribution

```bash
# Create Windows installer
npm run dist:win

# Create all platform packages
npm run dist
```

## Architecture Overview

### Electron Processes

1. **Main Process** (`src/main/main.ts`)
   - Application lifecycle management
   - Window creation and management
   - IPC handlers
   - File system operations
   - Settings management

2. **Preload Script** (`src/preload/preload.ts`)
   - Secure IPC bridge between main and renderer
   - Exposes safe APIs to renderer process

3. **Renderer Process** (`src/renderer/`)
   - React-based user interface
   - Component-driven architecture
   - State management with React hooks

### Core Modules

1. **RecordingModule**: Screen capture using Electron's desktopCapturer
2. **VideoProcessingModule**: Frame extraction with FFmpeg
3. **VisionAnalysisModule**: AI-powered frame analysis
4. **ActionSequenceModule**: Workflow reconstruction
5. **CodeGenerationModule**: Python code generation

## Configuration

### TypeScript Configuration

The project uses strict TypeScript configuration with:
- Strict mode enabled
- Path mapping for imports
- React JSX support
- ES2020 target

### Webpack Configuration

Three separate configurations:
- Main process (Node.js target)
- Preload script (Electron preload target)
- Renderer process (Web target with React)

### ESLint Configuration

Extends recommended configurations for:
- TypeScript
- React
- React Hooks

## Testing

### Unit Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- VideoProcessingModule.test.ts

# Run tests with coverage
npm test -- --coverage
```

### Integration Tests

Test the interaction between modules:
- Recording → Video Processing
- Video Processing → Vision Analysis
- Vision Analysis → Action Sequence
- Action Sequence → Code Generation

### End-to-End Tests

Test the complete workflow:
1. Start recording
2. Perform actions
3. Stop recording
4. Process video
5. Generate code
6. Verify output

## Debugging

### Main Process

1. Add `--inspect` flag to Electron launch
2. Open Chrome DevTools
3. Connect to Node.js debugger

### Renderer Process

1. Open Electron DevTools (Ctrl+Shift+I)
2. Use React DevTools extension
3. Set breakpoints in source code

### Logging

Application uses `electron-log` for structured logging:
- Logs stored in `%APPDATA%/automated-development-recorder/logs/`
- Different log levels: error, warn, info, debug
- Automatic log rotation

## API Integration

### OpenAI GPT-4V

```typescript
// Example API call structure
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4-vision-preview',
    messages: [/* ... */],
    max_tokens: 1000
  })
});
```

### Google Vision API

```typescript
// Example API call structure
const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    requests: [/* ... */]
  })
});
```

## Performance Optimization

### Video Processing

- Use frame rate limiting (default: 2 fps)
- Skip similar frames (configurable threshold)
- Process in chunks to manage memory
- Use efficient image comparison algorithms

### Memory Management

- Clean up video streams after recording
- Dispose of image objects after processing
- Implement garbage collection hints
- Monitor memory usage in development

### API Rate Limiting

- Implement exponential backoff
- Rotate between multiple API keys
- Cache analysis results
- Batch requests when possible

## Security Considerations

### API Key Storage

- Use Electron's `safeStorage` for encryption
- Never log API keys
- Validate key format before storage
- Provide key rotation mechanism

### File System Access

- Validate all file paths
- Use path.resolve() to prevent directory traversal
- Check file permissions before operations
- Sanitize user input

### Network Security

- Use HTTPS for all API calls
- Validate SSL certificates
- Implement request timeouts
- Handle network errors gracefully

## Troubleshooting

### Common Issues

1. **FFmpeg not found**
   - Ensure FFmpeg is in PATH
   - Check FFmpeg installation with `ffmpeg -version`
   - Place FFmpeg executable in project root as fallback

2. **Recording permissions**
   - Check screen recording permissions on macOS
   - Verify desktop capture permissions on Windows
   - Test with different source types

3. **API errors**
   - Verify API key validity
   - Check API quotas and limits
   - Monitor network connectivity
   - Review API documentation for changes

4. **Build errors**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Review webpack configuration

### Debug Mode

Enable debug mode by setting environment variable:
```bash
DEBUG=* npm run dev
```

This enables:
- Verbose logging
- Extended error messages
- Performance metrics
- Network request logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Use meaningful variable names

### Commit Messages

Follow conventional commit format:
```
type(scope): description

feat(recording): add support for multiple monitors
fix(vision): handle API rate limiting
docs(readme): update installation instructions
```

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Run full test suite
4. Create production build
5. Test distribution package
6. Create GitHub release
7. Upload distribution files

## Support

For development questions:
1. Check this documentation
2. Review existing issues
3. Create new issue with detailed description
4. Include logs and error messages
