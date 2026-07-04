import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const rootDir = process.cwd();
const distChrome = path.join(rootDir, 'dist');
const distFirefox = path.join(rootDir, 'dist-firefox');
const outDir = path.join(rootDir, 'releases');

async function zipDirectory(sourceDir, outPath) {
  const zip = new JSZip();

  function addFilesToZip(dirPath, zipFolder) {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        addFilesToZip(fullPath, zipFolder.folder(item));
      } else {
        zipFolder.file(item, fs.readFileSync(fullPath));
      }
    }
  }

  addFilesToZip(sourceDir, zip);

  const content = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });
  
  fs.writeFileSync(outPath, content);
  console.log(`✅ Created: ${outPath}`);
}

async function packageExtensions() {
  try {
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    const version = pkg.version;

    console.log(`📦 Packaging FlowPilot v${version}...`);

    if (fs.existsSync(distChrome)) {
      await zipDirectory(distChrome, path.join(outDir, `flowpilot-chrome-v${version}.zip`));
    } else {
      console.warn('⚠️ Chrome dist folder not found. Run "npm run build" first.');
    }

    if (fs.existsSync(distFirefox)) {
      await zipDirectory(distFirefox, path.join(outDir, `flowpilot-firefox-v${version}.zip`));
    } else {
      console.warn('⚠️ Firefox dist folder not found. Run "npm run build:firefox" first.');
    }

    console.log('🎉 Packaging complete! Check the "releases/" folder.');
  } catch (err) {
    console.error('❌ Error packaging extensions:', err);
    process.exit(1);
  }
}

packageExtensions();
