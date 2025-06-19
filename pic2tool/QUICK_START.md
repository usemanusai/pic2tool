# Quick Start Guide

Get the Automated Development Recorder up and running in minutes with our automated setup system.

## 🚀 One-Command Setup

```bash
# Clone the repository
git clone https://github.com/usemanusai/pic2tool.git
cd pic2tool

# Run the automated setup
npm run setup
```

That's it! The setup script will guide you through everything.

## 📋 What Happens During Setup

### 1. Environment Check ✅
- Validates Node.js 18+ is installed
- Checks for Windows 11 (recommended)
- Verifies FFmpeg availability
- Confirms system requirements (8GB+ RAM)

### 2. Dependency Installation 📦
- Installs all npm packages automatically
- Runs security audit
- Verifies core dependencies (Electron, React, TypeScript)

### 3. API Configuration 🔑
- **Interactive prompts** for API keys:
  - OpenAI GPT-4V API key (for advanced vision analysis)
  - Google Vision API key (alternative option)
- **Real API testing** to verify keys work
- **Secure storage** with encryption

### 4. Project Validation 📁
- Checks all required files and directories
- Validates TypeScript compilation
- Tests build system (Webpack, ESLint, Prettier)

### 5. Ready to Go! 🎉
- Generates detailed setup report
- Provides troubleshooting guidance if needed
- Shows next steps for development

## ⚡ Quick Validation

Want to check your environment without full setup?

```bash
npm run validate
```

This runs a fast check of your system requirements.

## 🔧 Manual Steps (If Needed)

### Install Prerequisites

1. **Node.js 18+**: Download from [nodejs.org](https://nodejs.org/)
2. **FFmpeg**: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
   - Add to PATH or place `ffmpeg.exe` in project root

### Get API Keys (Optional)

1. **OpenAI API Key** (Recommended):
   - Sign up at [platform.openai.com](https://platform.openai.com/)
   - Requires GPT-4V access for vision analysis

2. **Google Vision API Key** (Alternative):
   - Create project at [console.cloud.google.com](https://console.cloud.google.com/)
   - Enable Vision API and create credentials

## 🎯 After Setup

Once setup completes successfully:

### Start Development
```bash
npm run dev
```
Opens the application in development mode with hot reload.

### Build for Production
```bash
npm run build
```
Creates optimized production build.

### Create Distribution Package
```bash
npm run dist
```
Generates Windows installer package.

### Run Tests
```bash
npm test
```
Executes the test suite.

## 🔍 Troubleshooting

### Setup Failed?

1. **Check the logs**: Review `setup-log.txt` for detailed error information
2. **Read the report**: Check `setup-report.json` for structured results
3. **Follow guidance**: The setup script provides specific troubleshooting steps

### Common Issues

#### "Node.js version too old"
```bash
# Download and install Node.js 18+ from nodejs.org
node --version  # Should show 18.x or higher
```

#### "FFmpeg not found"
```bash
# Option 1: Add to PATH (recommended)
# Download from ffmpeg.org and add bin directory to system PATH

# Option 2: Local installation
# Place ffmpeg.exe in the project root directory
```

#### "Dependency installation failed"
```bash
# Clear cache and retry
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### "TypeScript compilation errors"
```bash
# Check specific errors
npx tsc --noEmit

# Fix the reported errors in source files
# Re-run setup
npm run setup
```

### Still Having Issues?

1. **Run validation**: `npm run validate` for quick diagnosis
2. **Check documentation**: Review [SETUP.md](SETUP.md) for detailed guidance
3. **Create issue**: Report problems on GitHub with log files

## 📚 Documentation

- **[README.md](README.md)**: Complete project documentation
- **[SETUP.md](SETUP.md)**: Detailed setup and troubleshooting guide
- **[DEVELOPMENT.md](DEVELOPMENT.md)**: Development workflow and architecture

## 🎉 Success!

When setup completes successfully, you'll see:

```
🎉 SETUP COMPLETED SUCCESSFULLY!
All checks passed. Your development environment is ready!

🚀 NEXT STEPS
Your development environment is ready! You can now:
  🔧 Start development: npm run dev
  🏗️ Build for production: npm run build
  📦 Create distribution: npm run dist
  🧪 Run tests: npm test
```

You're now ready to start developing with the Automated Development Recorder!

## 🆘 Need Help?

- **Quick Check**: `npm run validate`
- **Full Setup**: `npm run setup`
- **Documentation**: Check README.md and SETUP.md
- **Issues**: Create GitHub issue with setup logs

---

**Happy coding! 🚀**
