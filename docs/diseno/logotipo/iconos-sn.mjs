// Favicon, iconos de instalación e insignia de avisos a partir del símbolo SN final del founder
// (LogoFinal/SN - Symbol.svg). Fondo blanco opaco en todos los iconos: iOS pinta oscuro lo transparente
// (visto en el iPhone del founder el 2026-09-16). Uso, desde la raíz del repo:  node docs/diseno/logotipo/iconos-sn.mjs
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const simbolo = fs.readFileSync(path.join(raiz, "docs/diseno/logotipo/LogoFinal/SN - Symbol.svg"), "utf8");
const [, vbx, vby, vbw, vbh] = simbolo.match(/viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/).map(Number);
const d = simbolo.match(/ d="([^"]+)"/)[1];
const TINTA = "#1a1a1a", BLANCO = "#ffffff";

/** Lienzo cuadrado de `px` con el símbolo centrado. `relleno`: margen por lado (fracción). `seguro`: diagonal del símbolo
 *  como fracción del lado (icono adaptable de Android: el dibujo cabe en el círculo seguro). */
function lienzo(px, { relleno = 0.14, seguro = null, fondo = BLANCO, tinta = TINTA } = {}) {
  const s = seguro ? (seguro * px) / Math.hypot(vbw, vbh) : Math.min((px * (1 - 2 * relleno)) / vbw, (px * (1 - 2 * relleno)) / vbh);
  const w = vbw * s, h = vbh * s, x = (px - w) / 2, y = (px - h) / 2;
  const rect = fondo ? `<rect width="${px}" height="${px}" fill="${fondo}"/>` : "";
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">${rect}` +
      `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${vbx} ${vby} ${vbw} ${vbh}"><path fill="${tinta}" d="${d}"/></svg></svg>`,
  );
}
const png = (svg) => sharp(svg).png({ compressionLevel: 9 }).toBuffer();

/** ICO con capas PNG (lo que hacía iconos.py). */
function ico(capas) {
  const cab = Buffer.alloc(6); cab.writeUInt16LE(0, 0); cab.writeUInt16LE(1, 2); cab.writeUInt16LE(capas.length, 4);
  let off = 6 + 16 * capas.length; const ent = [], dat = [];
  for (const [t, b] of capas) {
    const e = Buffer.alloc(16); e.writeUInt8(t, 0); e.writeUInt8(t, 1); e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(b.length, 8); e.writeUInt32LE(off, 12);
    ent.push(e); dat.push(b); off += b.length;
  }
  return Buffer.concat([cab, ...ent, ...dat]);
}

const salida = (rel, buf) => { fs.writeFileSync(path.join(raiz, rel), buf); console.log(rel, buf.length, "bytes"); };

const capas = [];
for (const t of [16, 32, 48]) capas.push([t, await png(lienzo(t, { relleno: t <= 32 ? 0.04 : 0.06 }))]);
salida("src/app/favicon.ico", ico(capas));
salida("public/apple-touch-icon.png", await png(lienzo(180)));
salida("public/icono-192.png", await png(lienzo(192)));
salida("public/icono-512.png", await png(lienzo(512)));
salida("public/icono-maskable-512.png", await png(lienzo(512, { seguro: 0.72 })));
// Insignia de Android: silueta blanca sobre transparente (Android solo usa el canal alfa).
salida("public/icono-aviso.png", await png(lienzo(96, { relleno: 0.06, fondo: null, tinta: BLANCO })));

// Hoja de revisión: pestaña clara y oscura con el favicon a tamaño real y ampliado; inicio de iPhone claro y oscuro;
// icono adaptable con su círculo seguro.
const W = 1320, H = 560, capa = (t) => capas.find(([k]) => k === t)[1];
const comp = [];
const rr = (x, y, w, h, r, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
let fondo = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/>`;
fondo += rr(10, 10, 300, 250, 0, "#dee1e6") + rr(10, 280, 300, 250, 0, "#35363a") + rr(330, 10, 560, 540, 0, "#5e7b8c") + rr(910, 10, 400, 400, 0, "#eee") + `<circle cx="1110" cy="210" r="160" fill="none" stroke="#b3261e" stroke-width="2"/></svg>`;
for (const [k, oy] of [[0, 10], [1, 280]]) {
  let x = 24;
  for (const t of [16, 32, 48]) {
    comp.push({ input: capa(t), left: x, top: oy + 14 });
    const big = t < 48 ? t * 3 : 96;
    comp.push({ input: await sharp(capa(t)).resize(big, big, { kernel: "nearest" }).toBuffer(), left: x, top: oy + 70 });
    x += big + 16;
  }
}
const apple = await png(lienzo(180));
const redondo = async (buf, size, r) => sharp(buf).resize(size, size).composite([{ input: Buffer.from(`<svg><rect width="${size}" height="${size}" rx="${r}"/></svg>`), blend: "dest-in" }]).png().toBuffer();
comp.push({ input: await redondo(apple, 180, 40), left: 370, top: 60 });
comp.push({ input: await redondo(apple, 60, 13), left: 590, top: 60 });
for (const [i, c] of ["#e9b949", "#3a8d5c", "#d9534f"].entries()) comp.push({ input: Buffer.from(`<svg width="60" height="60"><rect width="60" height="60" rx="13" fill="${c}"/></svg>`), left: 590 + ((i + 1) % 2) * 80, top: 60 + Math.floor((i + 1) / 2) * 80 });
comp.push({ input: await sharp(await png(lienzo(512, { seguro: 0.72 }))).resize(400, 400).toBuffer(), left: 910, top: 10 });
comp.push({ input: await redondo(await png(lienzo(512, { seguro: 0.72 })), 180, 90), left: 370, top: 300 });
// Insignia sobre gris oscuro (como la barra de estado de Android)
comp.push({ input: Buffer.from(`<svg width="120" height="120"><rect width="120" height="120" fill="#333"/></svg>`), left: 600, top: 300 });
comp.push({ input: await png(lienzo(96, { relleno: 0.06, fondo: null, tinta: BLANCO })), left: 612, top: 312 });
await sharp(Buffer.from(fondo)).composite(comp).png().toFile(path.join(raiz, "docs/diseno/logotipo/iconos-revision.png"));
console.log("docs/diseno/logotipo/iconos-revision.png");
