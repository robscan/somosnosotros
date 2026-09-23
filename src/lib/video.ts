import type { Enlace } from "./enlaces";

/**
 * Video embebido de un enlace ya guardado como red (OL-154 / doc 40, apartado d): YouTube o Vimeo se ven
 * en la ficha sin salir del sitio, sin revisión previa. La seguridad no depende de revisar el enlace: el
 * `src` del iframe siempre se arma aquí, a partir de un id validado por regex, nunca de la URL que guardó
 * la persona. Un enlace que no calza con ninguna forma reconocida devuelve null y la ficha lo deja como
 * enlace de texto, igual que hoy.
 */
export type VideoEmbed = { proveedor: "youtube" | "vimeo"; id: string; src: string };

const ID_YOUTUBE = /^[A-Za-z0-9_-]{11}$/;
const ID_VIMEO = /^\d{6,12}$/;

function idYouTube(url: URL): string | null {
  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  const primerSegmento = (ruta: string) => ruta.split("/").filter(Boolean)[0] ?? null;
  let id: string | null = null;
  if (host === "youtu.be") {
    id = primerSegmento(url.pathname);
  } else if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else if (url.pathname.startsWith("/embed/")) id = primerSegmento(url.pathname.slice("/embed".length));
    else if (url.pathname.startsWith("/shorts/")) id = primerSegmento(url.pathname.slice("/shorts".length));
    else if (url.pathname.startsWith("/live/")) id = primerSegmento(url.pathname.slice("/live".length));
  } else {
    return null;
  }
  return id && ID_YOUTUBE.test(id) ? id : null;
}

function idVimeo(url: URL): string | null {
  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  if (host !== "vimeo.com" && host !== "player.vimeo.com") return null;
  const partes = url.pathname.split("/").filter(Boolean);
  const candidato = partes[partes.length - 1] ?? null;
  return candidato && ID_VIMEO.test(candidato) ? candidato : null;
}

/**
 * A partir de un enlace ya reconocido como red "youtube" o "vimeo" (lib/enlaces), el video embebible o null.
 * Nunca recibe la URL cruda que pegó la persona sin pasar antes por `reconocerEnlace`.
 */
export function videoEmbedDe(enlace: Enlace): VideoEmbed | null {
  if (enlace.red !== "youtube" && enlace.red !== "vimeo") return null;
  let url: URL;
  try {
    url = new URL(enlace.url);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (enlace.red === "youtube") {
    const id = idYouTube(url);
    return id ? { proveedor: "youtube", id, src: `https://www.youtube-nocookie.com/embed/${id}` } : null;
  }
  const id = idVimeo(url);
  return id ? { proveedor: "vimeo", id, src: `https://player.vimeo.com/video/${id}` } : null;
}
