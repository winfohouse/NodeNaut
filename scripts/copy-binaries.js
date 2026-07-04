import * as fs from 'fs';
import * as path from 'path';

// Resolve paths
const rootDir = process.cwd();
const mcpPackageJsonPath = path.join(rootDir, 'mcp-server', 'package.json');
const binDir = path.join(rootDir, 'mcp-server', 'bin');
const publicMcpDir = path.join(rootDir, 'public', 'mcp');

function copyBinaries() {
  try {
    // 1. Read MCP server version
    if (!fs.existsSync(mcpPackageJsonPath)) {
      console.error(`[Copy Binaries] Error: ${mcpPackageJsonPath} does not exist`);
      process.exit(1);
    }
    const mcpPkg = JSON.parse(fs.readFileSync(mcpPackageJsonPath, 'utf8'));
    const version = mcpPkg.version || '1.0.0';
    console.log(`[Copy Binaries] Detected MCP version: v${version}`);

    // 2. Ensure public/mcp directory exists and is clean
    if (fs.existsSync(publicMcpDir)) {
      // Clean old files in public/mcp
      const files = fs.readdirSync(publicMcpDir);
      for (const file of files) {
        fs.unlinkSync(path.join(publicMcpDir, file));
      }
    } else {
      fs.mkdirSync(publicMcpDir, { recursive: true });
    }

    // 3. Define binary files to copy and rename
    const binaries = [
      { src: 'flowpilot-mcp-win.exe', dest: `flowpilot-mcp-win-v${version}.exe` },
      { src: 'flowpilot-mcp-macos', dest: `flowpilot-mcp-macos-v${version}` },
      { src: 'flowpilot-mcp-linux', dest: `flowpilot-mcp-linux-v${version}` }
    ];

    // 4. Copy each binary if it exists
    for (const bin of binaries) {
      const srcPath = path.join(binDir, bin.src);
      const destPath = path.join(publicMcpDir, bin.dest);

      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`[Copy Binaries] Copied: ${bin.src} -> public/mcp/${bin.dest}`);
      } else {
        console.warn(`[Copy Binaries] Warning: Source binary not found at ${srcPath}. Make sure to build mcp-server first.`);
      }
    }

    console.log('[Copy Binaries] ✓ Done copying binaries.');
  } catch (error) {
    console.error(`[Copy Binaries] Exception occurred: ${error.message}`);
    process.exit(1);
  }
}

copyBinaries();
