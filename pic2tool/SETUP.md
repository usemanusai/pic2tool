# Setup and Validation Guide

This document provides comprehensive instructions for setting up and validating the Automated Development Recorder project using the automated setup script.

## Quick Start

Run the automated setup script to validate your environment and configure the project:

```bash
npm run setup
```

The setup script will guide you through the entire process and provide detailed feedback on each step.

## What the Setup Script Does

### 🔍 Environment Validation

The script automatically checks:

- **Node.js Version**: Ensures you have Node.js 18.x or higher
- **Package Manager**: Verifies npm availability and version
- **Operating System**: Checks for Windows 11 compatibility (recommended)
- **FFmpeg Installation**: Validates FFmpeg is available in PATH or project directory
- **System Requirements**: Verifies minimum 8GB RAM and adequate disk space

### 📦 Dependency Management

The script handles:

- **Package Installation**: Installs all npm dependencies from package.json
- **Security Audit**: Runs npm audit to check for vulnerabilities
- **Core Dependencies**: Verifies Electron, React, TypeScript, and other essential packages
- **Global Dependencies**: Checks for optional global packages like electron-builder

### 🔑 API Configuration

Interactive setup for:

- **OpenAI API Key**: Prompts for and validates OpenAI GPT-4V API key
- **Google Vision API Key**: Prompts for and validates Google Cloud Vision API key
- **API Testing**: Makes test calls to verify API keys work correctly
- **Secure Storage**: Saves API keys in encrypted local configuration

### 📁 Project Structure Validation

Verifies:

- **Required Directories**: Checks all necessary folders exist (src/, assets/, scripts/, etc.)
- **Required Files**: Validates all TypeScript source files are present
- **TypeScript Compilation**: Ensures all code compiles without errors

### 🔨 Build System Verification

Tests:

- **ESLint**: Runs code quality checks
- **Prettier**: Validates code formatting consistency
- **Webpack Build**: Tests the complete build process
- **Electron Packaging**: Verifies distribution configuration

## Prerequisites

Before running the setup script, ensure you have:

### Required Software

1. **Node.js 18+**
   ```bash
   # Download from https://nodejs.org/
   node --version  # Should be 18.x or higher
   ```

2. **Git** (for cloning the repository)
   ```bash
   git --version
   ```

3. **FFmpeg** (for video processing)
   - Download from https://ffmpeg.org/download.html
   - Add to system PATH or place `ffmpeg.exe` in project root

### API Keys (Optional but Recommended)

- **OpenAI API Key**: For GPT-4V vision analysis
  - Sign up at https://platform.openai.com/
  - Requires GPT-4V API access
  
- **Google Vision API Key**: Alternative vision analysis
  - Create project at https://console.cloud.google.com/
  - Enable Vision API and create credentials

## Running the Setup

### 1. Clone and Navigate

```bash
git clone https://github.com/your-username/automated-development-recorder.git
cd automated-development-recorder
```

### 2. Run Setup Script

```bash
npm run setup
```

### 3. Follow Interactive Prompts

The script will:
- Check your environment automatically
- Install dependencies
- Prompt for API keys (you can skip if not ready)
- Validate project structure
- Test build system

### 4. Review Results

The script provides:
- ✅ Success indicators for passed checks
- ⚠️ Warnings for non-critical issues
- ❌ Errors for problems that must be fixed
- 📄 Detailed report saved to `setup-report.json`

## Setup Outputs

### Generated Files

- **`setup-log.txt`**: Detailed log of all setup operations
- **`setup-report.json`**: Structured report with validation results
- **`api-config.json`**: Encrypted API key configuration (if configured)

### Build Artifacts

If build verification succeeds:
- **`dist/main.js`**: Electron main process
- **`dist/preload.js`**: Preload script
- **`dist/renderer.js`**: React UI bundle
- **`dist/index.html`**: Application HTML

## Troubleshooting

### Common Issues and Solutions

#### Node.js Version Too Old
```bash
# Update Node.js
# Download latest LTS from https://nodejs.org/
node --version  # Verify update
```

#### FFmpeg Not Found
```bash
# Option 1: Add to PATH
# Download from https://ffmpeg.org/download.html
# Add bin directory to system PATH

# Option 2: Local installation
# Place ffmpeg.exe in project root directory
```

#### Dependency Installation Failed
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### TypeScript Compilation Errors
```bash
# Check specific errors
npx tsc --noEmit

# Fix syntax and type errors in source files
# Re-run setup after fixes
npm run setup
```

#### API Key Validation Failed
- Verify API key is correct and active
- Check API quotas and billing status
- Ensure network connectivity
- Try again with a different key

### Getting Help

1. **Check Setup Log**: Review `setup-log.txt` for detailed error information
2. **Review Report**: Check `setup-report.json` for structured validation results
3. **Run Individual Commands**: Test specific steps manually
4. **Create Issue**: Report problems with log files attached

## Manual Setup (Alternative)

If the automated setup fails, you can set up manually:

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure TypeScript
```bash
npx tsc --noEmit  # Check compilation
```

### 3. Test Build
```bash
npm run build:webpack
```

### 4. Configure APIs
Create `api-config.json`:
```json
{
  "openai": {
    "apiKey": "your-openai-key",
    "enabled": true
  },
  "google": {
    "apiKey": "your-google-key", 
    "enabled": true
  }
}
```

### 5. Verify Setup
```bash
npm run lint
npm run format
npm test
```

## Next Steps After Setup

Once setup completes successfully:

### Development
```bash
npm run dev          # Start development server
```

### Building
```bash
npm run build        # Production build
npm start           # Run built application
```

### Distribution
```bash
npm run dist         # Create installer package
```

### Testing
```bash
npm test            # Run test suite
npm run test:watch  # Watch mode
```

## Validation Checklist

Use this checklist to verify your setup:

- [ ] Node.js 18+ installed and working
- [ ] npm dependencies installed successfully
- [ ] FFmpeg available (in PATH or locally)
- [ ] TypeScript compiles without errors
- [ ] Webpack build completes successfully
- [ ] ESLint passes without errors
- [ ] At least one API key configured and validated
- [ ] All required files and directories present
- [ ] Setup script reports success

## Support

For setup issues:

1. **Documentation**: Review this guide and README.md
2. **Logs**: Check setup-log.txt and setup-report.json
3. **Issues**: Create GitHub issue with setup logs
4. **Community**: Join project discussions

---

**The automated setup script handles most configuration automatically. Run `npm run setup` to get started!**
