/**
 * Enlaces y redes de lugares y artistas (docs/rediseno/09-enlaces-flujo-y-estados.md).
 * La persona no elige la red: pega un enlace, un @usuario o un teléfono y el sistema reconoce
 * de qué red es por el dominio. Lo que no reconoce queda como "sitio" con su dominio de etiqueta.
 */
export const REDES = [
  { red: "instagram", etiqueta: "Instagram", dominios: ["instagram.com"] },
  { red: "facebook", etiqueta: "Facebook", dominios: ["facebook.com", "fb.com", "fb.me"] },
  { red: "tiktok", etiqueta: "TikTok", dominios: ["tiktok.com"] },
  { red: "youtube", etiqueta: "YouTube", dominios: ["youtube.com", "youtu.be"] },
  { red: "vimeo", etiqueta: "Vimeo", dominios: ["vimeo.com"] },
  { red: "spotify", etiqueta: "Spotify", dominios: ["spotify.com"] },
  { red: "soundcloud", etiqueta: "SoundCloud", dominios: ["soundcloud.com"] },
  { red: "bandcamp", etiqueta: "Bandcamp", dominios: ["bandcamp.com"] },
  { red: "applemusic", etiqueta: "Apple Music", dominios: ["music.apple.com"] },
  { red: "whatsapp", etiqueta: "WhatsApp", dominios: ["wa.me", "whatsapp.com"] },
  { red: "x", etiqueta: "X", dominios: ["x.com", "twitter.com"] },
  { red: "threads", etiqueta: "Threads", dominios: ["threads.net", "threads.com"] },
  { red: "linktree", etiqueta: "Linktree", dominios: ["linktr.ee"] },
] as const;
export type Red = (typeof REDES)[number]["red"] | "sitio";
export type Enlace = { red: Red; url: string };

export const LIMITE_ENLACES = 8;

function etiquetaDe(red: Red): string {
  return REDES.find((r) => r.red === red)?.etiqueta ?? "Sitio";
}

/** Dominio sin "www." y sin ruta: "https://www.casa1100.mx/agenda" → "casa1100.mx". */
export function dominioDe(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Etiqueta del botón en la ficha: el nombre de la red, o "Sitio web" si es un sitio. */
export function etiquetaEnlace(e: Enlace): string {
  return e.red === "sitio" ? "Sitio web" : etiquetaDe(e.red);
}

function redPorDominio(host: string): Red {
  const h = host.replace(/^www\./, "").toLowerCase();
  for (const r of REDES) if (r.dominios.some((d) => h === d || h.endsWith(`.${d}`))) return r.red;
  return "sitio";
}

/**
 * Reconoce lo que la persona pegó: enlace completo, dominio sin https, "@usuario" (Instagram) o un
 * teléfono con lada (WhatsApp). Devuelve el enlace normalizado (https) con su red, o null si no es nada.
 */
export function reconocerEnlace(texto: string): Enlace | null {
  const t = texto.trim().replace(/\s+/g, " ");
  if (!t) return null;
  // Teléfono: solo dígitos, espacios, guiones, paréntesis y un + inicial.
  if (/^\+?[\d\s\-()]{10,}$/.test(t)) {
    const digitos = t.replace(/\D/g, "");
    if (digitos.length < 10) return null;
    return { red: "whatsapp", url: `https://wa.me/${digitos.length === 10 ? "52" + digitos : digitos}` };
  }
  if (/^@[\w.]+$/.test(t)) return { red: "instagram", url: `https://www.instagram.com/${t.slice(1)}/` };
  const conEsquema = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  let url: URL;
  try {
    url = new URL(conEsquema);
  } catch {
    return null;
  }
  // Un dominio de verdad: letras, al menos un punto y una terminación de letras ("123" no es un sitio).
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(url.hostname)) return null;
  const red = redPorDominio(url.hostname);
  let urlFinal = url.toString().replace(/\/$/, "");
  // Instagram: normalizar a www y con barra final
  if (red === "instagram") {
    const pathname = url.pathname.replace(/\/$/, "").replace(/^\//, "");
    urlFinal = `https://www.instagram.com/${pathname}/`;
  }
  return { red, url: urlFinal };
}

/** Las fichas de antes guardaban { instagram: "@x", whatsapp: "444…", sitio: "casa.mx" }: se convierten al leer. */
function desdeClaveVieja(clave: string, valor: string): Enlace | null {
  const v = valor.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return reconocerEnlace(v);
  switch (clave) {
    case "instagram":
      return reconocerEnlace(`https://instagram.com/${v.replace(/^@/, "").replace(/^instagram\.com\//, "")}`);
    case "facebook":
      return reconocerEnlace(`https://facebook.com/${v.replace(/^@/, "").replace(/^facebook\.com\//, "")}`);
    case "youtube":
      return reconocerEnlace(`https://youtube.com/${v.replace(/^youtube\.com\//, "").replace(/^(?!@)/, "@")}`);
    case "whatsapp":
      return reconocerEnlace(v);
    default:
      return reconocerEnlace(v);
  }
}

/** Lo guardado en `redes` (JSON), en cualquiera de sus dos formas, como lista limpia y sin repetidos. */
export function normalizarRedes(json: unknown): Enlace[] {
  const out: Enlace[] = [];
  const vistos = new Set<string>();
  const meter = (e: Enlace | null) => {
    if (!e || vistos.has(e.url) || out.length >= LIMITE_ENLACES) return;
    vistos.add(e.url);
    out.push(e);
  };
  if (Array.isArray(json)) {
    for (const x of json) {
      if (x && typeof x === "object" && typeof (x as { url?: unknown }).url === "string") meter(reconocerEnlace((x as { url: string }).url));
    }
  } else if (json && typeof json === "object") {
    for (const [clave, valor] of Object.entries(json as Record<string, unknown>)) if (typeof valor === "string") meter(desdeClaveVieja(clave, valor));
  }
  return out;
}

/** El campo oculto del formulario: una lista JSON de textos o enlaces; cada uno se reconoce de nuevo en el servidor. */
export function enlacesDesdeJson(texto: FormDataEntryValue | string | null | undefined): Enlace[] {
  if (typeof texto !== "string" || !texto.trim()) return [];
  try {
    const crudo = JSON.parse(texto);
    if (!Array.isArray(crudo)) return [];
    return normalizarRedes(crudo.map((x) => (typeof x === "string" ? { url: x } : x)));
  } catch {
    return [];
  }
}
