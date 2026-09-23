import type { AvisosLista } from "@/components/useSeguirEnLista";
import type { Agenda } from "@/lib/cargarAgenda";
import { tarjetaEvento } from "@/lib/destacados";
import { calcularCarrilesAgenda } from "@/lib/inicio";
import CarrilEventosCliente from "./CarrilEventosCliente";

type Parte = "estelar" | "populares" | "nuevos";

/**
 * Componente de servidor: espera la misma `cargarAgenda` que comparten los tres carriles "De tus favoritos" (o
 * "Destacados esta semana"), "Eventos populares" y "Eventos nuevos esta semana" (OL-156, segunda vuelta) — una
 * consulta, no tres — y recalcula los siete carriles completos de forma pura para quedarse solo con el suyo: así
 * cada `<Suspense>` es independiente de verdad (no importa en qué orden resuelvan los otros dos), sin repetir la
 * consulta a la base ni compartir un `Set` mutable entre streams. Ver `calcularCarrilesAgenda`, `lib/inicio.ts`.
 */
export default async function CarrilAgenda({ parte, agendaPromise, avisos, verTodosHref }: { parte: Parte; agendaPromise: Promise<Agenda>; avisos: AvisosLista | null; verTodosHref: string }) {
  const agenda = await agendaPromise;
  const ahora = new Date();
  const carriles = calcularCarrilesAgenda(agenda, ahora);
  const datos = parte === "estelar" ? { titulo: carriles.titulo, eventos: carriles.estelar, tamano: "grande" as const, memoria: "inicio-estelar" } : parte === "populares" ? { titulo: "Eventos populares", eventos: carriles.populares, tamano: "mediana" as const, memoria: "inicio-populares" } : { titulo: "Eventos nuevos esta semana", eventos: carriles.nuevos, tamano: "mediana" as const, memoria: "inicio-nuevos" };
  return <CarrilEventosCliente tarjetas={datos.eventos.map((e) => tarjetaEvento(e, ahora))} asistencias={agenda.asistencias} avisos={avisos} titulo={datos.titulo} tamano={datos.tamano} memoria={datos.memoria} verTodosHref={verTodosHref} />;
}
