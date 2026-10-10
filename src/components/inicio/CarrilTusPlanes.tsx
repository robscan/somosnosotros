import type { Persona } from "@/app/personas/consultas";
import type { AvisosLista } from "@/components/useSeguirEnLista";
import { carrilTusPlanes } from "@/lib/inicio";
import { tarjetaDeInicio } from "@/lib/tarjetaInicio";
import CarrilEventosCliente from "./CarrilEventosCliente";

/**
 * «Tus planes» (nuevo, OL-219, solo con sesión): los próximos eventos donde la persona ya dijo Voy o Me interesa,
 * juntos y por fecha. Reutiliza `cargarPersona()` tal cual (la misma consulta de Mi perfil, ya filtrada a solo
 * futuros): sin dato nuevo. La marca no es una pieza nueva: el chip violeta «Te interesa» de los demás carriles de eventos; «Vas» no se
 * dice (OL-370; founder: «si son mis planes decir que vas es redundante») — aquí
 * las `asistencias` se arman directo de las dos listas (todo lo que entra a Tus planes es, por definición, una de
 * las dos). Sin sesión (`personaPromise` resuelve `null`) o sin nada próximo, esta lista (`tarjetas`) llega vacía;
 * `CarrilEventosCliente`, en el cliente, puede completarla igual (OL-224, ver abajo), y solo si de verdad no hay
 * nada que agregar `Destacados` colapsa sin hueco, igual que cualquier otro carril vacío.
 *
 * `tusPlanes` (OL-222, bitácora 251): esta lista, a diferencia de los demás carriles de eventos, sí pierde una
 * tarjeta cuando la persona la quita (ver `CarrilEventosCliente`) — es la única que tiene sentido con "ya no vas
 * ni te interesa". Y, al revés (OL-224, bitácora 253): gana al instante la tarjeta de un evento recién decidido en
 * cualquier otra fila de Inicio, aunque esta lista (armada aquí, en el servidor) todavía no la traiga — lo agrega
 * `tarjetasTusPlanes` en el cliente, con el recuerdo de la visita (`lib/decisionesVisita`).
 */
export default async function CarrilTusPlanes({ personaPromise, avisos, verTodosHref }: { personaPromise: Promise<Persona | null>; avisos: AvisosLista | null; verTodosHref: string }) {
  const persona = await personaPromise;
  const ahora = new Date();
  const eventos = persona ? carrilTusPlanes(persona.eventos, persona.interesan) : [];
  const asistencias: Record<string, "voy" | "me_interesa"> = {};
  for (const e of persona?.eventos ?? []) asistencias[e.id] = "voy";
  for (const e of persona?.interesan ?? []) asistencias[e.id] = "me_interesa";
  return <CarrilEventosCliente tarjetas={eventos.map((e) => tarjetaDeInicio(e, ahora))} asistencias={asistencias} avisos={avisos} titulo="Tus planes" tamano="grande" memoria="inicio-tus-planes" verTodos={{ href: verTodosHref, etiqueta: "Ver mi perfil" }} tusPlanes />;
}
