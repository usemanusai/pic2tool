#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const isDevelopment = process.env.NODE_ENV !== 'production';
const isCI = process.env.CI === 'true';

console.log('🚀 Starting Automated Development Recorder build...');
console.log(`📦 Mode: ${isDevelopment ? 'development' : 'production'}`);
console.log(`🏗️  CI: ${isCI ? 'yes' : 'no'}`);

// Helper functions
function run(command, options = {}) {
  console.log(`⚡ Running: ${command}`);
  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
      ...options
    });
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    process.exit(1);
  }
}

function runSafe(command, options = {}) {
  console.log(`⚡ Running: ${command}`);
  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
      ...options
    });
    return true;
  } catch (error) {
    console.warn(`⚠️  Command failed: ${command}`);
    return false;
  }
}

function checkFile(filePath) {
  const fullPath = path.resolve(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Required file not found: ${filePath}`);
    process.exit(1);
  }
  console.log(`✅ Found: ${filePath}`);
}

function createDirectory(dirPath) {
  const fullPath = path.resolve(__dirname, '..', dirPath);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`📁 Created directory: ${dirPath}`);
  }
}

// Pre-build checks
console.log('\n🔍 Running pre-build checks...');

// Check required files
checkFile('package.json');
checkFile('tsconfig.json');
checkFile('webpack.config.js');
checkFile('src/main/main.ts');
checkFile('src/preload/preload.ts');
checkFile('src/renderer/index.tsx');

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion < 18) {
  console.error(`❌ Node.js 18+ required, found ${nodeVersion}`);
  process.exit(1);
}
console.log(`✅ Node.js version: ${nodeVersion}`);

// Create necessary directories
createDirectory('dist');
createDirectory('assets');

// Clean previous build
console.log('\n🧹 Cleaning previous build...');
run('npm run clean');

// Install dependencies if needed
if (!fs.existsSync(path.resolve(__dirname, '..', 'node_modules'))) {
  console.log('\n📦 Installing dependencies...');
  run('npm install');
} else {
  console.log('\n✅ Dependencies already installed');
}

// Type checking
console.log('\n🔍 Type checking...');
run('npx tsc --noEmit');

// Linting
if (!isCI) {
  console.log('\n🔍 Linting...');
  const lintSuccess = runSafe('npm run lint');
  if (!lintSuccess) {
    console.warn('⚠️  Linting failed, continuing build...');
  }
}

// Build the application
console.log('\n🏗️  Building application...');
if (isDevelopment) {
  run('npm run build:dev');
} else {
  run('npm run build');
}

// Verify build output
console.log('\n🔍 Verifying build output...');
checkFile('dist/main.js');
checkFile('dist/preload.js');
checkFile('dist/renderer.js');
checkFile('dist/index.html');

// Copy assets
console.log('\n📋 Copying assets...');
const assetsDir = path.resolve(__dirname, '..', 'assets');
const distAssetsDir = path.resolve(__dirname, '..', 'dist', 'assets');

if (fs.existsSync(assetsDir)) {
  createDirectory('dist/assets');
  
  const assets = fs.readdirSync(assetsDir);
  assets.forEach(asset => {
    const srcPath = path.join(assetsDir, asset);
    const destPath = path.join(distAssetsDir, asset);
    fs.copyFileSync(srcPath, destPath);
    console.log(`📋 Copied: ${asset}`);
  });
}

// Create package info
console.log('\n📝 Creating package info...');
const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'));
const buildInfo = {
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,
  buildDate: new Date().toISOString(),
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
  isDevelopment,
  isCI
};

fs.writeFileSync(
  path.resolve(__dirname, '..', 'dist', 'build-info.json'),
  JSON.stringify(buildInfo, null, 2)
);

// Build distribution package if in production
if (!isDevelopment && !isCI) {
  console.log('\n📦 Building distribution package...');
  run('npm run dist');
}

// Success message
console.log('\n🎉 Build completed successfully!');
console.log('\n📋 Build Summary:');
console.log(`   📦 Package: ${buildInfo.name} v${buildInfo.version}`);
console.log(`   🏗️  Mode: ${isDevelopment ? 'development' : 'production'}`);
console.log(`   📅 Date: ${buildInfo.buildDate}`);
console.log(`   🖥️  Platform: ${buildInfo.platform} (${buildInfo.arch})`);

if (isDevelopment) {
  console.log('\n🚀 To start the application:');
  console.log('   npm start');
} else {
  console.log('\n📦 Distribution files created in ./release/');
}

console.log('\n✨ Happy coding!');
