export type CampoFlyer = "titulo" | "cuando" | "cuanto" | "descripcion" | "enlace" | "quien" | "donde" | "imagen";

/** Lo que ya trae el formulario al abrirse: de ahí sale qué campos el cartel no debe pisar. */
export type DatosAlAbrir = {
  titulo?: string | null;
  inicio?: string | null;
  precioDefinido?: boolean;
  descripcion?: string | null;
  enlace?: string | null;
  /** Solo cuenta si vino explícito (editar, duplicar, o venir de la ficha de un artista): ver camposIniciales. */
  quienInicial?: unknown[];
  donde?: boolean;
  imagen?: string | null;
};

/**
 * Los campos que ya llegan resueltos al abrir el formulario, para que el cartel no los pise (docs/rediseno/22).
 * "quien" es el caso especial: no se mira el estado `quien` del formulario, porque ese ya trae el relleno de la
 * decisión 12 (si solo tengo un artista propio, "Quién" empieza siendo yo). Ese relleno no es un dato real
 * todavía, y contarlo aquí bloqueaba para siempre que el cartel agregara a los artistas que sí trae la imagen
 * (bug del founder, 2026-09-21: "no agrega a los artistas... me agrega a mí el que publica"). Solo un
 * `quienInicial` explícito (duplicar un evento, o llegar desde la ficha de un artista) debe bloquearlo.
 */
export function camposIniciales(d: DatosAlAbrir): CampoFlyer[] {
  return ([
    d.titulo ? "titulo" : null,
    d.inicio ? "cuando" : null,
    d.precioDefinido ? "cuanto" : null,
    d.descripcion ? "descripcion" : null,
    d.enlace ? "enlace" : null,
    d.quienInicial?.length ? "quien" : null,
    d.donde ? "donde" : null,
    d.imagen ? "imagen" : null,
  ] as (CampoFlyer | null)[]).filter((c): c is CampoFlyer => c !== null);
}

/** Incluso borrar o volver al mismo valor es un gesto: comparar valores no basta. */
export function crearGestosFlyer(iniciales: CampoFlyer[] = []) {
  const versiones = new Map<CampoFlyer, number>(iniciales.map(c => [c, 1]));
  return {
    tocar(campo: CampoFlyer) {
      const version = (versiones.get(campo) ?? 0) + 1;
      versiones.set(campo, version);
      return version;
    },
    puedeCompletar: (campo: CampoFlyer) => !versiones.has(campo),
    vigente: (campo: CampoFlyer, version: number) => versiones.get(campo) === version,
  };
}
