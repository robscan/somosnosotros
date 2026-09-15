/**
 * Entrar con motivo (docs/rediseno/11-restantes-flujo-y-estados.md, decisión 1): el título dice para qué
 * entra la persona según a dónde iba, y el regreso vuelve a esa pantalla sin la intención colgada.
 */
export type Motivo =
  | { tipo: "voy" | "interesa"; titulo: string; origen: string }
  | { tipo: "seguir"; titulo: string; origen: string; tabla: "lugares" | "artistas"; id: string }
  | { tipo: "mio"; titulo: string; origen: string }
  | { tipo: "publicar" | "registrar" | "ninguno"; titulo: string; origen: string };

const UUID = /^[0-9a-f-]{36}$/;

export function motivoEntrar(siguiente: string): Motivo {
  let url: URL;
  try {
    url = new URL(siguiente, "http://x");
  } catch {
    return { tipo: "ninguno", titulo: "Entrar", origen: "/" };
  }
  const partes = url.pathname.split("/").filter(Boolean);
  const accion = url.searchParams.get("accion");
  url.searchParams.delete("accion");
  const origen = `${url.pathname}${url.search}`;
  const [seccion, id] = partes;

  if (accion === "voy" && seccion === "eventos") return { tipo: "voy", titulo: "Entra para decir que vas", origen };
  if (accion === "me_interesa" && seccion === "eventos") return { tipo: "interesa", titulo: "Entra para marcar que te interesa", origen };
  if (accion === "seguir" && (seccion === "lugares" || seccion === "artistas") && id && UUID.test(id)) return { tipo: "seguir", titulo: "Entra para seguir", origen, tabla: seccion, id };
  if (accion === "mio" && seccion === "artistas") return { tipo: "mio", titulo: "Entra para decir que eres tú", origen };
  if (id === "nuevo" && seccion === "eventos") return { tipo: "publicar", titulo: "Entra para publicar", origen: "/" };
  if (id === "nuevo" && (seccion === "lugares" || seccion === "artistas")) return { tipo: "registrar", titulo: `Entra para registrar ${seccion === "lugares" ? "un lugar" : "un artista"}`, origen: `/${seccion}` };
  if (seccion === "perfil" || seccion === "admin") return { tipo: "ninguno", titulo: "Entrar", origen: "/" };
  return { tipo: "ninguno", titulo: "Entrar", origen };
}

/** "Entra para seguir" más el nombre cuando ya se conoce: "Entra para seguir a Los Vecinos". */
export function tituloSeguir(nombre: string | null): string {
  return nombre ? `Entra para seguir a ${nombre}` : "Entra para seguir";
}

/** Correo enmascarado para la pantalla del código: "rosa@gmail.com" → "ro…@gmail.com". */
export function enmascararCorreo(correo: string): string {
  const [u, d] = correo.split("@");
  if (!d) return correo;
  return `${u.slice(0, 2)}…@${d}`;
}

/** Solo los dígitos del código, venga como venga (pegado con espacios, con guion), hasta el largo que toque. */
export function limpiarCodigo(texto: string, largo = 8): string {
  return texto.replace(/\D/g, "").slice(0, largo);
}
