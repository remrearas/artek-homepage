#!/usr/bin/env node
// noinspection DuplicatedCode,HttpUrlsUsage

/**
 *  █████╗ ██████╗  █████╗ ███████╗
 * ██╔══██╗██╔══██╗██╔══██╗██╔════╝
 * ███████║██████╔╝███████║███████╗
 * ██╔══██║██╔══██╗██╔══██║╚════██║
 * ██║  ██║██║  ██║██║  ██║███████║
 * ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
 *
 * Copyright (C) 2025 Rıza Emre ARAS <r.emrearas@proton.me>
 *
 * This file is part of ARTEK Homepage.
 *
 * ARTEK Homepage is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * Usage:
 *     npm run prod
 * Requirements:
 *     npm install -D @playwright/test js-yaml
 *     npx playwright install chromium
 */

import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import yaml from 'js-yaml';
import pLimit from 'p-limit';
import prettier from 'prettier';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// scripts/utils/prerender-utility/ → scripts/ → project root
const PROJECT_ROOT = join(__dirname, '..', '..', '..');
const DIST_DIR = join(PROJECT_ROOT, 'dist');
const CONFIG_PATH = join(__dirname, 'config.yaml');
const ROUTES_PATH = join(PROJECT_ROOT, 'routes.yaml');

// Logging utilities
const log = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  warning: (msg) => console.log(`[WARNING] ${msg}`),
};

/**
 * @typedef {Object} Config
 * @property {string} production_url
 * @property {number} preview_port
 * @property {string} default_locale
 * @property {string} default_theme
 * @property {string[]} locales
 * @property {string[]} themes
 * @property {string[]} routes
 * @property {string[]} [exclude_from_sitemap] - Routes to exclude from sitemap.xml
 * @property {Object} playwright - Playwright settings
 * @property {boolean} playwright.headless - Headless mode
 * @property {number} playwright.concurrency - Parallel page renders
 * @property {number} page_load_timeout - in seconds
 * @property {number} wait_for_ready_timeout - in seconds
 * @property {number} network_idle_timeout - in seconds
 * @property {number} additional_wait - in seconds
 */

/**
 * Load configuration from YAML files
 * Reads from:
 *   - prerender-utility/config.yaml (locales, themes, timeouts, etc.)
 *   - routes.yaml (routes only)
 * @returns {Config}
 */
function loadConfig() {
  // Load prerender config
  const configContents = readFileSync(CONFIG_PATH, 'utf8');
  const config = yaml.load(configContents);

  // Load routes
  const routesContents = readFileSync(ROUTES_PATH, 'utf8');
  const routesData = yaml.load(routesContents);

  // Merge routes into config
  return {
    ...config,
    routes: routesData.routes || [],
  };
}

/**
 * Start preview server as subprocess
 * @param {Config} config
 * @returns {Promise<import('child_process').ChildProcess>}
 */
function startPreviewServer(config) {
  return new Promise((resolve, reject) => {
    log.info(`Starting preview server on port ${config.preview_port}`);

    const serverProcess = spawn(
      'npm',
      ['run', 'preview', '--', '--port', config.preview_port.toString()],
      {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
        shell: true,
      }
    );

    // Wait for server to initialize
    const timeout = setTimeout(() => {
      log.info(`Preview server started (PID: ${serverProcess.pid})`);
      resolve(serverProcess);
    }, 3000);

    serverProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    // Check if process dies immediately
    serverProcess.on('exit', (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`Server exited with code ${code}`));
      }
    });
  });
}

/**
 * Stop preview server
 * @param {import('child_process').ChildProcess} serverProcess
 */
function stopPreviewServer(serverProcess) {
  if (serverProcess && !serverProcess.killed) {
    log.info('Stopping preview server');
    try {
      serverProcess.kill('SIGTERM');

      // Force kill after timeout
      setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
      }, 3000);
    } catch (error) {
      log.warning(`Server stop error: ${error.message}`);
    }
  }
}

/**
 * Pre-render single route with locale and theme
 * @param {import('@playwright/test').Page} page
 * @param {string} route
 * @param {string} locale
 * @param {string} theme
 * @param {Config} config
 * @returns {Promise<boolean>}
 */
async function prerenderRoute(page, route, locale, theme, config) {
  const renderUrl = `${config.production_url}${route}?__prerendering=true&locale=${locale}&theme=${theme}`;

  const outputFile = route === '/' ? 'index' : `${route.replace(/^\//, '')}/index`;
  const themeSuffix = theme === config.default_theme ? '' : `.${theme}`;
  const localeSuffix = locale === config.default_locale ? '' : `.${locale}`;
  const outputPath = join(DIST_DIR, `${outputFile}${themeSuffix}${localeSuffix}.html`);

  log.info(`Rendering ${route} [${locale}] [${theme}]`);

  // Track resources loaded during page render (network-based detection)
  const resources = {
    css: new Set(),
    js: new Set(),
  };

  // Monitor network responses for assets
  page.on('response', async (response) => {
    const url = response.url();
    if (!response.ok() || !url.includes('/assets/')) return;

    const relativePath = url.replace(config.production_url, '');

    // Track CSS chunks
    if (url.endsWith('.css')) {
      resources.css.add(relativePath);
    }
    // Track JS chunks (excluding main entry point to avoid duplication)
    else if (url.endsWith('.js') && !relativePath.includes('/assets/index-')) {
      resources.js.add(relativePath);
    }
  });

  try {
    // Navigate to production URL (DNS override routes to localhost)
    await page.goto(renderUrl, {
      waitUntil: 'domcontentloaded',
      timeout: config.page_load_timeout * 1000,
    });

    // Wait for React app ready
    await page.waitForFunction(() => document.querySelector('#root')?.innerHTML?.length > 100, {
      timeout: config.wait_for_ready_timeout * 1000,
    });

    // Wait for network idle
    await page.waitForLoadState('networkidle', {
      timeout: config.network_idle_timeout * 1000,
    });

    // Additional wait for lazy content
    await page.waitForTimeout(config.additional_wait * 1000);

    // Get rendered HTML
    let html = await page.content();

    if (html.length < 1000) {
      log.error(`Empty HTML for ${route}`);
      return false;
    }

    // Inject resource preload hints for faster loading
    const preloadHints = [];

    // CSS preload links (with crossorigin for CORS compatibility)
    if (resources.css.size > 0) {
      Array.from(resources.css).forEach((href) => {
        preloadHints.push(`  <link rel="preload" href="${href}" as="style" crossorigin>`);
      });
    }

    // JS modulepreload links (for lazy chunks, with crossorigin)
    if (resources.js.size > 0) {
      Array.from(resources.js).forEach((href) => {
        preloadHints.push(`  <link rel="modulepreload" href="${href}" crossorigin>`);
      });
    }

    // Inject all preload hints before </head>
    if (preloadHints.length > 0) {
      html = html.replace('</head>', `\n${preloadHints.join('\n')}\n  </head>`);
      log.info(
        `  → ${resources.css.size} CSS + ${resources.js.size} JS preload(s) injected (${preloadHints.length} total)`
      );
    }

    // Beautify HTML for debugging (optional, can be disabled for production)
    const beautifiedHtml = await prettier.format(html, {
      parser: 'html',
      printWidth: 120,
      tabWidth: 2,
      useTabs: false,
    });

    // Save HTML
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    writeFileSync(outputPath, beautifiedHtml, 'utf-8');

    log.info(`Success: ${route}`);
    return true;
  } catch (error) {
    log.error(`Failed ${route}: ${error.message.substring(0, 150)}`);
    return false;
  }
}

/**
 * Pre-render all routes
 * @param {Config} config
 * @returns {Promise<number>}
 */
async function prerenderAll(config) {
  // noinspection HttpUrlsUsage
  const prodDomain = config.production_url.replace('https://', '').replace('http://', '');

  log.info(`Pre-rendering ${config.routes.length} routes`);
  log.info(`DNS Override: ${prodDomain} → localhost:${config.preview_port}`);

  const browser = await chromium.launch({
    headless: config.playwright?.headless ?? false,
    args: [
      `--host-resolver-rules=MAP ${prodDomain}:443 localhost:${config.preview_port}`,
      '--ignore-certificate-errors',
    ],
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });

  // Parallel rendering with concurrency limit
  const concurrency = config.playwright?.concurrency || 5;
  const limit = pLimit(concurrency);

  log.info(`Rendering with concurrency: ${concurrency} parallel pages`);

  // Create tasks for all route+locale+theme combinations
  const tasks = [];
  for (const route of config.routes) {
    for (const locale of config.locales) {
      for (const theme of config.themes) {
        tasks.push({ route, locale, theme });
      }
    }
  }

  // Render all tasks in parallel (with concurrency limit)
  const results = await Promise.all(
    tasks.map(({ route, locale, theme }) =>
      limit(async () => {
        const page = await context.newPage();
        try {
          return await prerenderRoute(page, route, locale, theme, config);
        } finally {
          await page.close();
        }
      })
    )
  );

  await browser.close();

  // Count successful renders
  return results.filter((success) => success).length;
}

/**
 * Calculate priority based on route depth
 * @param {string} route
 * @returns {string}
 */
function calculatePriority(route) {
  if (route === '/') return '1.0';
  const depth = route.split('/').filter(Boolean).length;
  if (depth === 1) return '0.8';
  if (depth === 2) return '0.6';
  return '0.4';
}

/**
 * Calculate change frequency based on route depth
 * @param {string} route
 * @returns {string}
 */
function calculateChangeFreq(route) {
  if (route === '/') return 'weekly';
  const depth = route.split('/').filter(Boolean).length;
  if (depth <= 2) return 'monthly';
  return 'yearly';
}

/**
 * Generate sitemap.xml from routes and config
 * @param {Config} config
 */
function generateSitemap(config) {
  const today = new Date().toISOString().split('T')[0];
  const productionUrl = config.production_url.replace(/\/$/, '');
  const excluded = config.exclude_from_sitemap || [];

  const urls = config.routes.filter((route) => !excluded.includes(route)).map((route) => {
    const loc = route === '/' ? productionUrl + '/' : `${productionUrl}${route}`;
    return [
      '  <url>',
      `    <loc>${loc}</loc>`,
      `    <lastmod>${today}</lastmod>`,
      `    <changefreq>${calculateChangeFreq(route)}</changefreq>`,
      `    <priority>${calculatePriority(route)}</priority>`,
      '  </url>',
    ].join('\n');
  });

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');

  writeFileSync(join(DIST_DIR, 'sitemap.xml'), sitemap, 'utf-8');
  log.info(`Sitemap generated (${config.routes.length} URLs)`);
}

/**
 * Generate robots.txt with sitemap reference
 * @param {Config} config
 */
function generateRobotsTxt(config) {
  const productionUrl = config.production_url.replace(/\/$/, '');

  const robotsTxt = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${productionUrl}/sitemap.xml`,
    '',
  ].join('\n');

  writeFileSync(join(DIST_DIR, 'robots.txt'), robotsTxt, 'utf-8');
  log.info('robots.txt generated');
}

/**
 * Main execution
 */
async function main() {
  log.info('SSG Pre-Rendering - Starting');

  let serverProcess = null;

  try {
    // Load configuration
    const config = loadConfig();
    log.info(`Config: ${config.routes.length} routes`);

    // Verify dist/ exists
    if (!existsSync(DIST_DIR)) {
      log.error('dist/ not found. Run npm run build first');
      return false;
    }

    // Build and copy Cloudflare Worker to dist/ (inject config)
    try {
      const workerTemplate = readFileSync(join(__dirname, '_worker.js'), 'utf-8');

      // Inject config values
      const workerCode = workerTemplate
        .replace('__LOCALES__', JSON.stringify(config.locales))
        .replace('__DEFAULT_LOCALE__', `'${config.default_locale}'`)
        .replace('__THEMES__', JSON.stringify(config.themes))
        .replace('__DEFAULT_THEME__', `'${config.default_theme}'`);

      writeFileSync(join(DIST_DIR, '_worker.js'), workerCode, 'utf-8');
      log.info(
        `Cloudflare Worker built (locales: ${config.locales.join(', ')}, themes: ${config.themes.join(', ')})`
      );
    } catch (error) {
      log.warning(`Failed to build _worker.js: ${error.message}`);
    }

    // Generate sitemap.xml and robots.txt
    try {
      generateSitemap(config);
      generateRobotsTxt(config);
    } catch (error) {
      log.warning(`Failed to generate sitemap/robots.txt: ${error.message}`);
    }

    // Start preview server
    serverProcess = await startPreviewServer(config);

    // Pre-render
    const successCount = await prerenderAll(config);
    const total = config.routes.length * config.locales.length * config.themes.length;

    log.info(
      `Complete: ${successCount}/${total} successful (${config.routes.length} routes × ${config.locales.length} locales × ${config.themes.length} themes)`
    );

    return successCount === total;
  } catch (error) {
    if (error.code === 'ENOENT') {
      log.error(`File not found: ${error.path}`);
    } else {
      log.error(`Fatal error: ${error.message}`);
    }
    return false;
  } finally {
    // Always stop server (cleanup)
    stopPreviewServer(serverProcess);
  }
}

// Run
main()
  .then((success) => process.exit(success ? 0 : 1))
  .catch((error) => {
    log.error(`Unhandled error: ${error}`);
    process.exit(1);
  });
