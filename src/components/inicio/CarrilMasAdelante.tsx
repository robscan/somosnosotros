import type { AvisosLista } from "@/components/useSeguirEnLista";
import type { Agenda } from "@/lib/cargarAgenda";
import { nombreDeFestival } from "@/lib/destacados";
import { carrilMasAdelante } from "@/lib/inicio";
import { tarjetaDeInicio } from "@/lib/tarjetaInicio";
import CarrilMasAdelanteCliente from "./CarrilMasAdelanteCliente";

/** Reutiliza la lectura de Agenda; no bloquea los otros streams ni repite la consulta. */
export default async function CarrilMasAdelante({ agendaPromise, avisos, verTodosHref }: { agendaPromise: Promise<Agenda>; avisos: AvisosLista | null; verTodosHref: string }) {
  const agenda = await agendaPromise;
  const ahora = new Date();
  const festival = nombreDeFestival(agenda.eventos);
  return <CarrilMasAdelanteCliente tarjetas={carrilMasAdelante(agenda).map((e) => tarjetaDeInicio(e, ahora, festival(e)))} asistencias={agenda.asistencias} avisos={avisos} verTodosHref={verTodosHref} />;
}
