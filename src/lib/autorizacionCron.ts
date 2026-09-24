import { timingSafeEqual } from "node:crypto";

/**
 * ¿La cabecera Authorization trae el secreto correcto? (S-03, docs/rediseno/46). Antes `avisos-pendientes` y
 * `recordatorios` comparaban con `!==` en texto plano; mismo criterio en tiempo constante que ya usan el
 * webhook de Resend (`api/resend/route.ts`) y el estado de "Entrar" (`lib/entrarCon.ts`). Sin secreto
 * configurado se rechaza sin comparar nada (nunca "cualquier cosa pasa si falta la variable").
 */
export function autorizadoPorSecreto(cabeceras: Headers, secreto: string | undefined): boolean {
  if (!secreto) return false;
  const recibido = Buffer.from(cabeceras.get("authorization") ?? "");
  const esperado = Buffer.from(`Bearer ${secreto}`);
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}
