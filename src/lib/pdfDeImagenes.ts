/**
 * Un PDF de solo imágenes, escrito a mano (OL-396: «sin librerías nuevas»). Cada página es un JPEG que se mete tal cual, sin volver a
 * comprimirlo: el PDF lee JPEG de origen (`/Filter /DCTDecode`), así que basta con envolverlo. Los objetos: el catálogo, el árbol de páginas, la
 * información (título, quién lo hizo, cuándo) y, por cada página, la página, su imagen (XObject) y el contenido que la pinta a todo el tamaño de
 * la hoja (`q 612 0 0 792 0 0 cm /Im0 Do Q`). Después la tabla `xref` con el desplazamiento real de cada objeto y el `trailer`.
 *
 * Límite: el texto es imagen; no se selecciona ni se busca dentro del PDF (y un lector de pantalla solo lee el título del documento).
 */

/** Lo que dice la cabecera de un JPEG: su tamaño y cuántos canales trae (1 gris, 3 color, 4 CMYK). */
export type MedidasJpeg = { ancho: number; alto: number; componentes: number };

/** Lee el tamaño de un JPEG en su marcador de cuadro (SOF0 a SOF15, sin DHT, JPG ni DAC). Lanza si no es un JPEG o no lo trae. */
export function medidasJpeg(jpeg: Uint8Array): MedidasJpeg {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) throw new Error("No es un JPEG");
  let i = 2;
  while (i + 4 <= jpeg.length) {
    if (jpeg[i] !== 0xff) {
      i++;
      continue;
    }
    const marca = jpeg[i + 1];
    if (marca === 0xff) {
      i++;
      continue;
    }
    if (marca === 0xd8 || marca === 0x01 || (marca >= 0xd0 && marca <= 0xd7)) {
      i += 2;
      continue;
    }
    const largo = (jpeg[i + 2] << 8) | jpeg[i + 3];
    if (marca >= 0xc0 && marca <= 0xcf && marca !== 0xc4 && marca !== 0xc8 && marca !== 0xcc) {
      const alto = (jpeg[i + 5] << 8) | jpeg[i + 6];
      const ancho = (jpeg[i + 7] << 8) | jpeg[i + 8];
      return { ancho, alto, componentes: jpeg[i + 9] };
    }
    if (marca === 0xd9 || marca === 0xda) break;
    i += 2 + largo;
  }
  throw new Error("El JPEG no dice su tamaño");
}

/** Un texto del PDF que admite acentos: UTF-16 con su marca, en hexadecimal (`<FEFF…>`). */
function textoPdf(s: string): string {
  let hex = "FEFF";
  for (let i = 0; i < s.length; i++) hex += s.charCodeAt(i).toString(16).padStart(4, "0").toUpperCase();
  return `<${hex}>`;
}

/** La fecha del PDF: «D:20261012204800Z». */
function fechaPdf(d: Date): string {
  return `D:${d.toISOString().replace(/[-:T]/g, "").slice(0, 14)}Z`;
}

const ESPACIO_COLOR: Record<number, string> = { 1: "/DeviceGray", 3: "/DeviceRGB", 4: "/DeviceCMYK" };

export type OpcionesPdf = {
  /** El tamaño de cada página en puntos (1/72 in): carta 612 × 792, A4 595 × 842. */
  puntos: { ancho: number; alto: number };
  titulo?: string;
  autor?: string;
  creado?: Date;
};

/** Escribe el PDF: una página por JPEG, cada una a todo el tamaño de la hoja. */
export function pdfDeImagenes(jpegs: readonly Uint8Array[], o: OpcionesPdf): Buffer {
  if (jpegs.length === 0) throw new Error("Un PDF necesita al menos una página");
  const trozos: Buffer[] = [];
  let largo = 0;
  const escribir = (b: Buffer | string) => {
    const buf = typeof b === "string" ? Buffer.from(b, "latin1") : b;
    trozos.push(buf);
    largo += buf.length;
  };
  const desplazamientos: number[] = [];
  const objeto = (n: number, cuerpo: string, flujo?: Uint8Array) => {
    desplazamientos[n] = largo;
    if (!flujo) {
      escribir(`${n} 0 obj\n${cuerpo}\nendobj\n`);
      return;
    }
    escribir(`${n} 0 obj\n${cuerpo}\nstream\n`);
    escribir(Buffer.from(flujo));
    escribir("\nendstream\nendobj\n");
  };

  // La cabecera y una línea con bytes altos: así los programas saben que el archivo es binario.
  escribir("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n");
  const { ancho: W, alto: H } = o.puntos;
  const paginas = jpegs.map((_, i) => 4 + 3 * i);
  objeto(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objeto(2, `<< /Type /Pages /Kids [${paginas.map((n) => `${n} 0 R`).join(" ")}] /Count ${jpegs.length} >>`);
  const info = [o.titulo ? `/Title ${textoPdf(o.titulo)}` : "", o.autor ? `/Author ${textoPdf(o.autor)}` : "", `/Producer ${textoPdf("Somos Nosotrxs")}`, `/CreationDate (${fechaPdf(o.creado ?? new Date())})`].filter(Boolean).join(" ");
  objeto(3, `<< ${info} >>`);
  jpegs.forEach((jpeg, i) => {
    const n = 4 + 3 * i;
    const m = medidasJpeg(jpeg);
    const espacio = ESPACIO_COLOR[m.componentes];
    if (!espacio) throw new Error(`JPEG con ${m.componentes} canales`);
    // Un JPEG CMYK de Adobe se guarda invertido: la `/Decode` lo endereza. Los de sharp son siempre RGB.
    const decode = m.componentes === 4 ? " /Decode [1 0 1 0 1 0 1 0]" : "";
    const contenido = Buffer.from(`q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`, "latin1");
    objeto(n, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${n + 1} 0 R >> >> /Contents ${n + 2} 0 R >>`);
    objeto(n + 1, `<< /Type /XObject /Subtype /Image /Width ${m.ancho} /Height ${m.alto} /ColorSpace ${espacio} /BitsPerComponent 8 /Filter /DCTDecode${decode} /Length ${jpeg.length} >>`, jpeg);
    objeto(n + 2, `<< /Length ${contenido.length} >>`, contenido);
  });

  // La tabla: una entrada de 20 bytes por objeto («0000001234 00000 n \n»), la cero libre.
  const total = 4 + 3 * jpegs.length;
  const inicioXref = largo;
  let xref = `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (let n = 1; n < total; n++) xref += `${String(desplazamientos[n]).padStart(10, "0")} 00000 n \n`;
  escribir(xref);
  escribir(`trailer\n<< /Size ${total} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`);
  return Buffer.concat(trozos, largo);
}
