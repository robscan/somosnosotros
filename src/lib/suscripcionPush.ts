import { z } from "zod";

export const MAX_TELEFONOS_PUSH = 10;
export const CONCURRENCIA_PUSH = 5;
export const ESPERA_PUSH_MS = 10_000;

// Mantener los proveedores en consonancia con push_endpoint_permitido() en SQL.
const proveedor = /^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/;

export function endpointPushPermitido(endpoint: string): boolean {
  if (!endpoint || endpoint.length > 4096 || /[^\x21-\x7e]|[#\\]/.test(endpoint)) return false;
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && !url.username && !url.password && !url.port
      && proveedor.test(url.hostname)
      && endpoint.startsWith(`https://${url.hostname}/`)
      && endpoint.length > `https://${url.hostname}/`.length;
  } catch {
    return false;
  }
}

const esquema = z.object({
  endpoint: z.string().refine(endpointPushPermitido),
  keys: z.object({
    p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}$/),
    auth: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
  }),
});

export function validarSuscripcionPush(entrada: unknown) {
  const r = esquema.safeParse(entrada);
  if (!r.success || Buffer.from(r.data.keys.p256dh, "base64url")[0] !== 4) return null;
  return r.data;
}
