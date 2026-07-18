import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const cssPath = path.join(projectRoot, 'src/widgets/app/globals.css');
const outputDir = path.join(projectRoot, 'src/widgets/out');
const marker = 'data-quick-tds-widget-styles';
const css = await readFile(cssPath, 'utf8');
const styleTag = `<style ${marker}>\n${css}\n</style>`;
const styleTagPattern = new RegExp(`<style ${marker}>[\\s\\S]*?<\\/style>\\s*`, 'g');
const files = await readdir(outputDir, { withFileTypes: true });
const widgetFiles = files.filter((file) => file.isFile() && file.name.endsWith('.html'));

if (widgetFiles.length === 0) {
  throw new Error(`No widget HTML files found in ${outputDir}`);
}

await Promise.all(widgetFiles.map(async (file) => {
  const filePath = path.join(outputDir, file.name);
  const html = await readFile(filePath, 'utf8');
  const withoutPreviousStyles = html.replace(styleTagPattern, '');

  if (!/<\/head>/i.test(withoutPreviousStyles)) {
    throw new Error(`Widget HTML has no closing head tag: ${filePath}`);
  }

  const updatedHtml = withoutPreviousStyles.replace(/<\/head>/i, `${styleTag}\n</head>`);
  await writeFile(filePath, updatedHtml, 'utf8');
}));

console.log(`Inlined widget CSS into ${widgetFiles.length} HTML file(s).`);
