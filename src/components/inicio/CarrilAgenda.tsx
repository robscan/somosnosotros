import type { AvisosLista } from "@/components/useSeguirEnLista";
import type { Agenda } from "@/lib/cargarAgenda";
import { tarjetaEvento } from "@/lib/destacados";
import { calcularCarrilesAgenda } from "@/lib/inicio";
import CarrilEventosCliente from "./CarrilEventosCliente";

type Parte = "estelar" | "estaSemana" | "populares" | "nuevos";

/**
 * Componente de servidor: espera la misma `cargarAgenda` que comparten los cuatro carriles "Seleccionados para ti"
 * (o "Destacados"), "Esta semana", "Populares" y "Nuevos eventos" (OL-156, segunda vuelta; "Esta semana" y el
 * criterio nuevo de "Nuevos eventos", OL-219) — una consulta, no cuatro — y recalcula los carriles completos de
 * forma pura para quedarse solo con el suyo: así cada `<Suspense>` es independiente de verdad (no importa en qué
 * orden resuelvan los otros), sin repetir la consulta a la base ni compartir un `Set` mutable entre streams.
 * `tusPlanesIdsPromise` (OL-219): los ids que ya se llevó "Tus planes" (otra consulta, `cargarPersona`), para que
 * ninguno de estos cuatro los repita. Ver `calcularCarrilesAgenda`, `lib/inicio.ts`.
 */
export default async function CarrilAgenda({ parte, agendaPromise, tusPlanesIdsPromise, avisos, verTodosHref }: { parte: Parte; agendaPromise: Promise<Agenda>; tusPlanesIdsPromise: Promise<string[]>; avisos: AvisosLista | null; verTodosHref: string }) {
  const [agenda, tusPlanesIds] = await Promise.all([agendaPromise, tusPlanesIdsPromise]);
  const ahora = new Date();
  const carriles = calcularCarrilesAgenda(agenda, ahora, tusPlanesIds);
  const datos =
    parte === "estelar"
      ? { titulo: carriles.titulo, eventos: carriles.estelar, tamano: "grande" as const, memoria: "inicio-estelar" }
      : parte === "estaSemana"
        ? { titulo: "Esta semana", eventos: carriles.estaSemana, tamano: "mediana" as const, memoria: "inicio-esta-semana" }
        : parte === "populares"
          ? { titulo: "Populares", eventos: carriles.populares, tamano: "mediana" as const, memoria: "inicio-populares" }
          : { titulo: "Nuevos eventos", eventos: carriles.nuevos, tamano: "mediana" as const, memoria: "inicio-nuevos" };
  return <CarrilEventosCliente tarjetas={datos.eventos.map((e) => tarjetaEvento(e, ahora))} asistencias={agenda.asistencias} avisos={avisos} titulo={datos.titulo} tamano={datos.tamano} memoria={datos.memoria} verTodosHref={verTodosHref} />;
}
