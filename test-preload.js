#!/usr/bin/env node

/**
 * Test script to verify preload script is working
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Preload Script Test');
console.log('=====================\n');

// Check if preload.js exists in dist
const preloadPath = path.join(__dirname, 'dist', 'preload.js');
console.log('📁 Checking preload script...');
console.log(`Path: ${preloadPath}`);

if (fs.existsSync(preloadPath)) {
  const stats = fs.statSync(preloadPath);
  console.log(`✅ preload.js exists (${Math.round(stats.size / 1024)}KB)`);
  
  // Check if it contains the electronAPI
  const content = fs.readFileSync(preloadPath, 'utf8');
  console.log('\n🔍 Checking preload content...');
  console.log('Contains contextBridge:', content.includes('contextBridge') ? '✅' : '❌');
  console.log('Contains electronAPI:', content.includes('electronAPI') ? '✅' : '❌');
  console.log('Contains exposeInMainWorld:', content.includes('exposeInMainWorld') ? '✅' : '❌');
  
  // Check for specific methods
  const methods = [
    'startRecording',
    'stopRecording', 
    'processVideo',
    'getSources',
    'getSettings'
  ];
  
  console.log('\n🔍 Checking API methods...');
  methods.forEach(method => {
    console.log(`${method}:`, content.includes(method) ? '✅' : '❌');
  });
  
} else {
  console.log('❌ preload.js not found!');
  console.log('Run: npm run build');
}

// Check main.js for preload path
const mainPath = path.join(__dirname, 'dist', 'main.js');
if (fs.existsSync(mainPath)) {
  const mainContent = fs.readFileSync(mainPath, 'utf8');
  console.log('\n🔍 Checking main.js preload configuration...');
  console.log('Contains preload path:', mainContent.includes('preload.js') ? '✅' : '❌');
  console.log('Contains webPreferences:', mainContent.includes('webPreferences') ? '✅' : '❌');
  console.log('Contains contextIsolation:', mainContent.includes('contextIsolation') ? '✅' : '❌');
}

console.log('\n🚀 If all checks pass, the preload script should work correctly!');
console.log('Run: npm start (and check console for preload messages)');
