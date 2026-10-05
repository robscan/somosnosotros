import type { AvisosLista } from "@/components/useSeguirEnLista";
import type { Agenda } from "@/lib/cargarAgenda";
import { tarjetaEvento } from "@/lib/destacados";
import { carrilMasAdelante } from "@/lib/inicio";
import CarrilMasAdelanteCliente from "./CarrilMasAdelanteCliente";

/** Reutiliza la lectura de Agenda; no bloquea los otros streams ni repite la consulta. */
export default async function CarrilMasAdelante({ agendaPromise, avisos, verTodosHref }: { agendaPromise: Promise<Agenda>; avisos: AvisosLista | null; verTodosHref: string }) {
  const agenda = await agendaPromise;
  const ahora = new Date();
  return <CarrilMasAdelanteCliente tarjetas={carrilMasAdelante(agenda).map(e => tarjetaEvento(e, ahora))} asistencias={agenda.asistencias} avisos={avisos} verTodosHref={verTodosHref} />;
}
