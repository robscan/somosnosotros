const ORIGEN_RUTA = "https://ruta.invalid";

/** Solo rutas internas; porDefecto lo fija el llamador, nunca la entrada del usuario. */
export function rutaSegura(valor: string | null | undefined, porDefecto = "/"): string {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//")) return porDefecto;
  // URL omite ciertos controles y trata la barra inversa como separador.
  if (/[\u0000-\u001f\u007f\\]/.test(valor)) return porDefecto;
  try {
    const url = new URL(valor, ORIGEN_RUTA);
    // /a/..//otro.test normaliza a //otro.test: no devolver una nueva autoridad.
    if (url.origin !== ORIGEN_RUTA || url.pathname.startsWith("//")) return porDefecto;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return porDefecto;
  }
}
