import type { AvisosLista } from "@/components/useSeguirEnLista";
import type { Agenda } from "@/lib/cargarAgenda";
import { tarjetaEvento } from "@/lib/destacados";
import { calcularCarrilesAgenda } from "@/lib/inicio";
import CarrilEventosCliente from "./CarrilEventosCliente";
import CarrilNuevos from "./CarrilNuevos";

/** «Nuevos» además necesita la ciudad: su última visita (la que decide qué es nuevo en este teléfono) es de esa ciudad. */
type Parte = { parte: "estelar" | "estaSemana" } | { parte: "nuevos"; ciudad: string };

/**
 * Componente de servidor: espera la misma `cargarAgenda` que comparten los tres carriles "Seleccionados para ti"
 * (o "Destacados"), "Esta semana" y "Nuevos eventos" (OL-156, segunda vuelta; "Esta semana" y el criterio nuevo de
 * "Nuevos eventos", OL-219) — una consulta, no tres — y recalcula los carriles completos de
 * forma pura para quedarse solo con el suyo: así cada `<Suspense>` es independiente de verdad (no importa en qué
 * orden resuelvan los otros), sin repetir la consulta a la base ni compartir un `Set` mutable entre streams.
 * "Tus planes" no les quita eventos (OL-221): ver `calcularCarrilesAgenda`, `lib/inicio.ts`.
 */
export default async function CarrilAgenda({ agendaPromise, avisos, verTodosHref, ...carril }: { agendaPromise: Promise<Agenda>; avisos: AvisosLista | null; verTodosHref: string } & Parte) {
  const agenda = await agendaPromise;
  const ahora = new Date();
  const carriles = calcularCarrilesAgenda(agenda, ahora);
  const comun = { asistencias: agenda.asistencias, avisos, verTodos: { href: verTodosHref, etiqueta: "Ver la agenda" } };
  if (carril.parte === "nuevos") {
    const tarjetas = carriles.nuevos.map((e) => ({ ...tarjetaEvento(e, ahora), creado_en: e.creado_en }));
    return <CarrilNuevos {...comun} ciudad={carril.ciudad} tarjetas={tarjetas} titulo="Nuevos eventos" tamano="mediana" memoria="inicio-nuevos" />;
  }
  const datos = carril.parte === "estelar" ? { titulo: carriles.titulo, eventos: carriles.estelar, tamano: "grande" as const, memoria: "inicio-estelar" } : { titulo: "Esta semana", eventos: carriles.estaSemana, tamano: "mediana" as const, memoria: "inicio-esta-semana" };
  return <CarrilEventosCliente {...comun} tarjetas={datos.eventos.map((e) => tarjetaEvento(e, ahora))} titulo={datos.titulo} tamano={datos.tamano} memoria={datos.memoria} />;
}
