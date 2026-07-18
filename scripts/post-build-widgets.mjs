import fs from 'node:fs';
import path from 'node:path';

let outDir = path.resolve('src', 'widgets', 'out');
if (!fs.existsSync(outDir)) {
  outDir = path.resolve('out');
}

if (!fs.existsSync(outDir)) {
  console.error(`Out directory not found at resolved paths.`);
  process.exit(1);
}

const files = fs.readdirSync(outDir).filter(f => f.endsWith('.html'));

for (const file of files) {
  const htmlPath = path.join(outDir, file);
  let html = fs.readFileSync(htmlPath, 'utf8');
  console.log(`Processing and base64-inlining assets for ${file}...`);

  // Remove any previously injected base tags to start clean
  html = html.replace(/<base[^>]*>/g, '');

  // 1. Inline CSS stylesheets
  html = html.replace(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/g, (match, href) => {
    try {
      const cleanHref = href.startsWith('/') ? href.slice(1) : href.startsWith('./') ? href.slice(2) : href;
      const cssPath = path.join(outDir, cleanHref);
      if (fs.existsSync(cssPath)) {
        const css = fs.readFileSync(cssPath, 'utf8');
        return `<style>${css}</style>`;
      }
    } catch (err) {
      console.warn(`  Failed to inline CSS: ${href}`, err);
    }
    return match;
  });

  // 2. Inline Javascript via base64 data: URL
  html = html.replace(/<script([^>]*)src=["']([^"']+)["']([^>]*)><\/script>/g, (match, before, src, after) => {
    try {
      const cleanSrc = src.startsWith('/') ? src.slice(1) : src.startsWith('./') ? src.slice(2) : src;
      const jsPath = path.join(outDir, cleanSrc);
      if (fs.existsSync(jsPath)) {
        const jsBuffer = fs.readFileSync(jsPath);
        const base64Js = jsBuffer.toString('base64');
        return `<script${before}src="data:text/javascript;base64,${base64Js}"${after}></script>`;
      }
    } catch (err) {
      console.warn(`  Failed to inline JS: ${src}`, err);
    }
    return match;
  });

  // 3. Remove preload and prefetch link tags
  html = html.replace(/<link[^>]*rel=["'](preload|prefetch)["'][^>]*>/g, '');

  fs.writeFileSync(htmlPath, html, 'utf8');
}
console.log('All widgets successfully post-processed and base64-inlined!');
