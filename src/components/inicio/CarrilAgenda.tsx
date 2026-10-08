import type { AvisosLista } from "@/components/useSeguirEnLista";
import type { Agenda } from "@/lib/cargarAgenda";
import { tarjetaConClase, tarjetaEvento } from "@/lib/destacados";
import { calcularCarrilesAgenda } from "@/lib/inicio";
import CarrilEventosCliente from "./CarrilEventosCliente";
import CarrilNuevos from "./CarrilNuevos";

/** «Nuevos» además necesita la ciudad: su última visita (la que decide qué es nuevo en este teléfono) es de esa ciudad. */
type Parte = { parte: "estelar" | "estaSemana" | "festivales" } | { parte: "nuevos"; ciudad: string };

/**
 * Componente de servidor: espera la misma `cargarAgenda` que comparten los carriles "Seleccionados para ti"
 * (o "Destacados"), "Esta semana" y "Nuevos eventos" (OL-156, segunda vuelta; "Esta semana" y el criterio nuevo de
 * "Nuevos eventos", OL-219; "Festivales y exposiciones", OL-342, antes "Para visitar", OL-322) — una consulta, no cuatro —
 * y recalcula los carriles completos de forma pura para quedarse solo con el suyo: así cada `<Suspense>` es independiente de verdad (no importa en qué
 * orden resuelvan los otros), sin repetir la consulta a la base ni compartir un `Set` mutable entre streams.
 * Lo que ya está en «Tus planes» al cargar no sale en ninguno de los tres: ver `calcularCarrilesAgenda`, `lib/inicio.ts`.
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
  // «Festivales y exposiciones» (OL-342): cada tarjeta dice qué es en su rótulo («Festival», «Exposición»: `tarjetaConClase`).
  // Va con la tarjeta grande, la de «Destacados» (founder, 2026-10-08, OL-347: «a los festivales ponles tamaño de eventos
  // estelares»); un carril tiene un solo tamaño, así que las exposiciones también.
  const datos =
    carril.parte === "estelar"
      ? { titulo: carriles.titulo, tarjetas: carriles.estelar.map((e) => tarjetaEvento(e, ahora)), tamano: "grande" as const, memoria: "inicio-estelar" }
      : carril.parte === "festivales"
        ? { titulo: "Festivales y exposiciones", tarjetas: carriles.festivales.map((e) => tarjetaConClase(e, ahora)), tamano: "grande" as const, memoria: "inicio-festivales" }
        : { titulo: "Esta semana", tarjetas: carriles.estaSemana.map((e) => tarjetaEvento(e, ahora)), tamano: "mediana" as const, memoria: "inicio-esta-semana" };
  return <CarrilEventosCliente {...comun} tarjetas={datos.tarjetas} titulo={datos.titulo} tamano={datos.tamano} memoria={datos.memoria} />;
}
