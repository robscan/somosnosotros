/**
 * Imágenes de prueba para las pruebas de componentes de OL-352 (bitácora 383), hechas con el lienzo de Chrome: nada de terceros.
 * - `capturaPng`: una «captura de pantalla» PNG de 1290×2796 (la del iPhone) con la foto de un carrusel, texto y barras: ~6-9 MB, como la
 *   que el founder no pudo subir.
 * - `fotoGirada`: una JPEG de 2400×1800 con la etiqueta EXIF «girar 90°» (orientación 6): se ve vertical (1800×2400).
 * Y `navegadorDoble`, el Storage de mentira que mide en la página lo que se subió.
 */
export async function capturaPng(browser) {
  const p = await browser.newPage();
  try {
    const b64 = await p.evaluate(async (grano) => {
      const ancho = 1290;
      const alto = 2796;
      const c = document.createElement("canvas");
      c.width = ancho;
      c.height = alto;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, ancho, alto);
      // La «foto» del carrusel: degradados con sol y cerros, y grano fino como el de una foto de verdad.
      const fotoY = 420;
      const fotoAlto = 1612;
      const cielo = ctx.createLinearGradient(0, fotoY, 0, fotoY + fotoAlto);
      cielo.addColorStop(0, "#1d3b6b");
      cielo.addColorStop(0.55, "#e9864a");
      cielo.addColorStop(1, "#3c2a1e");
      ctx.fillStyle = cielo;
      ctx.fillRect(0, fotoY, ancho, fotoAlto);
      ctx.fillStyle = "#ffd36b";
      ctx.beginPath();
      ctx.arc(860, fotoY + 700, 180, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2a1f18";
      ctx.beginPath();
      ctx.moveTo(0, fotoY + 1200);
      for (let x = 0; x <= ancho; x += 40) ctx.lineTo(x, fotoY + 1100 + Math.sin(x / 130) * 90);
      ctx.lineTo(ancho, fotoY + fotoAlto);
      ctx.lineTo(0, fotoY + fotoAlto);
      ctx.fill();
      const img = ctx.getImageData(0, fotoY, ancho, fotoAlto);
      let semilla = 7;
      const azar = () => (semilla = (semilla * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
      for (let i = 0; i < img.data.length; i += 4) {
        img.data[i] += (azar() - 0.5) * grano;
        img.data[i + 1] += (azar() - 0.5) * grano;
        img.data[i + 2] += (azar() - 0.5) * grano;
      }
      ctx.putImageData(img, 0, fotoY);
      // Barras y texto de la app.
      ctx.fillStyle = "#111";
      ctx.font = "bold 44px Arial";
      ctx.fillText("centro_cultural", 150, 360);
      ctx.font = "38px Arial";
      for (let i = 0; i < 12; i++) ctx.fillText("Texto del pie de la publicación, renglón " + (i + 1), 40, 2120 + i * 52);
      const blob = await new Promise((r) => c.toBlob(r, "image/png"));
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let s = "";
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(s);
    }, GRANO);
    return Buffer.from(b64, "base64");
  } finally {
    await p.close();
  }
}

/**
 * Una JPEG de 2400×1800 (mitad de arriba roja, de abajo azul) con EXIF de orientación 6: el teléfono la tomó de lado. Bien girada (90° a la
 * derecha) es vertical y su esquina de arriba a la izquierda es azul; sin girar sería horizontal con esa esquina roja.
 */
export async function fotoGirada(browser) {
  const p = await browser.newPage();
  try {
    const b64 = await p.evaluate(async () => {
      const c = document.createElement("canvas");
      c.width = 2400;
      c.height = 1800;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#e00";
      ctx.fillRect(0, 0, 2400, 900);
      ctx.fillStyle = "#00e";
      ctx.fillRect(0, 900, 2400, 900);
      const jpeg = new Uint8Array(await (await new Promise((r) => c.toBlob(r, "image/jpeg", 0.9))).arrayBuffer());
      // Segmento APP1 con un TIFF mínimo (big-endian) y una sola etiqueta: Orientation (0x0112) = 6.
      const tiff = [0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, 0, 0, 0, 0];
      const cuerpo = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
      const app1 = [0xff, 0xe1, (cuerpo.length + 2) >> 8, (cuerpo.length + 2) & 0xff, ...cuerpo];
      const out = new Uint8Array(jpeg.length + app1.length);
      out.set(jpeg.subarray(0, 2));
      out.set(app1, 2);
      out.set(jpeg.subarray(2), 2 + app1.length);
      let s = "";
      for (const b of out) s += String.fromCharCode(b);
      return btoa(s);
    });
    return Buffer.from(b64, "base64");
  } finally {
    await p.close();
  }
}

/** Grano de la foto de la captura (±32 de 255, por canal): con él, el PNG pesa como una captura real del carrusel. */
const GRANO = 64;

/**
 * El doble de `clienteNavegador` para las pruebas que suben de verdad (`window.qa.real`; sin él, null como sin Supabase): Storage guarda lo
 * que llega y lo mide en la página (`window.qa.storage`: peso, tipo, ancho, alto y el color de la esquina de arriba a la izquierda), y puede esperar a
 * `window.qa.liberarStorage()` si `window.qa.esperaStorage` (para ver la espera en pantalla). Con `window.qa.verSubida` la dirección pública
 * es la de lo subido (blob:), para que las capturas enseñen la imagen ya preparada.
 */
export const navegadorDoble = `
  export function clienteNavegador(){
    const q = window.qa;
    if (!q.real) return null;
    q.storage ??= [];
    q.blobs ??= {};
    return { storage: { from: (bucket) => ({
      async upload(ruta, archivo, opciones){
        if (q.esperaStorage) await new Promise((r) => { q.liberarStorage = r; });
        const bm = await createImageBitmap(archivo);
        const c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height;
        const ctx = c.getContext('2d'); ctx.drawImage(bm, 0, 0);
        const px = ctx.getImageData(4, 4, 1, 1).data;
        q.storage.push({ bucket, ruta, nombre: archivo.name, tipo: archivo.type, contentType: opciones?.contentType, peso: archivo.size, ancho: bm.width, alto: bm.height, esquina: [px[0], px[1], px[2]] });
        q.blobs[ruta] = URL.createObjectURL(archivo);
        return { error: null };
      },
      getPublicUrl: (ruta) => ({ data: { publicUrl: q.verSubida ? q.blobs[ruta] : 'https://ejemplo.supabase.co/storage/v1/object/public/' + bucket + '/' + ruta } }),
    }) } };
  }
`;
