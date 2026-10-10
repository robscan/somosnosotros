"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Decididas } from "@/components/useAsistenciaEnLista";
import { useAsistenciaEnLista } from "@/components/useAsistenciaEnLista";
import { useCanalDePantalla } from "@/components/useCanalDeListas";
import type { AvisosLista } from "@/components/useSeguirEnLista";
import { crudoDecisionesVisita, limpiarTarjetasTusPlanesResueltas, suscribirseDecisionesVisita, tarjetasTusPlanes } from "@/lib/decisionesVisita";
import type { TarjetaConFecha } from "@/lib/destacados";
import Destacados from "@/components/Destacados";
import { useCarrilResuelto } from "./EstadoCarriles";

function sinSuscripcion() {
  return () => {};
}
const sinDatosServidor = () => "";

/**
 * El carril, ya en el cliente: la parte de datos la resolvió un componente de servidor (streaming, OL-156) y le pasó
 * `tarjetas` (ya serializable, con su sello de fecha: `tarjetaDeInicio`). Desde OL-370 (tarjeta firmada, `inicio/TarjetaEvento`) las tarjetas ya
 * no llevan el botón de «Voy» (founder, 2026-10-10: «ya se resuelve en los carriles si va»; decidir queda en la ficha y en las historias): de
 * `useAsistenciaEnLista` solo se usa lo que la persona decidió (`estado`, con lo corregido de esta visita), para el chip «Te interesa» y para
 * «Tus planes». `tamano`: `grande` o `mediana` (E5).
 *
 * `tusPlanes` (OL-222, bitácora 251): solo en "Tus planes" (`CarrilTusPlanes`), una tarjeta que la persona quita
 * (Voy y Me interesa, las dos a "ya no"; desde OL-370, en la ficha o en las historias) desaparece de este carril;
 * `useAsistenciaEnLista` es quien decide el estado (con lo corregido de esta visita), así que basta con leer
 * `asistencia.estado` para filtrar. Los demás carriles (Estelar, Esta semana…) no filtran: ahí el evento se queda,
 * con su chip al día (OL-221).
 *
 * «Tus planes al instante» (OL-224, bitácora 253; desde OL-370 las tarjetas no tienen botón, así que solo quedan las que se guardaron antes):
 * también solo con `tusPlanes`, antes de filtrar se agrega lo que
 * la persona acaba de decidir en OTRA fila de Inicio y el servidor todavía no trae (`tarjetasTusPlanes`, en su lugar
 * por fecha) — así la fila aparece o gana una tarjeta sin esperar a la próxima visita, y si estaba vacía (colapsada,
 * `Destacados` con `tarjetas.length === 0`) deja de estarlo en cuanto hay algo que agregar. El toque pudo pasar en
 * otro componente (otra tira, montada aparte): `useSyncExternalStore` suscribe esta fila al recuerdo de la visita
 * (`lib/decisionesVisita`) para volver a pintar cuando cambia, aunque nada de sus propias props haya cambiado; las
 * demás filas no se suscriben (no lo necesitan: cada una ya refleja su propio toque con `asistencia.estado`).
 *
 * La tarjeta guardada se limpia con `limpiarTarjetasTusPlanesResueltas`, no con la limpieza genérica de
 * `useAsistenciaEnLista` (`limpiarAsistenciasResueltas`, que por eso nunca borra una decisión con tarjeta): esta
 * misma fila, cuando el servidor SÍ vuelve a traer el evento, es la única que puede confirmar que ya no hace falta
 * guardarla — otra pantalla (Agenda, una ficha) puede confirmar el mismo estado con datos frescos mientras esta
 * fila sigue mostrando una copia vieja (`staleTimes`, hasta 60 s, o Atrás), y borrarla ahí perdería la tarjeta antes
 * de que esta fila la usara (bug real, visto al reproducir con Chrome: ir y volver de Agenda la borraba).
 */
export default function CarrilEventosCliente({ tarjetas, asistencias, avisos, titulo, tamano, memoria, verTodos, tusPlanes = false, resuelto = true }: { tarjetas: TarjetaConFecha[]; asistencias: Decididas; avisos: AvisosLista | null; titulo: string; tamano: "grande" | "mediana"; memoria: string; verTodos: { href: string; etiqueta: string }; tusPlanes?: boolean; resuelto?: boolean }) {
  const canal = useCanalDePantalla();
  const asistencia = useAsistenciaEnLista(asistencias, avisos, canal);
  const cuenta = avisos?.cuenta ?? null;
  useSyncExternalStore(tusPlanes ? suscribirseDecisionesVisita : sinSuscripcion, tusPlanes ? crudoDecisionesVisita : sinDatosServidor, sinDatosServidor);
  // Esta lista de servidor (`tarjetas`) ya trae al día lo que antes hacía falta agregar a mano: la tarjeta guardada
  // se puede borrar (efecto, no en el render: no hay que escribir el almacén mientras se pinta).
  useEffect(() => {
    if (tusPlanes) limpiarTarjetasTusPlanesResueltas(cuenta, tarjetas);
  }, [tusPlanes, cuenta, tarjetas]);
  const visibles = tusPlanes ? tarjetasTusPlanes(cuenta, tarjetas, new Date()).filter((t) => asistencia.estado(t.id) !== null) : tarjetas;
  useCarrilResuelto(memoria, resuelto ? visibles.length : null);
  return <Destacados tarjetas={visibles} forma={tamano} memoria={memoria} encabezado={titulo} verTodos={verTodos} estadoDe={asistencia.estado} />;
}
