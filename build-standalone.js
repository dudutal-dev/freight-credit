#!/usr/bin/env node
/**
 * build-standalone.js
 * Compiles App.jsx → standalone HTML (no server needed)
 * Output: dist/freight-credit.html
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FRONTEND_SRC = path.join(ROOT, 'frontend', 'src', 'App.jsx');
const BUILD_DIR = path.join(ROOT, 'scripts', '.build');
const DIST_DIR = path.join(ROOT, 'dist');

console.log('🔨 Building standalone HTML...\n');

// 1. Ensure build dir
if (!fs.existsSync(BUILD_DIR)) fs.mkdirSync(BUILD_DIR, { recursive: true });
if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });

// 2. Read App.jsx and patch for standalone (localStorage instead of API)
let jsx = fs.readFileSync(FRONTEND_SRC, 'utf8');
jsx = jsx
  .replace(
    `import { useState, useMemo, useEffect, useCallback } from "react";`,
    `const { useState, useMemo, useEffect, useCallback } = React;`
  )
  .replace('export default function App(){', 'function App(){');

// Patch API calls → localStorage
jsx = jsx.replace(
  /async function dbGet\(key\)\{[\s\S]*?async function dbSet\(key, val\)\{[\s\S]*?\}\}/,
  `async function dbGet(key){try{const v=localStorage.getItem('fcm_'+key);return v?JSON.parse(v):null;}catch(e){return null;}}
async function dbSet(key,val){try{localStorage.setItem('fcm_'+key,JSON.stringify(val));}catch(e){if(e.name==='QuotaExceededError')alert('אחסון מלא');throw e;}}`
);
jsx = jsx.replace(
  /try\{\s*await fetch\('\/api\/kv\/' \+ encodeURIComponent\(PFX\+id\), \{method:'DELETE'\}\);\s*\}catch\(e\)\{\}/,
  `try{ localStorage.removeItem('fcm_'+PFX+id); }catch(e){}`
);

jsx += `\n\nReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));`;

const appJsxPath = path.join(BUILD_DIR, 'app.jsx');
fs.writeFileSync(appJsxPath, jsx);

// 3. Install Babel if needed
const babelDir = path.join(BUILD_DIR, 'node_modules');
if (!fs.existsSync(babelDir)) {
  console.log('📦 Installing Babel...');
  fs.writeFileSync(path.join(BUILD_DIR, 'package.json'), JSON.stringify({ private: true }));
  execSync(
    'npm install --save-dev @babel/core @babel/cli @babel/preset-react @babel/preset-env ' +
    '@babel/plugin-proposal-optional-chaining @babel/plugin-proposal-nullish-coalescing-operator ' +
    '@babel/plugin-proposal-logical-assignment-operators',
    { cwd: BUILD_DIR, stdio: 'inherit' }
  );
  fs.writeFileSync(path.join(BUILD_DIR, 'babel.config.json'), JSON.stringify({
    presets: [
      ['@babel/preset-react', { runtime: 'classic' }],
      ['@babel/preset-env', { targets: { browsers: ['last 3 years', 'ios >= 12'] }, modules: false }]
    ],
    plugins: [
      '@babel/plugin-proposal-optional-chaining',
      '@babel/plugin-proposal-nullish-coalescing-operator',
      '@babel/plugin-proposal-logical-assignment-operators'
    ]
  }));
}

// 4. Compile JSX
console.log('⚙️  Compiling JSX → JS...');
const compiledPath = path.join(BUILD_DIR, 'app.compiled.js');
execSync(`node_modules/.bin/babel app.jsx --out-file app.compiled.js`, { cwd: BUILD_DIR });

// Fix bare catch
let compiled = fs.readFileSync(compiledPath, 'utf8');
compiled = compiled.replace(/catch\s*\{/g, 'catch(e){');
fs.writeFileSync(compiledPath, compiled);

// 5. Download React if needed
function getReact(name, url) {
  const p = path.join(BUILD_DIR, name);
  if (!fs.existsSync(p)) {
    console.log(`⬇️  Downloading ${name}...`);
    execSync(`curl -sL "${url}" -o "${p}"`);
  }
  return fs.readFileSync(p, 'utf8');
}
const reactJs = getReact('react.min.js', 'https://unpkg.com/react@18/umd/react.production.min.js');
const reactDomJs = getReact('react-dom.min.js', 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js');

// 6. Build HTML
console.log('🏗️  Assembling HTML...');
const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <meta name="theme-color" content="#1B2E6B"/>
  <title>מודל אשראי | Fridenson</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:#E8EDF4;font-family:'Segoe UI','Arial Hebrew',Arial,sans-serif;}
    #root{min-height:100vh;}
    ::-webkit-scrollbar{width:6px;}::-webkit-scrollbar-thumb{background:#1B2E6B;border-radius:3px;}
    @keyframes spin{to{transform:rotate(360deg)}}
    input,select,textarea,button{font-family:inherit;}button{cursor:pointer;}
  </style>
</head>
<body>
  <div id="root"><div style="min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;"><div style="width:44px;height:44px;border:3px solid #B8C8DC;border-top-color:#1B2E6B;border-radius:50%;animation:spin 0.8s linear infinite;"></div><div style="font-size:13px;font-weight:700;color:#0D1E3D;">טוען...</div></div></div>
  <script>${reactJs}</script>
  <script>${reactDomJs}</script>
  <script>${compiled}</script>
</body>
</html>`;

const outPath = path.join(DIST_DIR, 'freight-credit.html');
fs.writeFileSync(outPath, html);

const kb = Math.round(fs.statSync(outPath).size / 1024);
console.log(`\n✅ Done! → dist/freight-credit.html (${kb}KB)`);
console.log('   Open in any browser — no server needed.');
