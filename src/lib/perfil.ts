import { limpiar } from "./formulario";
export const LIMITES = { nombre: 60, colonia: 60, bio: 140 } as const;

export type DatosPerfil = { nombre: string; colonia: string; bio: string; foto: string | null };
export type ErroresPerfil = Partial<Record<"nombre" | "colonia" | "bio" | "foto", string>>;


/** Normaliza y valida lo que llega del formulario. Devuelve los datos limpios y los errores (vacío = todo bien). */
export function validarPerfil(entrada: {
  nombre?: FormDataEntryValue | null;
  colonia?: FormDataEntryValue | null;
  bio?: FormDataEntryValue | null;
  foto?: FormDataEntryValue | null;
}): { datos: DatosPerfil; errores: ErroresPerfil } {
  const datos: DatosPerfil = {
    nombre: limpiar(entrada.nombre),
    colonia: limpiar(entrada.colonia),
    bio: limpiar(entrada.bio),
    foto: limpiar(entrada.foto) || null,
  };
  const errores: ErroresPerfil = {};
  if (!datos.nombre) errores.nombre = "Escribe cómo te llamas.";
  else if (datos.nombre.length > LIMITES.nombre) errores.nombre = `Máximo ${LIMITES.nombre} caracteres.`;
  if (datos.colonia.length > LIMITES.colonia) errores.colonia = `Máximo ${LIMITES.colonia} caracteres.`;
  if (datos.bio.length > LIMITES.bio) errores.bio = `Máximo ${LIMITES.bio} caracteres.`;
  if (datos.foto && !/^https:\/\/[^\s]+$/.test(datos.foto)) errores.foto = "La foto no se subió bien. Intenta de nuevo.";
  return { datos, errores };
}

/** Correo con forma de correo. Suficiente: Supabase valida de verdad al enviar el enlace. */
export function correoValido(correo: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo.trim());
}
