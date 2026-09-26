import { z } from "zod";

/** Mismos nombres que la columna `entorno` de dispositivos_apns y que EntornoApnsPlugin.swift. */
export const ENTORNOS_APNS = ["sandbox", "produccion"] as const;
export type EntornoApns = (typeof ENTORNOS_APNS)[number];

// Un token de dispositivo APNs es hexadecimal; 32 bytes (64 caracteres) es lo normal, con margen por si Apple
// cambia el tamaño (documentado como "opaco": no hay que asumir un largo fijo para siempre).
const esquema = z.object({
  token: z.string().regex(/^[0-9a-fA-F]{32,200}$/),
  entorno: z.enum(ENTORNOS_APNS),
});

export function validarTokenApns(entrada: unknown) {
  const r = esquema.safeParse(entrada);
  return r.success ? r.data : null;
}
