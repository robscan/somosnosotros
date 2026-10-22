import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cargarHistorialLugar, cargarProximasArtista, cargarTrayectoria } from "./cargarHistorial";
import { cargarHitos } from "./cargarHitos";
import { gestiona, leerFicha, type Quien } from "./cargarTuAnio";
import { clavePeriodo, informeLugar, nombreDocumento, presentacionArtista, zonaInforme, type Documento, type PeriodoInforme, type QueDocumento } from "./documentos";
import { clienteServidor, usuarioActual } from "./supabase/servidor";

/**
 * La lectura de la presentación y del informe en PDF (OL-396). Q firmado, «solo quien gestiona»: el mismo permiso que «Tu año»
 * (`cargarTuAnio.ts`: su autor, una cuenta ligada o la administración); a cualquier otro, null (la ruta responde 404). Sin migración ni tablas
 * nuevas: lo pasado es el de la ficha (`cargarTrayectoria`, `cargarHistorialLugar`, OL-390) y las próximas fechas del artista, las de su ficha
 * (`cargarProximasArtista`). Sin nada pasado no hay documento: el botón tampoco sale.
 */

export type DocumentoCargado = { documento: Documento; archivo: string };

const COLUMNAS_ARTISTA = "id, slug, nombre, detalle, tipo, ciudad, descripcion, redes, foto, portada, creado_por";
const COLUMNAS_LUGAR = "id, slug, nombre, direccion, portada, creado_por, zona";

export async function cargarDocumento(que: QueDocumento, id: string | null, periodo: PeriodoInforme = "mes", ahora: Date = new Date()): Promise<DocumentoCargado | null> {
  if (!id) return null;
  const [supabase, actual] = await Promise.all([clienteServidor(), usuarioActual()]);
  if (!supabase || !actual) return null;
  const quien: Quien = { id: actual.perfil.id, rol: actual.perfil.rol };
  const cliente = supabase as SupabaseClient;
  if (que === "artista") {
    type Fila = { id: string; slug: string | null; nombre: string; detalle: string | null; tipo: string | null; ciudad: string | null; descripcion: string | null; redes: unknown; foto: string | null; portada: string | null; creado_por: string | null };
    const a = await leerFicha<Fila>(cliente, "artistas", COLUMNAS_ARTISTA, id);
    if (!a || !(await gestiona(cliente, quien, "artistas_cuentas", "artista_id", a.id, a.creado_por))) return null;
    const [historial, proximos, hitos] = await Promise.all([cargarTrayectoria(a.id), cargarProximasArtista(a.id), cargarHitos(a.id)]);
    // OL-445: sus hitos (lo aceptado del showcase) también hacen presentación.
    if (!historial.eventos.length && !hitos.length) return null;
    return { documento: presentacionArtista({ artista: a, pasados: historial.eventos, lleno: historial.lleno, proximos, hitos, ahora }), archivo: nombreDocumento("artista", a.slug || a.id) };
  }
  type Fila = { id: string; slug: string | null; nombre: string; direccion: string | null; portada: string | null; creado_por: string | null; zona?: string | null };
  const l = await leerFicha<Fila>(cliente, "lugares", COLUMNAS_LUGAR, id);
  if (!l || !(await gestiona(cliente, quien, "lugares_cuentas", "lugar_id", l.id, l.creado_por))) return null;
  const historial = await cargarHistorialLugar(l.id);
  if (!historial.eventos.length) return null;
  return { documento: informeLugar({ lugar: l, pasados: historial.eventos, periodo, ahora }), archivo: nombreDocumento("lugar", l.slug || l.id, clavePeriodo(periodo, ahora, zonaInforme(l))) };
}
