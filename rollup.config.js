import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { execSync } from "child_process";
import fs from 'fs';
import path from 'path';

// --- per-project .env loader (wins over shell env) ---
const envFile = path.resolve('.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i);
    if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const prod = process.env.NODE_ENV === 'production';

// 确保 dist 目录存在
const distDir = 'dist';
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 定义需要复制到 dist 目录的文件
const filesToCopy = ['manifest.json', 'styles.css', 'data.json'];

// 复制文件的插件
const copyFilesPlugin = {
  name: 'copy-files',
  buildEnd() {
    filesToCopy.forEach(file => {
      if (fs.existsSync(file)) {
        const dest = path.join(distDir, path.basename(file));
        fs.copyFileSync(file, dest);
        console.log(`Copied ${file} to ${dest}`);
      } else {
        console.warn(`File ${file} not found, skipping copy`);
      }
    });
  }
};

// --- Obsidian vault sync (dev-only) ---
const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
const pluginPath = process.env.OBSIDIAN_PLUGIN_PATH
  || (vaultPath ? path.join(vaultPath, '.obsidian', 'plugins', 'obsidian-image-auto-upload-plugin') : null);

const syncToObsidian = () => {
  if (!pluginPath) return;
  if (!fs.existsSync(pluginPath)) fs.mkdirSync(pluginPath, { recursive: true });
  try {
    execSync(`rsync -a -q --exclude data.json dist/ "${pluginPath}/"`, { stdio: 'pipe' });
    fs.writeFileSync(path.join(pluginPath, '.hotreload'), '');
    console.log(`✅ Synced → ${pluginPath}`);
  } catch (e) {
    console.error('❌ Sync failed:', e.message);
  }
};

const obsidianSyncPlugin = {
  name: 'obsidian-sync',
  writeBundle() {
    if (!prod) syncToObsidian();
  },
};

export default {
  input: "src/main.ts",
  output: {
    file: path.join(distDir, 'main.js'),
    sourcemap: "inline",
    format: "cjs",
    exports: "default",
  },
  external: ["obsidian", "electron"],
  plugins: [typescript(), nodeResolve({ browser: false }), commonjs(), json(), copyFilesPlugin, obsidianSyncPlugin],
};
