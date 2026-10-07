/**
 * «Descargar el cartel» / «Guardar en Fotos» (OL-317, bitácora 344): a dónde va la imagen y qué dice el botón según el entorno.
 * La app de iPhone (Capacitor) puede escribir en Fotos con `FotosPlugin` (apps/ios/ios/App/App/FotosPlugin.swift: nativo puro, sin paquete
 * de npm, el mismo patrón que `CalendarioPlugin` y `src/lib/calendarioNativo.ts`). Safari, la web instalada y cualquier otro navegador no
 * tienen una API para escribir en Fotos: ahí el botón dice lo que hace —«Descargar el cartel»— y descarga el archivo de verdad (decisión del
 * founder, 2026-10-06: «en web que se descargue como promete»; en el iPhone queda en Descargas, en Archivos). La hoja de compartir ya no
 * forma parte de este botón: para eso está «Compartir». Este módulo solo decide; el botón (`BotonDescargarCartel`) hace el trabajo.
 */

/** El plugin nativo que la app de iPhone pone en `window.Capacitor.Plugins.Fotos`; en Safari o Chrome no existe. */
type PuenteFotos = { guardarFoto: (datos: { datos: string; tipo: string }) => Promise<{ guardado: boolean }> };

/** La forma de `window` que le hace falta a `fotosDelSistema` (para pasar el `window` real, o uno de prueba). */
export type VentanaConFotos = { Capacitor?: { Plugins?: { Fotos?: PuenteFotos } } };

/**
 * El plugin de Fotos, si esta página corre dentro de la app y esa compilación lo trae; `null` en el navegador normal y en una compilación
 * vieja de la app (las anteriores a TestFlight 1.0 (5) no lo tienen: ahí el botón descarga, como en la web). Recibe `ventana` para probarse sin DOM.
 */
export function fotosDelSistema(ventana: VentanaConFotos): PuenteFotos | null {
  const puente = ventana.Capacitor?.Plugins?.Fotos;
  return typeof puente?.guardarFoto === "function" ? puente : null;
}

/** A dónde va el cartel: Fotos (la app con el plugin) o un archivo descargado (todo lo demás). */
export type Destino = "fotos" | "descarga";

export function destinoDelCartel({ conFotos }: { conFotos: boolean }): Destino {
  return conFotos ? "fotos" : "descarga";
}

/** Lo que dice el botón en cada momento. Donde no se puede escribir en Fotos no se promete «Fotos»: se dice lo que hace, descargar. */
export type Textos = { reposo: string; preparando: string; listo: string; fallo: string };

export function textosDelCartel(destino: Destino): Textos {
  return destino === "fotos"
    ? { reposo: "Guardar en Fotos", preparando: "Guardando…", listo: "Guardado en Fotos", fallo: "No se pudo guardar" }
    : { reposo: "Descargar el cartel", preparando: "Preparando…", listo: "Cartel descargado", fallo: "No se pudo descargar" };
}
