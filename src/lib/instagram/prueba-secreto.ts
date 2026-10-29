import "server-only";
import { createHmac } from "node:crypto";

/**
 * La prueba del secreto de la app (`appsecret_proof`, OL-484, bitácora 516; https://developers.facebook.com/docs/graph-api/security#appsecret):
 * el HMAC-SHA256 del token con el App Secret (`META_APP_SECRET`), en hexadecimal, en cada llamada a la Graph API que lleva un token. Con ella, un
 * token que se filtre no sirve desde otro lado: Meta lo rechaza si la prueba no cuadra y, cuando el founder active «Exigir el secreto de la app»
 * (App settings › Advanced › Security), también si no viene. Sin `appsecret_time`: la prueba simple basta y no caduca con el reloj.
 * Es el único sitio que la calcula: `llamarGraph` (Instagram y la página de Facebook) y la vuelta de «Conectar Instagram» (`conexion.ts`).
 * Nunca se imprime ni el secreto, ni el token, ni la prueba.
 */

/** El App Secret, o null si no está en el entorno (entonces las llamadas salen sin la prueba y se dice: `sinPrueba`). */
export function secretoDeApp(env: Record<string, string | undefined> = process.env): string | null {
  const s = env.META_APP_SECRET?.trim();
  return s ? s : null;
}

/** `appsecret_proof` de un token: HMAC-SHA256(llave = App Secret, mensaje = token), en hexadecimal. */
export function pruebaDeSecreto(token: string, secreto: string): string {
  return createHmac("sha256", secreto).update(token).digest("hex");
}

let avisado = false;

/**
 * Los parámetros de una llamada con su `access_token` y, si hay secreto, su `appsecret_proof`. Sin secreto, salen sin la prueba (`sinPrueba`)
 * y queda una sola línea en el registro por proceso (sin ningún valor) para que el gestor lo vea.
 */
export function conPrueba(params: Record<string, string>, token: string, secreto: string | null): { params: Record<string, string>; sinPrueba: boolean } {
  if (secreto) return { params: { ...params, access_token: token, appsecret_proof: pruebaDeSecreto(token, secreto) }, sinPrueba: false };
  if (!avisado) {
    avisado = true;
    console.warn("meta: falta META_APP_SECRET; las llamadas a la Graph API salen sin appsecret_proof");
  }
  return { params: { ...params, access_token: token }, sinPrueba: true };
}
