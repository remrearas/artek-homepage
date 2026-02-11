// noinspection DuplicatedCode

/**
 *  █████╗ ██████╗ ████████╗███████╗██╗  ██╗
 * ██╔══██╗██╔══██╗╚══██╔══╝██╔════╝██║ ██╔╝
 * ███████║██████╔╝   ██║   █████╗  █████╔╝
 * ██╔══██║██╔══██╗   ██║   ██╔══╝  ██╔═██╗
 * ██║  ██║██║  ██║   ██║   ███████╗██║  ██╗
 * ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝
 * ARTEK Favicon Generator
 * Copyright (c) 2025 Rıza Emre ARAS <r.emrearas@proton.me>
 *
 * Generates favicon and platform icons from icon-goal.svg master
 * and outputs directly to public/ directory.
 *
 * Usage: node generate-favicon.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico');

// ============================================================================
// PATHS
// ============================================================================
const MASTER_SVG = path.join(__dirname, 'masters', 'icon-goal.svg');
// scripts/utils/artek-asset-generator/ → scripts/ → project root → public/
const PUBLIC_DIR = path.join(__dirname, '..', '..', '..', 'public');

// ============================================================================
// CONFIGURATION
// ============================================================================
const FAVICON_ICO_SIZES = [16, 32, 48];

const OUTPUT_FILES = [
  { size: 180, output: 'apple-touch-icon.png', subdir: '' },
  { size: 192, output: 'favicon-192.png', subdir: 'assets/icons' },
  { size: 192, output: 'android-chrome-192.png', subdir: 'assets/icons' },
  { size: 512, output: 'android-chrome-512.png', subdir: 'assets/icons' },
];

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  console.log('=================================================');
  console.log('ARTEK Favicon Generator');
  console.log('=================================================\n');

  if (!fs.existsSync(MASTER_SVG)) {
    console.error(`[ERROR] Master SVG not found: ${MASTER_SVG}`);
    process.exit(1);
  }

  console.log(`Master: ${path.basename(MASTER_SVG)}`);
  console.log(`Output: ${PUBLIC_DIR}\n`);

  const svgBuffer = fs.readFileSync(MASTER_SVG);
  let generated = 0;
  let failed = 0;

  // 1. Copy SVG as favicon.svg
  try {
    fs.copyFileSync(MASTER_SVG, path.join(PUBLIC_DIR, 'favicon.svg'));
    console.log('[OK] favicon.svg');
    generated++;
  } catch (error) {
    console.error(`[ERROR] favicon.svg: ${error.message}`);
    failed++;
  }

  // 2. Generate favicon.ico (multi-resolution)
  try {
    const buffers = [];
    for (const size of FAVICON_ICO_SIZES) {
      const buffer = await sharp(svgBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png({ compressionLevel: 9 })
        .toBuffer();
      buffers.push(buffer);
    }
    const icoBuffer = await pngToIco(buffers);
    fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer);
    console.log(`[OK] favicon.ico (${FAVICON_ICO_SIZES.join('+')}px)`);
    generated++;
  } catch (error) {
    console.error(`[ERROR] favicon.ico: ${error.message}`);
    failed++;
  }

  // 3. Generate PNG icons for each platform
  for (const { size, output, subdir } of OUTPUT_FILES) {
    try {
      const outputDir = subdir ? path.join(PUBLIC_DIR, subdir) : PUBLIC_DIR;
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      await sharp(svgBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png({ quality: 100 })
        .toFile(path.join(outputDir, output));

      console.log(`[OK] ${subdir ? subdir + '/' : ''}${output} (${size}x${size})`);
      generated++;
    } catch (error) {
      console.error(`[ERROR] ${output}: ${error.message}`);
      failed++;
    }
  }

  // Summary
  console.log(`\n=================================================`);
  console.log(`Complete: ${generated} generated${failed > 0 ? `, ${failed} failed` : ''}`);
  console.log('=================================================');

  return failed === 0;
}

main()
  .then((success) => process.exit(success ? 0 : 1))
  .catch((error) => {
    console.error(`[FATAL] ${error.message}`);
    process.exit(1);
  });