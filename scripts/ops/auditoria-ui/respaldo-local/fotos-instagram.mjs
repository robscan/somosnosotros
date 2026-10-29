// OL-477 (bitácora 509): las portadas inventadas de la semana de Instagram (`RESPALDO_INSTAGRAM_SEMANA=1`, sobre el historial grande), en la misma
// carpeta que `fotos-historial.mjs` (el respaldo las sirve desde `RESPALDO_CARRUSEL_DIR` como `demo-carrusel/<nombre>.jpg`): la obra de tres
// artistas en 3:2, dibujada aquí (el paisaje del altiplano de una pintora, una guitarra y una página de fanzine). Nada sale de la red.
//   await dibujarFotosInstagram(carpeta)  →  la lista de archivos
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(new URL("../../../../node_modules/", import.meta.url));
const sharp = require("sharp");

const PORTADAS = {
  // Renata Saldaña: el altiplano al atardecer, tierra roja y dos palmas.
  "ig-renata-portada": `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><defs><linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6b35e"/><stop offset="0.55" stop-color="#e2694a"/><stop offset="1" stop-color="#8e3b46"/></linearGradient></defs><rect width="900" height="600" fill="url(#c)"/><circle cx="620" cy="300" r="90" fill="#ffe3a3"/><path d="M0 360 C180 320 320 380 480 350 C640 320 760 360 900 340 L900 600 L0 600 Z" fill="#a8452f"/><path d="M0 430 C200 400 420 450 620 420 C760 400 840 430 900 420 L900 600 L0 600 Z" fill="#7a2e22"/><g fill="#3b1a14"><rect x="196" y="250" width="12" height="190"/><path d="M202 250 l-70 -30 l66 10 l-40 -60 l50 54 l8 -70 l10 70 l50 -54 l-40 60 l66 -10 z"/><rect x="706" y="300" width="9" height="130"/><path d="M710 300 l-50 -22 l48 7 l-28 -44 l36 40 l6 -50 l8 50 l36 -40 l-28 44 l48 -7 z"/></g></svg>`,
  // Íñigo Montalvo: la boca de una guitarra y sus cuerdas, en madera.
  "ig-inigo-portada": `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#5a3418"/><g fill="#6e4220"><rect y="40" width="900" height="26"/><rect y="150" width="900" height="14"/><rect y="270" width="900" height="30"/><rect y="420" width="900" height="18"/><rect y="520" width="900" height="34"/></g><circle cx="450" cy="300" r="190" fill="#d9a35b"/><circle cx="450" cy="300" r="150" fill="#2a1a0c"/><circle cx="450" cy="300" r="172" fill="none" stroke="#3b2410" stroke-width="10"/><g stroke="#f2e6cf" stroke-width="3"><line x1="0" y1="228" x2="900" y2="228"/><line x1="0" y1="256" x2="900" y2="256"/><line x1="0" y1="286" x2="900" y2="286"/><line x1="0" y1="314" x2="900" y2="314"/><line x1="0" y1="344" x2="900" y2="344"/><line x1="0" y1="372" x2="900" y2="372"/></g></svg>`,
  // Colectivo Nube de Papel: una página de fanzine, nubes recortadas y puntos de imprenta.
  "ig-nube-portada": `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><defs><pattern id="p" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="9" cy="9" r="3.2" fill="#1f3d8f" fill-opacity="0.35"/></pattern></defs><rect width="900" height="600" fill="#f4efe2"/><rect width="900" height="600" fill="url(#p)"/><g fill="#ffffff" stroke="#1f3d8f" stroke-width="8"><path d="M140 300 a70 70 0 0 1 120 -60 a90 90 0 0 1 170 20 a60 60 0 0 1 40 110 l-300 0 a55 55 0 0 1 -30 -70 z"/><path d="M520 200 a50 50 0 0 1 90 -40 a70 70 0 0 1 130 20 a45 45 0 0 1 30 80 l-230 0 a40 40 0 0 1 -20 -60 z"/></g><rect x="560" y="360" width="230" height="150" fill="#ff5a4e" transform="rotate(-6 675 435)"/><rect x="110" y="430" width="300" height="34" fill="#1f3d8f"/><rect x="110" y="480" width="210" height="34" fill="#1f3d8f"/></svg>`,
};

export async function dibujarFotosInstagram(carpeta) {
  const hechos = [];
  for (const [nombre, svg] of Object.entries(PORTADAS)) {
    const archivo = path.join(carpeta, `${nombre}.jpg`);
    await sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toFile(archivo);
    hechos.push(archivo);
  }
  return hechos;
}
