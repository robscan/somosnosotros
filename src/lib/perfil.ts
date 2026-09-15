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

/** El estado de avisos en palabras, para el renglón de Mi perfil: "Por correo y en el teléfono", "Sin avisos". */
export function textoAvisos(correo: boolean, telefono: boolean): string {
  const canales = [correo && "Por correo", telefono && "en el teléfono"].filter(Boolean) as string[];
  if (canales.length === 0) return "Sin avisos";
  return canales.length === 2 ? canales.join(" y ") : canales[0].charAt(0).toUpperCase() + canales[0].slice(1);
}

/** Texto para compartir la ficha de una persona: cuántos eventos próximos tiene, o solo que está aquí. */
export function textoCompartirPersona(nombre: string, eventos: number, mia: boolean): string {
  const quien = mia ? "Voy" : `${nombre} va`;
  if (eventos === 0) return mia ? "Estoy en Somos Nosotros, la agenda cultural de San Luis Potosí. Mira a qué voy:" : `${nombre} está en Somos Nosotros, la agenda cultural de San Luis Potosí:`;
  return `${quien} a ${eventos === 1 ? "1 evento próximo" : `${eventos} eventos próximos`} en San Luis Potosí. Mira ${eventos === 1 ? "cuál" : "cuáles"}:`;
}

/** Texto de la invitación al sitio, desde Mi perfil. */
export const TEXTO_INVITAR = "Agenda cultural y directorio de lugares de San Luis Potosí. Gratis, sin cuenta para mirar:";
