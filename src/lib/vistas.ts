/**
 * Las vistas de la ficha de un evento (OL-459): una por visitante y día, sin datos personales. Sin cuenta, el visitante es un
 * número al azar en una cookie propia que dura un día (`COOKIE_VISITA`); con cuenta, su id, que la base solo usa para no contar
 * dos veces ni contar a la administración o a quien publicó el evento (guarda un resumen con sal, nunca el id: `contar_vista_evento`).
 * Aquí, lo que el servidor decide antes de llamar a la base: si quien pide es un robot evidente y si la cookie es válida.
 */
export const COOKIE_VISITA = "sn_visita";
/** Un día: basta para contar una vez al día y no sirve para seguir a nadie después. */
export const DURACION_VISITA_S = 86400;

/** Lo que dicen ser los robots, buscadores, vistas previas de enlaces y navegadores sin pantalla: no cuentan. */
const ROBOT = /bot|crawl|spider|slurp|fetch|preview|scan|monitor|headless|lighthouse|pagespeed|facebookexternalhit|whatsapp|telegram|discord|embedly|curl|wget|python|node-fetch|axios|go-http|java\/|okhttp|httpclient/i;

/** Un robot evidente: sin agente de usuario o con uno que lo dice. */
export function esRobot(agente: string | null): boolean {
  return !agente || agente.length < 10 || ROBOT.test(agente);
}

const VALIDO = /^[A-Za-z0-9_-]{16,64}$/;

/** El visitante anónimo de la cookie, si es uno que pudimos haber dado; si no, null. */
export function visitanteDeCookie(cabecera: string | null): string | null {
  if (!cabecera) return null;
  for (const parte of cabecera.split(";")) {
    const [nombre, ...valor] = parte.trim().split("=");
    if (nombre === COOKIE_VISITA) {
      const v = valor.join("=");
      return VALIDO.test(v) ? v : null;
    }
  }
  return null;
}

/** Un visitante nuevo: 32 caracteres al azar, nada más. */
export function nuevoVisitante(): string {
  return crypto.randomUUID().replaceAll("-", "");
}

/** La cookie que lo guarda: solo de este sitio, sin acceso desde la página, un día. */
export function cookieDeVisita(visitante: string, segura = true): string {
  return `${COOKIE_VISITA}=${visitante}; Path=/; Max-Age=${DURACION_VISITA_S}; HttpOnly; SameSite=Lax${segura ? "; Secure" : ""}`;
}
