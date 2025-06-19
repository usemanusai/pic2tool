#!/usr/bin/env node

/**
 * Quick Validation Script for pic2tool
 * Performs basic environment checks without full setup
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

class QuickValidator {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.checks = [];
  }

  log(message, type = 'info') {
    const colorMap = {
      info: colors.cyan,
      success: colors.green,
      warning: colors.yellow,
      error: colors.red,
      header: colors.magenta
    };
    
    const coloredMessage = `${colorMap[type] || colors.reset}${message}${colors.reset}`;
    console.log(coloredMessage);
  }

  execCommand(command) {
    try {
      const result = execSync(command, { 
        encoding: 'utf8', 
        cwd: this.projectRoot,
        stdio: 'pipe'
      });
      return { success: true, output: result.trim() };
    } catch (error) {
      return { success: false, error: error.message };
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

  addCheck(name, status, message) {
    this.checks.push({ name, status, message });
    const icon = status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : '❌';
    const type = status === 'pass' ? 'success' : status === 'warn' ? 'warning' : 'error';
    this.log(`${icon} ${name}: ${message}`, type);
  }

  async validate() {
    this.log('\n🔍 QUICK ENVIRONMENT VALIDATION', 'header');
    this.log('=' .repeat(50), 'header');

    // Check Node.js
    const nodeResult = this.execCommand('node --version');
    if (nodeResult.success) {
      const nodeVersion = nodeResult.output.replace('v', '');
      const isValidNode = this.checkVersion(nodeVersion, '18.0.0');
      this.addCheck(
        'Node.js Version',
        isValidNode ? 'pass' : 'fail',
        `${nodeVersion} ${isValidNode ? '(✓ meets requirement)' : '(✗ requires 18.x+)'}`
      );
    } else {
      this.addCheck('Node.js Version', 'fail', 'Not found');
    }

    // Check npm
    const npmResult = this.execCommand('npm --version');
    if (npmResult.success) {
      this.addCheck('npm Package Manager', 'pass', `${npmResult.output}`);
    } else {
      this.addCheck('npm Package Manager', 'fail', 'Not found');
    }

    // Check operating system
    const platform = os.platform();
    const release = os.release();
    if (platform === 'win32') {
      const buildNumber = parseInt(release.split('.')[2] || '0');
      const isWin11 = buildNumber >= 22000;
      this.addCheck(
        'Operating System',
        isWin11 ? 'pass' : 'warn',
        `Windows ${release} ${isWin11 ? '(Windows 11)' : '(Windows 11 recommended)'}`
      );
    } else {
      this.addCheck('Operating System', 'warn', `${platform} (Windows 11 recommended)`);
    }

    // Check FFmpeg
    const ffmpegResult = this.execCommand('ffmpeg -version');
    if (ffmpegResult.success) {
      const versionMatch = ffmpegResult.output.match(/ffmpeg version ([^\s]+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';
      this.addCheck('FFmpeg', 'pass', `${version} (in PATH)`);
    } else {
      // Check for local FFmpeg
      const localPaths = [
        path.join(this.projectRoot, 'ffmpeg.exe'),
        path.join(this.projectRoot, 'ffmpeg', 'ffmpeg.exe')
      ];
      
      let found = false;
      for (const ffmpegPath of localPaths) {
        if (fs.existsSync(ffmpegPath)) {
          this.addCheck('FFmpeg', 'pass', `Found locally at ${path.basename(ffmpegPath)}`);
          found = true;
          break;
        }
      }
      
      if (!found) {
        this.addCheck('FFmpeg', 'fail', 'Not found in PATH or project directory');
      }
    }

    // Check system memory
    const totalMemory = Math.round(os.totalmem() / (1024 * 1024 * 1024));
    this.addCheck(
      'System Memory',
      totalMemory >= 8 ? 'pass' : 'warn',
      `${totalMemory}GB ${totalMemory >= 8 ? '(sufficient)' : '(8GB+ recommended)'}`
    );

    // Check project structure
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'src/main/main.ts',
      'src/renderer/App.tsx'
    ];

    let missingFiles = 0;
    for (const file of requiredFiles) {
      if (!fs.existsSync(path.join(this.projectRoot, file))) {
        missingFiles++;
      }
    }

    this.addCheck(
      'Project Structure',
      missingFiles === 0 ? 'pass' : 'fail',
      missingFiles === 0 ? 'All required files present' : `${missingFiles} files missing`
    );

    // Check if dependencies are installed
    const nodeModulesExists = fs.existsSync(path.join(this.projectRoot, 'node_modules'));
    this.addCheck(
      'Dependencies',
      nodeModulesExists ? 'pass' : 'warn',
      nodeModulesExists ? 'node_modules found' : 'Run npm install'
    );

    // Check TypeScript compilation (if dependencies exist)
    if (nodeModulesExists) {
      const tscResult = this.execCommand('npx tsc --noEmit');
      this.addCheck(
        'TypeScript Compilation',
        tscResult.success ? 'pass' : 'fail',
        tscResult.success ? 'No compilation errors' : 'Compilation errors found'
      );
    }

    // Generate summary
    this.log('\n📊 VALIDATION SUMMARY', 'header');
    this.log('=' .repeat(50), 'header');

    const passed = this.checks.filter(c => c.status === 'pass').length;
    const warnings = this.checks.filter(c => c.status === 'warn').length;
    const failed = this.checks.filter(c => c.status === 'fail').length;

    this.log(`✅ Passed: ${passed}`, 'success');
    if (warnings > 0) this.log(`⚠️ Warnings: ${warnings}`, 'warning');
    if (failed > 0) this.log(`❌ Failed: ${failed}`, 'error');

    if (failed === 0 && warnings === 0) {
      this.log('\n🎉 All checks passed! Your environment is ready.', 'success');
      this.log('Run "npm run setup" for full configuration.', 'info');
    } else if (failed === 0) {
      this.log('\n✅ Environment is mostly ready with some warnings.', 'warning');
      this.log('Run "npm run setup" for full configuration and fixes.', 'info');
    } else {
      this.log('\n❌ Some critical issues need to be resolved.', 'error');
      this.log('Please fix the failed checks and run validation again.', 'error');
      this.log('Run "npm run setup" for guided setup and troubleshooting.', 'info');
    }

    this.log('\n🚀 Next Steps:', 'header');
    if (!nodeModulesExists) {
      this.log('1. Install dependencies: npm install', 'info');
    }
    this.log('2. Run full setup: npm run setup', 'info');
    this.log('3. Start development: npm run dev', 'info');

    return failed === 0;
  }
}

// Main execution
if (require.main === module) {
  const validator = new QuickValidator();
  validator.validate().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error(`${colors.red}Validation error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = QuickValidator;
