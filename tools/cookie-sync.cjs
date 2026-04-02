const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const { chromium } = require('playwright');

  const args = process.argv.slice(2);
  const getArg = (name) => {
    const idx = args.indexOf(name);
    if (idx === -1) return undefined;
    const val = args[idx + 1];
    return val && !val.startsWith('--') ? val : undefined;
  };

  const port = Number(getArg('--port') || process.env.CHROME_CDP_PORT || 9222);
  const outFile =
    getArg('--out') ||
    process.env.COOKIE_SYNC_OUT ||
    path.join('data', 'cookies', 'simpleszap.json');

  const defaultUrls = [
    'https://www.simpleszap.com',
    'https://simpleszap.com',
    'https://back.simpleszap.com',
    'https://dashboard.clerk.com',
    'https://vercel.com',
    'https://app.asaas.com',
  ];

  const urls = (process.env.COOKIE_SYNC_URLS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const targetUrls = urls.length ? urls : defaultUrls;

  const browser = await chromium.connectOverCDP(`http://localhost:${port}`);
  const context = browser.contexts()[0] || (await browser.newContext());

  const cookies = await context.cookies(targetUrls);

  const outDir = path.dirname(outFile);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(cookies, null, 2), 'utf8');

  await browser.close();

  process.stdout.write(`Saved ${cookies.length} cookies to ${outFile}\n`);
}

main().catch((error) => {
  process.stderr.write(String(error?.stack || error) + '\n');
  process.exit(1);
});

