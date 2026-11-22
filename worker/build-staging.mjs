import { mkdir, readFile, writeFile } from 'node:fs/promises';

const [origin, sheetId, serviceAccount] = process.argv.slice(2);
if (!/^https:\/\/[a-z0-9-]+-staging\.[a-z0-9-]+\.workers\.dev$/.test(origin ?? '') ||
    !/^[\w-]+$/.test(sheetId ?? '') ||
    !/^[a-z0-9-]+-staging@[a-z0-9-]+\.iam\.gserviceaccount\.com$/.test(serviceAccount ?? '')) {
  throw new Error('Usage: node build-staging.mjs <staging-origin> <test-sheet-id> <staging-service-account-email>');
}

function replaceExactly(text, oldText, newText) {
  if (text.split(oldText).length !== 2) {
    throw new Error('Unexpected staging source markup: ' + oldText);
  }
  return text.replace(oldText, newText);
}

const read = (path, encoding) => readFile(new URL('../' + path, import.meta.url), encoding);
let index = await read('index.html', 'utf8');
index = replaceExactly(index, 'data-api-url=""', 'data-api-url="' + origin + '"');
index = replaceExactly(index, '<title>GSI Calculator — DVS Clay</title>', '<title>DVS GSI Calculator · Staging</title>');
index = replaceExactly(index, '<link rel="manifest" href="./manifest.webmanifest">', '');
index = replaceExactly(index, '<main class="wrap">',
  '<main class="wrap"><p class="note"><strong>STAGING. Gunakan rekod ujian sahaja.</strong></p>');

let app = await read('app.mjs', 'utf8');
app = replaceExactly(app, "if ('serviceWorker' in navigator) {",
  "if (false && 'serviceWorker' in navigator) {");
const assets = {
  '/index.html': { type: 'text/html; charset=utf-8', text: index },
  '/app.mjs': { type: 'text/javascript; charset=utf-8', text: app },
  '/record.mjs': { type: 'text/javascript; charset=utf-8', text: await read('record.mjs', 'utf8') },
  '/assets/icon.svg': { type: 'image/svg+xml', text: await read('assets/icon.svg', 'utf8') },
  '/assets/logo-dvs.webp': { type: 'image/webp', base64: (await read('assets/logo-dvs.webp')).toString('base64') },
};

const output = new URL('./.wrangler/', import.meta.url);
await mkdir(output, { recursive: true });
const site = JSON.stringify({ origin, sheetId, serviceAccount, assets });
await writeFile(new URL('staging-entry.mjs', output),
  'import { createStagingWorker } from "../staging.mjs";\nexport default createStagingWorker(' + site + ');\n');
