// App Next compilada y datos locales inventados. Mixcloud carga de verdad dentro del iframe;
// no se pulsa Play ni se publica/edita ninguna fila, ni siquiera en el respaldo.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cookie } from '../../../scripts/ops/auditoria-ui/respaldo-local/fixture.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const aqui = fileURLToPath(new URL('./', import.meta.url));
const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:49780',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'llave-inventada', NEXT_PUBLIC_MAPBOX_TOKEN: 'pk.inventado' };
const hijos = [];
function iniciar(args) {
  const h = spawn(process.execPath, args, { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; h.stdout.on('data', b => log += b); h.stderr.on('data', b => log += b);
  h.log = () => log; hijos.push(h); return h;
}
async function listo(url, h) {
  for (let i = 0; i < 150; i++) {
    if (h.exitCode !== null) throw Error(h.log());
    try { if ((await fetch(url)).status < 500) return; } catch { /* aún inicia */ }
    await new Promise(r => setTimeout(r, 200));
  }
  throw Error('No inició: ' + url + h.log());
}
const db = iniciar([aqui + 'respaldo.mjs', '49780']);
await listo('http://127.0.0.1:49780/rest/v1/artistas?select=id', db);
const app = iniciar([root + 'node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '30480']);
await listo('http://127.0.0.1:30480/', app);
if (process.argv.includes('--servidor')) {
  console.log('QA local lista: http://127.0.0.1:30482/ (sesión inventada)');
  const parar = () => { hijos.forEach(h => h.kill()); process.exit(); };
  process.on('SIGINT', parar); process.on('SIGTERM', parar);
} else {
  const { chromium } = await import(pathToFileURL(root + 'node_modules/playwright-core/index.mjs').href);
  let browser;
  const salida = { fuente: 'Next16.3.8 real; perfil/sesión/fila inventados; iframe Mixcloud real sin reproducción',
    url: 'https://www.mixcloud.com/robscan/randomatic-oct-26/', casos: [], errores: [] };
  try {
    browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
    for (const width of [320, 390]) {
      const c = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
      await c.addCookies([{ name: 'sb-127-auth-token', value: cookie, url: 'http://127.0.0.1:30480' }]);
      const p = await c.newPage(); p.setDefaultTimeout(30000);
      p.on('pageerror', e => salida.errores.push(e.message));
      await p.route('**/_next/image?*', r => r.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#aca89b"/></svg>' }));
      for (const modo of ['nueva', 'editar', 'ficha', 'recarga']) {
        const ruta = modo === 'nueva' ? '/artistas/robscan/novedades/nueva' : modo === 'editar'
          ? '/artistas/robscan/novedades/dddd0280-0000-4000-8000-000000000001/editar' : '/artistas/robscan';
        if (modo === 'recarga') await p.reload(); else await p.goto('http://127.0.0.1:30480' + ruta);
        await p.locator('main h1').waitFor();
        if (modo === 'nueva') {
          await p.getByLabel('Enlace de la novedad', { exact: true }).fill(salida.url);
          await p.getByRole('textbox', { name: 'Título (opcional)', exact: true }).click();
        }
        const frame = p.locator('iframe[title="Audio de Robscan en Mixcloud"]');
        await frame.scrollIntoViewIfNeeded();
        const src = await frame.getAttribute('src');
        assert.equal(new URL(src).searchParams.get('feed'), '/robscan/randomatic-oct-26/');
        const widget = p.frameLocator('iframe[title="Audio de Robscan en Mixcloud"]');
        await widget.getByRole('link', { name: 'Randomatic Oct 26', exact: true }).first().waitFor();
        assert.equal(await widget.getByText("Sorry we can't find that content", { exact: true }).count(), 0);
        await widget.getByText('00:00', { exact: true }).waitFor();
        const proveedor = p.frames().find(f => f.url().startsWith('https://player-widget.mixcloud.com/'));
        await proveedor.waitForLoadState('load');
        await proveedor.waitForFunction(() => [...document.images].every(img => img.complete && img.naturalWidth > 0));
        await proveedor.waitForFunction(() => {
          let el = [...document.querySelectorAll('a')].find(a => a.textContent.trim() === 'Randomatic Oct 26');
          if (!el) return false;
          for (; el; el = el.parentElement) {
            const s = getComputedStyle(el);
            if (Number(s.opacity) < 0.99 || s.visibility === 'hidden' || s.display === 'none') return false;
          }
          return true;
        });
        await proveedor.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity));
        await proveedor.evaluate(async () => {
          await document.fonts.ready;
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        });
        await p.evaluate(async () => { await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
        await frame.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
        const medidas = await frame.evaluate(el => ({ x: el.getBoundingClientRect().x, ancho: el.getBoundingClientRect().width,
          documento: document.documentElement.scrollWidth, fuente: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family) }));
        assert.equal(medidas.documento, width);
        assert.ok(medidas.x >= 0 && medidas.x + medidas.ancho <= width);
        if (modo === 'editar') assert.equal(await p.getByLabel('Enlace de la novedad', { exact: true }).inputValue(), salida.url.replace(/\/$/, ''));
        salida.casos.push({ width, modo, src, ...medidas, reproductor: 'Randomatic Oct 26, 00:00' });
        // El DOM del proveedor ya está listo; dar tiempo también a su superficie del iframe en Chrome headless.
        await p.waitForTimeout(1000);
        await p.screenshot({ path: aqui + modo + '-' + width + '.png', animations: 'disabled' });
      }
      await c.close();
    }
    assert.deepEqual(salida.errores, []);
    fs.writeFileSync(aqui + 'qa.json', JSON.stringify(salida, null, 2) + '\n');
    console.log(JSON.stringify(salida));
  } finally {
    await browser?.close(); hijos.forEach(h => h.kill());
    for (let i = 0; i < hijos.length; i++) fs.writeFileSync('/private/tmp/sn-ol280/qa-proceso-' + i + '.log', hijos[i].log());
  }
}
