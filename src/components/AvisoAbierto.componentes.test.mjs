// OL-480 (bitácora 512): abrir la app desde un aviso cuenta una vez, sin saber quién, y limpia la dirección. Componente real (`AvisoAbierto`) en
// Chrome, con `next/navigation` de mentira y el conteo de la base interceptado (nunca sale de 127.0.0.1).
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../../', import.meta.url));
let dir, server, browser, origin;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ol480-componentes-'));
  const mocks = {
    'next/navigation': "export function usePathname(){return location.pathname} export function useSearchParams(){return new URLSearchParams(location.search)}",
    '@vercel/analytics': 'export function track(){}',
  };
  await build({ absWorkingDir: root, bundle: true, outfile: join(dir, 'app.js'), jsx: 'automatic', stdin: { resolveDir: root, loader: 'tsx', contents: `
    import React from 'react';import {createRoot} from 'react-dom/client';
    import AvisoAbierto from './src/components/AvisoAbierto';
    createRoot(document.getElementById('root')).render(<AvisoAbierto/>);
  ` }, plugins: [{ name: 'dobles', setup(b) {
    b.onResolve({ filter: /^(next\/navigation|@vercel\/analytics)$/ }, a => ({ path: a.path, namespace: 'doble' }));
    b.onLoad({ filter: /.*/, namespace: 'doble' }, a => ({ contents: mocks[a.path], loader: 'tsx', resolveDir: root }));
  } }] });
  const js = await readFile(join(dir, 'app.js'));
  // Toda ruta sirve la misma página; `?rol=` decide la marca del layout (`MarcaAdmin`): «otro», «admin» o ninguna (llega tarde).
  server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/app.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(js); return; }
    const rol = url.searchParams.get('rol');
    const marca = rol === 'tarde' ? '<script>setTimeout(()=>{const i=document.createElement("i");i.hidden=true;i.setAttribute("data-medir-rol","otro");document.body.append(i)},800)</script>'
      : rol ? `<i hidden data-medir-rol="${rol}"></i>` : '';
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div>${marca}<script src="/app.js"></script>`);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  origin = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright-core');
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
});
after(async () => { await browser?.close(); if (server) await new Promise(r => server.close(r)); if (dir) await rm(dir, { recursive: true, force: true }); });

async function abrir(ruta) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const conteos = [];
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  await page.route('**/api/avisos/abierto', async r => { conteos.push({ cuerpo: r.request().postDataJSON() }); await r.fulfill({ status: 204 }); });
  await page.goto(origin + ruta);
  return { context, page, conteos, errores };
}

test('desde un aviso: cuenta una vez con el tipo y nada más, y la dirección queda limpia', async t => {
  const { context, page, conteos, errores } = await abrir('/eventos/noche?rol=otro&ciudad=queretaro&desde=aviso&tipo=recordatorio#mapa');
  t.after(() => context.close());
  await page.waitForFunction(() => !location.search.includes('desde='));
  assert.equal(new URL(page.url()).pathname + new URL(page.url()).search + new URL(page.url()).hash, '/eventos/noche?rol=otro&ciudad=queretaro#mapa');
  await page.waitForTimeout(400);
  assert.deepEqual(conteos.map(c => c.cuerpo), [{ tipo: 'recordatorio' }], 'un solo conteo, solo el tipo');
  assert.equal(await page.evaluate(() => history.length), 2, 'limpiar no apila una pantalla (la hoja en blanco de la prueba y la página)');
  await page.reload();
  await page.waitForTimeout(600);
  assert.equal(conteos.length, 1, 'recargar no cuenta otra vez');
  assert.deepEqual(errores, []);
});

test('la administración no se cuenta, pero su dirección también se limpia', async t => {
  const { context, page, conteos } = await abrir('/?rol=admin&desde=aviso&tipo=nuevo');
  t.after(() => context.close());
  await page.waitForFunction(() => !location.search.includes('desde='));
  await page.waitForTimeout(500);
  assert.deepEqual(conteos, []);
});

test('si la marca de quién mira llega tarde, espera a ella y cuenta', async t => {
  const { context, page, conteos } = await abrir('/?rol=tarde&desde=aviso&tipo=cambio');
  t.after(() => context.close());
  await page.waitForTimeout(300);
  assert.deepEqual(conteos, [], 'todavía no: no se sabe quién mira');
  await page.waitForFunction(() => document.querySelector('[data-medir-rol]'));
  await page.waitForTimeout(500);
  assert.deepEqual(conteos.map(c => c.cuerpo), [{ tipo: 'cambio' }]);
});

test('un tipo que no está en la lista no se cuenta; sin `desde=aviso`, nada cambia', async t => {
  const a = await abrir('/?rol=otro&desde=aviso&tipo=fulano');
  t.after(() => a.context.close());
  await a.page.waitForFunction(() => !location.search.includes('desde='));
  await a.page.waitForTimeout(400);
  assert.deepEqual(a.conteos, []);
  const b = await abrir('/agenda?rol=otro&tipo=nuevo');
  t.after(() => b.context.close());
  await b.page.waitForTimeout(400);
  assert.equal(new URL(b.page.url()).search, '?rol=otro&tipo=nuevo');
  assert.deepEqual(b.conteos, []);
});
