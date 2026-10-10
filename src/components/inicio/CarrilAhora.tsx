import { candidatosAhora } from "@/lib/ahora";
import type { Agenda } from "@/lib/cargarAgenda";
import FilaAhora from "./FilaAhora";

/**
 * Componente de servidor de la fila «Ahora» (OL-359): espera la misma `cargarAgenda` que los carriles (sin consulta nueva: hoy y mañana ya están
 * en ella) y le pasa al teléfono solo los candidatos de los próximos dos días, ya reducidos a lo que pinta (`candidatosAhora`). La clasificación
 * corre allí, cada minuto.
 */
export default async function CarrilAhora({ agendaPromise, ciudad, conSesion }: { agendaPromise: Promise<Agenda>; ciudad: string; conSesion: boolean }) {
  const agenda = await agendaPromise;
  const ahora = new Date();
  const eventos = candidatosAhora(agenda.eventos, ciudad, ahora);
  if (!eventos.length) return null;
  return <FilaAhora eventos={eventos} ahoraServidor={ahora.toISOString()} asistencias={agenda.asistencias} conSesion={conSesion} />;
}
