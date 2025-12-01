#!/usr/bin/env node

/**
 * Generate test data for ENS typosquatting detection stress testing
 * Creates resolved domain data with random addresses for local storage
 */

const fs = require('fs');
const crypto = require('crypto');

// Common ENS domain patterns
const domainPrefixes = [
  'vitalik',
  'uniswap',
  'metamask',
  'opensea',
  'ethereum',
  'crypto',
  'wallet',
  'defi',
  'nft',
  'token',
  'exchange',
  'protocol',
  'finance',
  'chain',
  'bridge',
  'pool',
  'swap',
  'dao',
  'treasury',
  'foundation',
  'network',
  'validator',
  'staking',
  'governance',
  'community',
  'developer',
  'builder',
  'creator',
  'collector',
  'trader',
];

const domainSuffixes = [
  '',
  'labs',
  'io',
  'finance',
  'protocol',
  'network',
  'dao',
  'xyz',
  'app',
  'official',
  'team',
  'dev',
  'main',
  'alpha',
  'beta',
];

/**
 * Generate a random Ethereum address
 */
function generateRandomAddress() {
  const randomBytes = crypto.randomBytes(20);
  return '0x' + randomBytes.toString('hex');
}

/**
 * Generate a random ENS domain name
 */
function generateDomainName(index) {
  const prefix = domainPrefixes[index % domainPrefixes.length];
  const suffix = domainSuffixes[Math.floor(Math.random() * domainSuffixes.length)];
  const randomNum = Math.floor(Math.random() * 1000);

  if (suffix) {
    return `${prefix}${suffix}${randomNum > 800 ? randomNum : ''}.eth`;
  }
  return `${prefix}${randomNum > 800 ? randomNum : ''}.eth`;
}

/**
 * Generate resolved domains data
 */
function generateResolvedDomains(count) {
  const resolvedDomains = {};
  const usedDomains = new Set();

  let generated = 0;
  while (generated < count) {
    const domain = generateDomainName(generated);

    // Avoid duplicates
    if (!usedDomains.has(domain)) {
      resolvedDomains[domain] = generateRandomAddress();
      usedDomains.add(domain);
      generated++;
    }
  }

  return resolvedDomains;
}

/**
 * Calculate storage size in KB
 */
function calculateSize(data) {
  const jsonString = JSON.stringify(data);
  const sizeInBytes = Buffer.byteLength(jsonString, 'utf8');
  return (sizeInBytes / 1024).toFixed(2);
}

/**
 * Save test data to file
 */
function saveTestData(count, data, outputDir) {
  const filename = `${outputDir}/resolved-domains-${count}.json`;
  const size = calculateSize(data);

  fs.writeFileSync(filename, JSON.stringify(data, null, 2));

  console.log(`✓ Generated ${count} domains (${size} KB) -> ${filename}`);
  return { count, size, filename };
}

/**
 * Generate Chrome extension storage format
 */
function generateChromeStorageFormat(resolvedDomains) {
  return {
    resolvedDomains,
  };
}

/**
 * Main execution
 */
function main() {
  const outputDir = './test-data';

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Generating test data for ENS typosquatting detection...\n');

  const counts = [20, 500, 1000, 10000];
  const results = [];

  for (const count of counts) {
    console.log(`Generating ${count} domains...`);
    const resolvedDomains = generateResolvedDomains(count);
    const storageData = generateChromeStorageFormat(resolvedDomains);
    const result = saveTestData(count, storageData, outputDir);
    results.push(result);
  }

  console.log('\n=== Summary ===');
  results.forEach(({ count, size, filename }) => {
    console.log(`${count.toString().padStart(5)} domains: ${size.padStart(10)} KB`);
  });

  console.log('\n=== Usage Instructions ===');
  console.log('1. Open Chrome DevTools on MetaMask extension');
  console.log('2. Go to Application > Storage > Local Storage');
  console.log('3. Or use this script in the console:\n');
  console.log('// Load test data into chrome.storage.local');
  console.log('const testData = ' + JSON.stringify(generateChromeStorageFormat(generateResolvedDomains(20)), null, 2) + ';');
  console.log('chrome.storage.local.set(testData, () => {');
  console.log('  console.log("Test data loaded!");');
  console.log('});\n');

  console.log('\n=== Console Script for Each Test Size ===\n');

  counts.forEach(count => {
    const filename = `${outputDir}/resolved-domains-${count}.json`;
    console.log(`// Load ${count} domains:`);
    console.log(`fetch('${filename}')`);
    console.log('  .then(r => r.json())');
    console.log('  .then(data => chrome.storage.local.set(data, () => console.log("Loaded!")));');
    console.log('');
  });
}

// Run the script
main();
