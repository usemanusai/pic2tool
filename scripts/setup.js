#!/usr/bin/env node

/**
 * Comprehensive Setup and Validation Script for pic2tool
 * Handles environment validation, dependency management, API configuration, and build verification
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const readline = require('readline');
const crypto = require('crypto');
const os = require('os');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

class SetupValidator {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.logFile = path.join(this.projectRoot, 'setup-log.txt');
    this.configFile = path.join(this.projectRoot, 'setup-config.json');
    this.results = {
      environment: {},
      dependencies: {},
      apiConfig: {},
      projectStructure: {},
      buildSystem: {},
      overall: { success: false, errors: [], warnings: [] }
    };
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  // Utility methods
  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colorMap = {
      info: colors.cyan,
      success: colors.green,
      warning: colors.yellow,
      error: colors.red,
      header: colors.magenta
    };
    
    const coloredMessage = `${colorMap[type] || colors.reset}${message}${colors.reset}`;
    console.log(coloredMessage);
    
    // Write to log file
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;
    fs.appendFileSync(this.logFile, logEntry);
  }

  async question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(`${colors.cyan}${prompt}${colors.reset}`, resolve);
    });
  }

  execCommand(command, options = {}) {
    try {
      const result = execSync(command, { 
        encoding: 'utf8', 
        cwd: this.projectRoot,
        ...options 
      });
      return { success: true, output: result.trim() };
    } catch (error) {
      return { success: false, error: error.message, output: error.stdout || '' };
    }
  }

  checkVersion(current, required) {
    const currentParts = current.split('.').map(Number);
    const requiredParts = required.split('.').map(Number);

    for (let i = 0; i < Math.max(currentParts.length, requiredParts.length); i++) {
      const currentPart = currentParts[i] || 0;
      const requiredPart = requiredParts[i] || 0;

      if (currentPart > requiredPart) return true;
      if (currentPart < requiredPart) return false;
    }
    return true;
  }

  async downloadAndInstallFFmpeg() {
    try {
      const https = require('https');
      const { createWriteStream } = require('fs');
      const { pipeline } = require('stream');
      const { promisify } = require('util');
      const pipelineAsync = promisify(pipeline);

      // Create bin directory if it doesn't exist
      const binDir = path.join(this.projectRoot, 'bin');
      if (!fs.existsSync(binDir)) {
        fs.mkdirSync(binDir, { recursive: true });
      }

      // FFmpeg download URLs for Windows
      const ffmpegUrl = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';
      const zipPath = path.join(binDir, 'ffmpeg.zip');
      const ffmpegExePath = path.join(binDir, 'ffmpeg.exe');

      this.log('📥 Downloading FFmpeg from GitHub releases...', 'info');

      // Download FFmpeg zip file
      await new Promise((resolve, reject) => {
        https.get(ffmpegUrl, (response) => {
          if (response.statusCode === 302 || response.statusCode === 301) {
            // Follow redirect
            https.get(response.headers.location, (redirectResponse) => {
              if (redirectResponse.statusCode === 200) {
                const fileStream = createWriteStream(zipPath);
                redirectResponse.pipe(fileStream);
                fileStream.on('finish', () => {
                  fileStream.close();
                  resolve();
                });
                fileStream.on('error', reject);
              } else {
                reject(new Error(`HTTP ${redirectResponse.statusCode}`));
              }
            }).on('error', reject);
          } else if (response.statusCode === 200) {
            const fileStream = createWriteStream(zipPath);
            response.pipe(fileStream);
            fileStream.on('finish', () => {
              fileStream.close();
              resolve();
            });
            fileStream.on('error', reject);
          } else {
            reject(new Error(`HTTP ${response.statusCode}`));
          }
        }).on('error', reject);
      });

      this.log('📦 Extracting FFmpeg...', 'info');

      // Extract ffmpeg.exe from the zip file
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(zipPath);
      const zipEntries = zip.getEntries();

      // Find ffmpeg.exe in the zip
      let ffmpegEntry = null;
      for (const entry of zipEntries) {
        if (entry.entryName.endsWith('ffmpeg.exe')) {
          ffmpegEntry = entry;
          break;
        }
      }

      if (ffmpegEntry) {
        // Extract ffmpeg.exe to bin directory
        fs.writeFileSync(ffmpegExePath, ffmpegEntry.getData());

        // Make executable (on Unix-like systems)
        if (process.platform !== 'win32') {
          fs.chmodSync(ffmpegExePath, '755');
        }

        // Clean up zip file
        fs.unlinkSync(zipPath);

        // Verify installation
        const testResult = this.execCommand(`"${ffmpegExePath}" -version`);
        if (testResult.success) {
          this.log('✅ FFmpeg successfully installed and verified', 'success');
          return ffmpegExePath;
        } else {
          throw new Error('FFmpeg installation verification failed');
        }
      } else {
        throw new Error('ffmpeg.exe not found in downloaded archive');
      }

    } catch (error) {
      this.log(`❌ Failed to download FFmpeg: ${error.message}`, 'error');
      this.log('💡 Fallback options:', 'info');
      this.log('   1. Download manually from https://ffmpeg.org/download.html', 'info');
      this.log('   2. Place ffmpeg.exe in the project root directory', 'info');
      this.log('   3. Add FFmpeg to your system PATH', 'info');
      return null;
    }
  }

  async validateEnvironment() {
    this.log('\n🔍 ENVIRONMENT VALIDATION', 'header');
    this.log('=' .repeat(50), 'header');

    // Check Node.js version
    this.log('Checking Node.js version...');
    const nodeResult = this.execCommand('node --version');
    if (nodeResult.success) {
      const nodeVersion = nodeResult.output.replace('v', '');
      const isValidNode = this.checkVersion(nodeVersion, '18.0.0');
      
      if (isValidNode) {
        this.log(`✅ Node.js ${nodeVersion} (meets minimum requirement 18.x)`, 'success');
        this.results.environment.node = { version: nodeVersion, valid: true };
      } else {
        this.log(`❌ Node.js ${nodeVersion} is below minimum requirement (18.x)`, 'error');
        this.results.environment.node = { version: nodeVersion, valid: false };
        this.results.overall.errors.push('Node.js version too old');
      }
    } else {
      this.log('❌ Node.js not found', 'error');
      this.results.environment.node = { valid: false };
      this.results.overall.errors.push('Node.js not installed');
    }

    // Check npm
    this.log('Checking npm availability...');
    const npmResult = this.execCommand('npm --version');
    if (npmResult.success) {
      this.log(`✅ npm ${npmResult.output}`, 'success');
      this.results.environment.npm = { version: npmResult.output, valid: true };
    } else {
      this.log('❌ npm not found', 'error');
      this.results.environment.npm = { valid: false };
      this.results.overall.errors.push('npm not available');
    }

    // Check operating system
    this.log('Checking operating system...');
    const platform = os.platform();
    const release = os.release();
    
    if (platform === 'win32') {
      // Check for Windows 11 (build 22000+)
      const buildNumber = parseInt(release.split('.')[2] || '0');
      const isWin11 = buildNumber >= 22000;
      
      if (isWin11) {
        this.log(`✅ Windows 11 detected (build ${buildNumber})`, 'success');
        this.results.environment.os = { platform, release, valid: true, isWin11: true };
      } else {
        this.log(`⚠️ Windows ${release} detected (Windows 11 recommended)`, 'warning');
        this.results.environment.os = { platform, release, valid: true, isWin11: false };
        this.results.overall.warnings.push('Windows 11 recommended for optimal performance');
      }
    } else {
      this.log(`⚠️ ${platform} detected (Windows 11 recommended)`, 'warning');
      this.results.environment.os = { platform, release, valid: true, isWin11: false };
      this.results.overall.warnings.push('Application optimized for Windows 11');
    }

    // Check FFmpeg
    this.log('Checking FFmpeg installation...');
    const ffmpegResult = this.execCommand('ffmpeg -version');
    if (ffmpegResult.success) {
      const versionMatch = ffmpegResult.output.match(/ffmpeg version ([^\s]+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';
      this.log(`✅ FFmpeg ${version} found in PATH`, 'success');
      this.results.environment.ffmpeg = { version, valid: true, inPath: true };
    } else {
      // Check for local FFmpeg
      const localFFmpegPaths = [
        path.join(this.projectRoot, 'ffmpeg.exe'),
        path.join(this.projectRoot, 'ffmpeg', 'ffmpeg.exe'),
        path.join(this.projectRoot, 'bin', 'ffmpeg.exe')
      ];

      let localFFmpegFound = false;
      for (const ffmpegPath of localFFmpegPaths) {
        if (fs.existsSync(ffmpegPath)) {
          this.log(`✅ FFmpeg found locally at ${ffmpegPath}`, 'success');
          this.results.environment.ffmpeg = { valid: true, inPath: false, localPath: ffmpegPath };
          localFFmpegFound = true;
          break;
        }
      }

      if (!localFFmpegFound) {
        this.log('❌ FFmpeg not found in PATH or project directory', 'error');
        this.log('🔄 Attempting to download and install FFmpeg automatically...', 'info');

        const ffmpegInstalled = await this.downloadAndInstallFFmpeg();
        if (ffmpegInstalled) {
          this.log('✅ FFmpeg successfully downloaded and installed', 'success');
          this.results.environment.ffmpeg = { valid: true, inPath: false, localPath: ffmpegInstalled, autoInstalled: true };
        } else {
          this.log('❌ Failed to automatically install FFmpeg', 'error');
          this.log('   Please install FFmpeg manually or place ffmpeg.exe in the project root', 'error');
          this.results.environment.ffmpeg = { valid: false };
          this.results.overall.errors.push('FFmpeg not found');
        }
      }
    }

    // Check system requirements
    this.log('Checking system requirements...');
    const totalMemory = Math.round(os.totalmem() / (1024 * 1024 * 1024)); // GB
    const freeMemory = Math.round(os.freemem() / (1024 * 1024 * 1024)); // GB
    
    if (totalMemory >= 8) {
      this.log(`✅ System memory: ${totalMemory}GB (meets 8GB minimum)`, 'success');
      this.results.environment.memory = { total: totalMemory, valid: true };
    } else {
      this.log(`⚠️ System memory: ${totalMemory}GB (8GB recommended)`, 'warning');
      this.results.environment.memory = { total: totalMemory, valid: false };
      this.results.overall.warnings.push('Low system memory may affect performance');
    }

    // Check disk space
    try {
      const stats = fs.statSync(this.projectRoot);
      this.log(`✅ Project directory accessible`, 'success');
      this.results.environment.diskSpace = { valid: true };
    } catch (error) {
      this.log(`❌ Project directory access error: ${error.message}`, 'error');
      this.results.environment.diskSpace = { valid: false };
      this.results.overall.errors.push('Project directory access issues');
    }
  }

  async manageDependencies() {
    this.log('\n📦 DEPENDENCY MANAGEMENT', 'header');
    this.log('=' .repeat(50), 'header');

    // Check if package.json exists
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      this.log('❌ package.json not found', 'error');
      this.results.dependencies.packageJson = { valid: false };
      this.results.overall.errors.push('package.json missing');
      return;
    }

    this.log('✅ package.json found', 'success');
    this.results.dependencies.packageJson = { valid: true };

    // Install dependencies
    this.log('Installing npm dependencies...');
    const installResult = this.execCommand('npm install', { stdio: 'pipe' });
    if (installResult.success) {
      this.log('✅ Dependencies installed successfully', 'success');
      this.results.dependencies.install = { success: true };
    } else {
      this.log(`❌ Dependency installation failed: ${installResult.error}`, 'error');
      this.results.dependencies.install = { success: false, error: installResult.error };
      this.results.overall.errors.push('Dependency installation failed');
    }

    // Check for security vulnerabilities
    this.log('Running security audit...');
    const auditResult = this.execCommand('npm audit --audit-level=moderate');
    if (auditResult.success) {
      this.log('✅ No security vulnerabilities found', 'success');
      this.results.dependencies.security = { vulnerabilities: 0 };
    } else {
      const vulnerabilityCount = (auditResult.output.match(/vulnerabilities/g) || []).length;
      if (vulnerabilityCount > 0) {
        this.log(`⚠️ ${vulnerabilityCount} security vulnerabilities found`, 'warning');
        this.log('   Run "npm audit fix" to resolve automatically fixable issues', 'warning');
        this.results.dependencies.security = { vulnerabilities: vulnerabilityCount };
        this.results.overall.warnings.push('Security vulnerabilities detected');
      } else {
        this.log('✅ Security audit completed', 'success');
        this.results.dependencies.security = { vulnerabilities: 0 };
      }
    }

    // Verify core dependencies
    this.log('Verifying core dependencies...');
    const coreDeps = ['electron', 'react', 'react-dom', 'typescript', 'webpack'];
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    for (const dep of coreDeps) {
      if (allDeps[dep]) {
        this.log(`✅ ${dep}: ${allDeps[dep]}`, 'success');
        this.results.dependencies[dep] = { version: allDeps[dep], present: true };
      } else {
        this.log(`❌ ${dep}: missing`, 'error');
        this.results.dependencies[dep] = { present: false };
        this.results.overall.errors.push(`Missing core dependency: ${dep}`);
      }
    }

    // Check for global dependencies
    this.log('Checking global dependencies...');
    const globalDeps = ['electron-builder'];
    for (const dep of globalDeps) {
      const globalCheck = this.execCommand(`npm list -g ${dep} --depth=0`);
      if (globalCheck.success && !globalCheck.output.includes('(empty)')) {
        this.log(`✅ Global ${dep} found`, 'success');
        this.results.dependencies[`global-${dep}`] = { present: true };
      } else {
        this.log(`⚠️ Global ${dep} not found (will use local version)`, 'warning');
        this.results.dependencies[`global-${dep}`] = { present: false };
      }
    }
  }

  async configureAPIs() {
    this.log('\n🔑 API CONFIGURATION SETUP', 'header');
    this.log('=' .repeat(50), 'header');

    const configPath = path.join(this.projectRoot, 'api-config.json');
    let config = {};

    // Load existing config if available
    if (fs.existsSync(configPath)) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        this.log('✅ Existing API configuration found', 'success');
      } catch (error) {
        this.log('⚠️ Invalid existing config, creating new one', 'warning');
      }
    }

    // OpenAI API Key Configuration
    this.log('\n🤖 OpenAI API Configuration:');
    if (config.openai && config.openai.apiKey) {
      const useExisting = await this.question('Existing OpenAI API key found. Use existing? (y/n): ');
      if (useExisting.toLowerCase() !== 'y') {
        config.openai = {};
      }
    }

    if (!config.openai || !config.openai.apiKey) {
      const apiKey = await this.question('Enter your OpenAI API key (or press Enter to skip): ');
      if (apiKey.trim()) {
        config.openai = { apiKey: apiKey.trim(), enabled: true };

        // Test OpenAI API
        this.log('Testing OpenAI API connection...');
        const testResult = await this.testOpenAIAPI(apiKey.trim());
        if (testResult.success) {
          this.log('✅ OpenAI API key validated successfully', 'success');
          this.results.apiConfig.openai = { configured: true, valid: true };
        } else {
          this.log(`❌ OpenAI API validation failed: ${testResult.error}`, 'error');
          this.results.apiConfig.openai = { configured: true, valid: false };
          this.results.overall.warnings.push('OpenAI API key validation failed');
        }
      } else {
        this.log('⚠️ OpenAI API key skipped', 'warning');
        this.results.apiConfig.openai = { configured: false };
      }
    } else {
      this.log('✅ Using existing OpenAI configuration', 'success');
      this.results.apiConfig.openai = { configured: true, valid: true };
    }

    // Google Vision API Configuration
    this.log('\n👁️ Google Vision API Configuration:');
    if (config.google && config.google.apiKey) {
      const useExisting = await this.question('Existing Google Vision API key found. Use existing? (y/n): ');
      if (useExisting.toLowerCase() !== 'y') {
        config.google = {};
      }
    }

    if (!config.google || !config.google.apiKey) {
      const apiKey = await this.question('Enter your Google Vision API key (or press Enter to skip): ');
      if (apiKey.trim()) {
        config.google = { apiKey: apiKey.trim(), enabled: true };

        // Test Google Vision API
        this.log('Testing Google Vision API connection...');
        const testResult = await this.testGoogleVisionAPI(apiKey.trim());
        if (testResult.success) {
          this.log('✅ Google Vision API key validated successfully', 'success');
          this.results.apiConfig.google = { configured: true, valid: true };
        } else {
          this.log(`❌ Google Vision API validation failed: ${testResult.error}`, 'error');
          this.results.apiConfig.google = { configured: true, valid: false };
          this.results.overall.warnings.push('Google Vision API key validation failed');
        }
      } else {
        this.log('⚠️ Google Vision API key skipped', 'warning');
        this.results.apiConfig.google = { configured: false };
      }
    } else {
      this.log('✅ Using existing Google Vision configuration', 'success');
      this.results.apiConfig.google = { configured: true, valid: true };
    }

    // Save configuration
    if (Object.keys(config).length > 0) {
      try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        this.log('✅ API configuration saved', 'success');
      } catch (error) {
        this.log(`❌ Failed to save API configuration: ${error.message}`, 'error');
        this.results.overall.errors.push('Failed to save API configuration');
      }
    }
  }

  async testOpenAIAPI(apiKey) {
    try {
      const https = require('https');
      const data = JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      });

      return new Promise((resolve) => {
        const options = {
          hostname: 'api.openai.com',
          port: 443,
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Content-Length': data.length
          },
          timeout: 10000
        };

        const req = https.request(options, (res) => {
          if (res.statusCode === 200) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: `HTTP ${res.statusCode}` });
          }
        });

        req.on('error', (error) => {
          resolve({ success: false, error: error.message });
        });

        req.on('timeout', () => {
          resolve({ success: false, error: 'Request timeout' });
        });

        req.write(data);
        req.end();
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testGoogleVisionAPI(apiKey) {
    try {
      const https = require('https');
      const data = JSON.stringify({
        requests: [{
          image: { content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' },
          features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
        }]
      });

      return new Promise((resolve) => {
        const options = {
          hostname: 'vision.googleapis.com',
          port: 443,
          path: `/v1/images:annotate?key=${apiKey}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
          },
          timeout: 10000
        };

        const req = https.request(options, (res) => {
          if (res.statusCode === 200) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: `HTTP ${res.statusCode}` });
          }
        });

        req.on('error', (error) => {
          resolve({ success: false, error: error.message });
        });

        req.on('timeout', () => {
          resolve({ success: false, error: 'Request timeout' });
        });

        req.write(data);
        req.end();
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async validateProjectStructure() {
    this.log('\n📁 PROJECT STRUCTURE VALIDATION', 'header');
    this.log('=' .repeat(50), 'header');

    const requiredDirs = [
      'src',
      'src/main',
      'src/preload',
      'src/renderer',
      'src/renderer/components',
      'src/modules',
      'src/shared',
      'src/test',
      'assets',
      'scripts'
    ];

    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'webpack.config.js',
      'src/main/main.ts',
      'src/preload/preload.ts',
      'src/renderer/App.tsx',
      'src/renderer/index.tsx',
      'src/modules/RecordingModule.ts',
      'src/modules/VideoProcessingModule.ts',
      'src/modules/VisionAnalysisModule.ts',
      'src/modules/ActionSequenceModule.ts',
      'src/modules/CodeGenerationModule.ts'
    ];

    // Check directories
    this.log('Checking required directories...');
    for (const dir of requiredDirs) {
      const dirPath = path.join(this.projectRoot, dir);
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        this.log(`✅ ${dir}/`, 'success');
        this.results.projectStructure[`dir-${dir}`] = { exists: true };
      } else {
        this.log(`❌ ${dir}/ missing`, 'error');
        this.results.projectStructure[`dir-${dir}`] = { exists: false };
        this.results.overall.errors.push(`Missing directory: ${dir}`);
      }
    }

    // Check files
    this.log('Checking required files...');
    for (const file of requiredFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        this.log(`✅ ${file}`, 'success');
        this.results.projectStructure[`file-${file}`] = { exists: true };
      } else {
        this.log(`❌ ${file} missing`, 'error');
        this.results.projectStructure[`file-${file}`] = { exists: false };
        this.results.overall.errors.push(`Missing file: ${file}`);
      }
    }

    // Check TypeScript compilation
    this.log('Checking TypeScript compilation...');
    const tscResult = this.execCommand('npx tsc --noEmit');
    if (tscResult.success) {
      this.log('✅ TypeScript compilation successful', 'success');
      this.results.projectStructure.typescript = { compiles: true };
    } else {
      this.log(`❌ TypeScript compilation errors:`, 'error');
      this.log(tscResult.output, 'error');
      this.results.projectStructure.typescript = { compiles: false, errors: tscResult.output };
      this.results.overall.errors.push('TypeScript compilation failed');
    }
  }

  async verifyBuildSystem() {
    this.log('\n🔨 BUILD SYSTEM VERIFICATION', 'header');
    this.log('=' .repeat(50), 'header');

    // Check ESLint
    this.log('Running ESLint validation...');
    const eslintResult = this.execCommand('npx eslint src --ext .ts,.tsx --max-warnings 0');
    if (eslintResult.success) {
      this.log('✅ ESLint validation passed', 'success');
      this.results.buildSystem.eslint = { passed: true };
    } else {
      this.log('⚠️ ESLint warnings/errors found:', 'warning');
      this.log(eslintResult.output, 'warning');
      this.results.buildSystem.eslint = { passed: false, output: eslintResult.output };
      this.results.overall.warnings.push('ESLint issues found');
    }

    // Check Prettier
    this.log('Checking Prettier formatting...');
    const prettierResult = this.execCommand('npx prettier --check "src/**/*.{ts,tsx,css}"');
    if (prettierResult.success) {
      this.log('✅ Code formatting is consistent', 'success');
      this.results.buildSystem.prettier = { passed: true };
    } else {
      this.log('⚠️ Code formatting issues found', 'warning');
      this.log('   Run "npm run format" to fix formatting', 'warning');
      this.results.buildSystem.prettier = { passed: false };
      this.results.overall.warnings.push('Code formatting inconsistencies');
    }

    // Test webpack build
    this.log('Testing webpack build process...');
    const buildResult = this.execCommand('npm run build:webpack', { timeout: 120000 });
    if (buildResult.success) {
      this.log('✅ Webpack build successful', 'success');
      this.results.buildSystem.webpack = { success: true };

      // Check build outputs
      const buildFiles = ['dist/main.js', 'dist/preload.js', 'dist/renderer.js', 'dist/index.html'];
      let allFilesExist = true;

      for (const file of buildFiles) {
        const filePath = path.join(this.projectRoot, file);
        if (fs.existsSync(filePath)) {
          this.log(`✅ ${file} generated`, 'success');
        } else {
          this.log(`❌ ${file} missing`, 'error');
          allFilesExist = false;
        }
      }

      this.results.buildSystem.buildOutputs = { allPresent: allFilesExist };
      if (!allFilesExist) {
        this.results.overall.errors.push('Missing build output files');
      }
    } else {
      this.log(`❌ Webpack build failed:`, 'error');
      this.log(buildResult.output, 'error');
      this.results.buildSystem.webpack = { success: false, error: buildResult.output };
      this.results.overall.errors.push('Webpack build failed');
    }

    // Check Electron packaging configuration
    this.log('Verifying Electron packaging configuration...');
    const packageJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf8'));
    if (packageJson.build && packageJson.build.appId) {
      this.log('✅ Electron Builder configuration found', 'success');
      this.results.buildSystem.electronBuilder = { configured: true };
    } else {
      this.log('⚠️ Electron Builder configuration incomplete', 'warning');
      this.results.buildSystem.electronBuilder = { configured: false };
      this.results.overall.warnings.push('Electron Builder configuration incomplete');
    }
  }

  async generateReport() {
    this.log('\n📊 SETUP SUMMARY REPORT', 'header');
    this.log('=' .repeat(50), 'header');

    const totalErrors = this.results.overall.errors.length;
    const totalWarnings = this.results.overall.warnings.length;

    if (totalErrors === 0 && totalWarnings === 0) {
      this.log('🎉 SETUP COMPLETED SUCCESSFULLY!', 'success');
      this.log('All checks passed. Your development environment is ready!', 'success');
      this.results.overall.success = true;
    } else if (totalErrors === 0) {
      this.log('✅ SETUP COMPLETED WITH WARNINGS', 'warning');
      this.log(`Found ${totalWarnings} warning(s) that should be addressed:`, 'warning');
      this.results.overall.warnings.forEach(warning => {
        this.log(`  ⚠️ ${warning}`, 'warning');
      });
      this.results.overall.success = true;
    } else {
      this.log('❌ SETUP FAILED', 'error');
      this.log(`Found ${totalErrors} error(s) that must be fixed:`, 'error');
      this.results.overall.errors.forEach(error => {
        this.log(`  ❌ ${error}`, 'error');
      });
      if (totalWarnings > 0) {
        this.log(`Also found ${totalWarnings} warning(s):`, 'warning');
        this.results.overall.warnings.forEach(warning => {
          this.log(`  ⚠️ ${warning}`, 'warning');
        });
      }
      this.results.overall.success = false;
    }

    // Save detailed results
    const reportPath = path.join(this.projectRoot, 'setup-report.json');
    try {
      fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
      this.log(`\n📄 Detailed report saved to: ${reportPath}`, 'info');
    } catch (error) {
      this.log(`Failed to save detailed report: ${error.message}`, 'error');
    }

    // Generate troubleshooting guidance
    if (!this.results.overall.success) {
      this.log('\n🔧 TROUBLESHOOTING GUIDANCE', 'header');
      this.log('=' .repeat(50), 'header');

      if (this.results.overall.errors.includes('Node.js version too old')) {
        this.log('📥 Update Node.js:', 'info');
        this.log('   Download the latest LTS version from https://nodejs.org/', 'info');
      }

      if (this.results.overall.errors.includes('FFmpeg not found')) {
        this.log('📥 FFmpeg Installation Failed:', 'info');
        this.log('   The automatic FFmpeg download failed. Manual options:', 'info');
        this.log('   1. Download from https://ffmpeg.org/download.html', 'info');
        this.log('   2. Add to system PATH or place ffmpeg.exe in project root', 'info');
        this.log('   3. Re-run setup script to retry automatic installation', 'info');
      }

      if (this.results.overall.errors.includes('Dependency installation failed')) {
        this.log('📦 Fix dependency issues:', 'info');
        this.log('   1. Delete node_modules: rm -rf node_modules', 'info');
        this.log('   2. Clear npm cache: npm cache clean --force', 'info');
        this.log('   3. Reinstall: npm install', 'info');
      }

      if (this.results.overall.errors.includes('TypeScript compilation failed')) {
        this.log('🔧 Fix TypeScript errors:', 'info');
        this.log('   1. Check the compilation errors above', 'info');
        this.log('   2. Fix syntax and type errors in the source files', 'info');
        this.log('   3. Run: npx tsc --noEmit to verify fixes', 'info');
      }
    }

    // Next steps
    this.log('\n🚀 NEXT STEPS', 'header');
    this.log('=' .repeat(50), 'header');

    if (this.results.overall.success) {
      this.log('Your development environment is ready! You can now:', 'info');
      this.log('  🔧 Start development: npm run dev', 'info');
      this.log('  🏗️ Build for production: npm run build', 'info');
      this.log('  📦 Create distribution: npm run dist', 'info');
      this.log('  🧪 Run tests: npm test', 'info');
    } else {
      this.log('Please fix the errors above and run the setup again:', 'info');
      this.log('  npm run setup', 'info');
    }

    return this.results.overall.success;
  }

  async run() {
    try {
      // Initialize log file
      fs.writeFileSync(this.logFile, `Setup started at ${new Date().toISOString()}\n`);

      this.log('🚀 AUTOMATED DEVELOPMENT RECORDER SETUP', 'header');
      this.log('=' .repeat(60), 'header');
      this.log('This script will validate your environment and configure the project.', 'info');
      this.log('Please ensure you have administrator privileges if needed.\n', 'info');

      // Run all validation steps
      await this.validateEnvironment();
      await this.manageDependencies();
      await this.configureAPIs();
      await this.validateProjectStructure();
      await this.verifyBuildSystem();

      // Generate final report
      const success = await this.generateReport();

      // Cleanup
      this.rl.close();

      // Exit with appropriate code
      process.exit(success ? 0 : 1);

    } catch (error) {
      this.log(`\n💥 FATAL ERROR: ${error.message}`, 'error');
      this.log(error.stack, 'error');
      this.rl.close();
      process.exit(1);
    }
  }
}

// Main execution
if (require.main === module) {
  const validator = new SetupValidator();
  validator.run().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}
