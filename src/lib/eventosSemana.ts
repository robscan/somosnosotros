import type { Tarjeta } from "./destacados";
import { hrefArtista } from "./artistas";
import { diaLocal, formatearCuando } from "./fechas";
import { compararNombres, hrefLugar } from "./lugares";

export type AparicionSemana = {
  ficha: { id: string; slug: string; nombre: string; foto: string | null; visible: boolean; privado?: boolean };
  evento: {
    id: string; inicio: string; termina: string; zona: string; visible: boolean;
    lugar_id: string | null;
    lugar: { visible: boolean; privado: boolean } | null;
  };
};

/** Hoy y los próximos siete días de calendario en la zona del evento, como la agenda.
 * También entran los que empezaron antes y siguen en curso. `termina` ya incorpora fin o medianoche local.
 */
export function ocurreEstaSemana(e: AparicionSemana["evento"], ahora: Date): boolean {
  if (!e.visible || !Number.isFinite(Date.parse(e.inicio)) || !(Date.parse(e.termina) >= ahora.getTime())) return false;
  if (e.lugar_id && (!e.lugar?.visible || e.lugar.privado)) return false;
  const hoy = diaLocal(ahora, e.zona);
  const limite = new Date(`${hoy}T12:00:00Z`);
  limite.setUTCDate(limite.getUTCDate() + 7);
  return diaLocal(new Date(e.inicio), e.zona) <= limite.toISOString().slice(0, 10);
}

/** Una tarjeta por entidad, con su primera aparición vigente. No depende de la paginación del directorio. Sin foto la tarjeta entra igual
 * (founder, 2026-10-01, OL-253): quien la pinta pone el símbolo SN ya generado. `cuando` dice que `detalle` es un día y una hora (violeta). */
export function tarjetasDeSemana(apariciones: AparicionSemana[], tipo: "artistas" | "lugares", ahora = new Date()): Tarjeta[] {
  const porFicha = new Map<string, AparicionSemana>();
  for (const a of apariciones) {
    if (!a.ficha.visible || a.ficha.privado || !ocurreEstaSemana(a.evento, ahora)) continue;
    const anterior = porFicha.get(a.ficha.id);
    if (!anterior || Date.parse(a.evento.inicio) < Date.parse(anterior.evento.inicio)
      || (Date.parse(a.evento.inicio) === Date.parse(anterior.evento.inicio) && a.evento.id.localeCompare(anterior.evento.id) < 0)) porFicha.set(a.ficha.id, a);
  }
  return [...porFicha.values()]
    .sort((a, b) => Date.parse(a.evento.inicio) - Date.parse(b.evento.inicio) || compararNombres(a.ficha.nombre, b.ficha.nombre) || a.ficha.id.localeCompare(b.ficha.id))
    .map(({ ficha, evento }) => ({
      id: ficha.id,
      href: tipo === "artistas" ? hrefArtista(ficha) : hrefLugar(ficha),
      foto: ficha.foto,
      titulo: ficha.nombre,
      detalle: Date.parse(evento.inicio) < ahora.getTime() ? "En curso" : formatearCuando(evento.inicio, null, ahora, evento.zona),
      van: 0,
      cuando: true,
    }));
}

/** El servidor quita primero quienes ya salen en Destacados y después limita la tira: cortar antes puede dejarla vacía. */
export function seleccionarArtistasSemana(semana: Tarjeta[], destacados: Pick<Tarjeta, "id">[], tope: number): Tarjeta[] {
  const yaSalen = new Set(destacados.map((t) => t.id));
  return semana.filter((t) => !yaSalen.has(t.id)).slice(0, tope);
}
