import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const distFirefoxDir = path.join(rootDir, 'dist-firefox');

async function buildFirefox() {
  try {
    console.log('[Firefox Build] Running copy-binaries...');
    execSync('node scripts/copy-binaries.js', { stdio: 'inherit' });

    console.log('[Firefox Build] Compiling main bundle to dist-firefox...');
    execSync('npx vite build --outDir dist-firefox', { stdio: 'inherit' });

    console.log('[Firefox Build] Compiling content script to dist-firefox...');
    execSync('npx vite build --mode content --outDir dist-firefox', { stdio: 'inherit' });

    console.log('[Firefox Build] Translating manifest for Firefox compatibility...');
    const manifestPath = path.join(distFirefoxDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Manifest not found in output directory: ${manifestPath}`);
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    // 1. Remove Chrome-specific permissions
    manifest.permissions = (manifest.permissions || []).filter(
      (p) => p !== 'sidePanel'
    );

    // 2. Replace side_panel with sidebar_action for Firefox sidebar support
    delete manifest.side_panel;
    manifest.sidebar_action = {
      default_title: "NodeNaut",
      default_panel: "index.html"
    };

    // 3. Convert background service worker to scripts array (required by Firefox MV3)
    delete manifest.background.service_worker;
    delete manifest.background.type;
    manifest.background.scripts = ["assets/background.js"];

    // 4. Add Gecko browser-specific settings
    manifest.browser_specific_settings = {
      gecko: {
        id: "nodenaut@extension",
        strict_min_version: "109.0"
      }
    };

    // 5. Write back the Firefox manifest
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log('[Firefox Build] ✓ Firefox manifest.json written successfully.');

    console.log('[Firefox Build] 🎉 Build completed in dist-firefox/');
  } catch (error) {
    console.error(`[Firefox Build] Error occurred: ${error.message}`);
    process.exit(1);
  }
}

buildFirefox();
