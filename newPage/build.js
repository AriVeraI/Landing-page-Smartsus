/**
 * build.js
 *
 * Builds the deployable site into public/:
 *  - .css / .js files are minified (clean-css / terser) and copied.
 *  - .html files are copied as-is, except local (non-CDN) <link href="...css">
 *    and <script src="...js"> references get a `?v=<contenthash>` query string
 *    appended, so browsers/CDNs bust their cache whenever the file's content
 *    actually changes.
 *  - Everything else (images, robots.txt, sitemap.xml, etc.) is copied as-is.
 *
 * This script does NOT delete files already in public/ that no longer exist
 * in the source (e.g. Firebase's own public/404.html). Run a manual cleanup
 * of public/ first if you need a fully clean rebuild.
 *
 * Usage:
 *   npm install   (first time only, installs clean-css + terser)
 *   node build.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const CleanCSS = require('clean-css');
const { minify: minifyJs } = require('terser');

const ROOT = __dirname;
const OUT_DIR = path.join(ROOT, 'public');

// Top-level files/dirs in ROOT that are never part of the deployable site.
const SKIP_TOP_LEVEL = new Set([
  'public',
  '.firebase',
  '.git',
  'node_modules',
  'ImgOriginales',
  'build.js',
  'package.json',
  'package-lock.json',
  'firebase.json',
  '.firebaserc',
  '.gitignore',
]);

function hashContent(content) {
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
}

// Pass 1: walk the source tree, minify+copy .css/.js, copy everything else
// as-is (except .html, handled in pass 2), and record a content hash for
// every css/js file keyed by its path relative to ROOT (posix-style).
async function copyAssets(srcDir, outDir, relBase, cssHashes, jsHashes) {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    if (relBase === '' && SKIP_TOP_LEVEL.has(entry.name)) continue;

    const srcPath = path.join(srcDir, entry.name);
    const outPath = path.join(outDir, entry.name);
    const rel = relBase ? `${relBase}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      fs.mkdirSync(outPath, { recursive: true });
      await copyAssets(srcPath, outPath, rel, cssHashes, jsHashes);
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();

    if (ext === '.html') {
      continue; // handled in pass 2, once all hashes are known
    }

    if (ext === '.css') {
      const source = fs.readFileSync(srcPath, 'utf8');
      const result = new CleanCSS({}).minify(source);
      if (result.errors.length) {
        throw new Error(`CSS minify error in ${rel}: ${result.errors.join('; ')}`);
      }
      fs.writeFileSync(outPath, result.styles);
      cssHashes.set(rel, hashContent(result.styles));
      continue;
    }

    if (ext === '.js') {
      const source = fs.readFileSync(srcPath, 'utf8');
      const result = await minifyJs(source, { compress: true, mangle: true });
      if (result.error) {
        throw new Error(`JS minify error in ${rel}: ${result.error}`);
      }
      const code = result.code ?? source;
      fs.writeFileSync(outPath, code);
      jsHashes.set(rel, hashContent(code));
      continue;
    }

    // Binary-safe copy for images, fonts, robots.txt, sitemap.xml, etc.
    fs.copyFileSync(srcPath, outPath);
  }
}

// Pass 2: copy .html files, rewriting local css/js references to include
// `?v=<hash>` using the hashes collected in pass 1.
function rewriteAndCopyHtml(srcDir, outDir, relBase, cssHashes, jsHashes) {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    if (relBase === '' && SKIP_TOP_LEVEL.has(entry.name)) continue;

    const srcPath = path.join(srcDir, entry.name);
    const outPath = path.join(outDir, entry.name);
    const rel = relBase ? `${relBase}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      rewriteAndCopyHtml(srcPath, outPath, rel, cssHashes, jsHashes);
      continue;
    }

    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.html') continue;

    const htmlDir = path.posix.dirname(rel); // '.' for a top-level file
    let html = fs.readFileSync(srcPath, 'utf8');

    html = html.replace(
      /(href|src)="([^"]+\.(?:css|js))(\?[^"]*)?"/g,
      (match, attr, url) => {
        if (/^https?:\/\//i.test(url)) return match; // leave CDN links untouched

        const resolved = path.posix.normalize(path.posix.join(htmlDir, url));
        const hash = url.endsWith('.css') ? cssHashes.get(resolved) : jsHashes.get(resolved);
        if (!hash) return match; // unknown/external file, leave untouched

        return `${attr}="${url}?v=${hash}"`;
      }
    );

    fs.writeFileSync(outPath, html);
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const cssHashes = new Map();
  const jsHashes = new Map();

  await copyAssets(ROOT, OUT_DIR, '', cssHashes, jsHashes);
  rewriteAndCopyHtml(ROOT, OUT_DIR, '', cssHashes, jsHashes);

  console.log(`Build complete -> ${OUT_DIR}`);
  console.log(`  ${cssHashes.size} CSS file(s), ${jsHashes.size} JS file(s) minified and versioned.`);
}

main().catch((err) => {
  console.error('Build failed:', err.message);
  process.exit(1);
});
