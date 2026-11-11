import { limpiar } from "./formulario";
import { MARCA } from "./marca";
export const LIMITES = { nombre: 60, colonia: 60, bio: 140 } as const;

/**
 * Cómo sale en pantalla una persona que todavía no puso su nombre (OL-512): las cuentas nuevas ya no toman el nombre de su correo y nacen con
 * él vacío. Una sola constante para la ficha, quién va, compartir y los metadatos; su inicial es «?» (`inicialDe`).
 */
export const NOMBRE_SIN_PONER = "Persona nueva";

/** El nombre para pintar: el suyo o «Persona nueva». */
export function nombreVisible(nombre: string | null | undefined): string {
  return nombre?.trim() || NOMBRE_SIN_PONER;
}

/** La inicial del avatar sin foto: la del nombre, o «?» si no lo tiene. */
export function inicialDe(nombre: string | null | undefined): string {
  return (nombre?.trim() || "?").slice(0, 1).toUpperCase();
}

/** ¿Le falta el nombre a la ficha? (sin nombre se le pide una vez al entrar y su ficha lo recuerda). */
export function faltaNombre(nombre: string | null | undefined): boolean {
  return !nombre?.trim();
}

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

/** El estado de avisos en palabras, para el renglón de Mi perfil: "Por correo y en el teléfono", "Sin avisos". */
export function textoAvisos(correo: boolean, telefono: boolean): string {
  const canales = [correo && "Por correo", telefono && "en el teléfono"].filter(Boolean) as string[];
  if (canales.length === 0) return "Sin avisos";
  return canales.length === 2 ? canales.join(" y ") : canales[0].charAt(0).toUpperCase() + canales[0].slice(1);
}

/** Texto para compartir la ficha de una persona: cuántos eventos próximos tiene, o solo que está aquí. */
export function textoCompartirPersona(nombre: string, eventos: number, mia: boolean): string {
  const quien = mia ? "Voy" : `${nombre} va`;
  if (eventos === 0) return mia ? `Estoy en ${MARCA}, la agenda de la cultura local. Mira a qué voy:` : `${nombre} está en ${MARCA}, la agenda de la cultura local:`;
  return `${quien} a ${eventos === 1 ? "1 evento próximo" : `${eventos} eventos próximos`}. Mira ${eventos === 1 ? "cuál" : "cuáles"}:`;
}

/** Texto de la invitación al sitio, desde Mi perfil. */
export const TEXTO_INVITAR = "Agenda y directorio de la cultura local. Mira qué hay, conoce a la gente. No necesitas cuenta para mirar:";
