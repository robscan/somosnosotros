"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import { cambiarAsistencia } from "@/app/eventos/acciones";
import { hayQuePreguntar } from "@/lib/avisosPreguntados";
import { corregirAsistencias, guardarDecisionAsistencia, limpiarAsistenciasResueltas } from "@/lib/decisionesVisita";
import type { TarjetaConFecha } from "@/lib/destacados";
import { hrefEvento } from "@/lib/eventos";
import { asistenciaTras, claveVoy, recortar, textoHecho, type Asistencia, type ClaveAccion } from "@/lib/deslizar";
import { anotarIntencion } from "@/lib/intencionAvisos";
import { alRecibir, elegir, esElUltimo, siSigueSiendoElUltimo, tocar, trasGuardar, type Elegidas, type Toques } from "@/lib/toques";
import ConsentimientoAvisos from "./ConsentimientoAvisos";
import type { EstadoBotonRenglon } from "./ui/BotonRenglon";
import Hoja from "./ui/Hoja";
import { AvisoAbajo, HojaAbierta, useCanalDeListas, type CanalDeListas } from "./useCanalDeListas";
import type { AvisosLista } from "./useSeguirEnLista";

/** Lo que la persona decidió en cada evento cargado; null = sin sesión. */
export type Decididas = Record<string, Exclude<Asistencia, null>> | null;
/** El resto de `TarjetaConFecha` es opcional: solo lo trae una tarjeta de carril (Inicio); un renglón de Agenda o de
 *  una ficha (`EventoAgenda`) no lo tiene, y por eso no guarda tarjeta para «Tus planes» (OL-224, ver `tarjetaDe`). */
type EventoLista = { id: string; slug?: string | null; titulo: string } & Partial<Omit<TarjetaConFecha, "id" | "titulo">>;

/** La tarjeta de este renglón, si trae lo mínimo para pintarse sola en «Tus planes» (OL-224, bitácora 253): solo las
 *  tarjetas de carril (`Destacados`, con `tarjetaEvento`) lo traen completo; un renglón de Agenda/ficha, no. */
function tarjetaDe(e: EventoLista): TarjetaConFecha | null {
  if (e.href === undefined || e.foto === undefined || e.detalle === undefined || e.van === undefined || e.inicio === undefined || e.fin === undefined || e.zona === undefined) return null;
  return { id: e.id, href: e.href, foto: e.foto, titulo: e.titulo, detalle: e.detalle, van: e.van, reciente: e.reciente, inicio: e.inicio, fin: e.fin, zona: e.zona };
}

/**
 * El botón "Voy"/"Vas" del renglón (OL-104, bitácora 139; antes, deslizar: OL-056, bitácora 085): lo que la persona
 * decidió, el botón único del renglón, el aviso con Deshacer y, tras el primer Voy guardado, la misma pregunta de
 * avisos que la ficha. "Me interesa" ya no tiene botón en la lista, se cambia en la ficha. Guarda con la misma acción
 * de la ficha, así el estado es uno solo; sin sesión, lleva a entrar y la ficha lo aplica al volver. Si no se pudo
 * guardar, deshace lo mostrado y ofrece Reintentar, sin tumbar la pantalla.
 *
 * Lo que llega del servidor manda (al volver de la ficha, en la respuesta de la acción): lo elegido aquí se superpone
 * solo mientras se guarda. Cada toque lleva su número por renglón (lib/toques): lo que trae un guardado viejo se ignora.
 *
 * `decididas` puede venir de una página vieja (Next la reutiliza hasta 60 s, y siempre con Atrás/Adelante) que no
 * conoce lo decidido en esta visita (OL-222, bitácora 251, `lib/decisionesVisita`): se corrige con lo guardado en el
 * teléfono para esta cuenta antes de usarse, y lo que el servidor ya refleje se limpia solo.
 *
 * Al guardar bien, además de la corrección, se guarda junto con la decisión la tarjeta del renglón, si la trae
 * (`tarjetaDe`; OL-224, bitácora 253): con eso, «Tus planes» puede agregarla al instante aunque el toque haya sido en
 * otra fila de Inicio (Destacados, Esta semana, Populares, Nuevos, Cerca de ti…) — este hook no sabe nada de "Tus
 * planes", solo dejar la miga; quien la recoge es `tarjetasTusPlanes`, en `CarrilEventosCliente`.
 *
 * `canal`: el aviso y la pregunta de avisos compartidos con las otras listas de la pantalla (useCanalDeListas); sin él,
 * la lista tiene los suyos y pinta su aviso en `extras`.
 */
export function useAsistenciaEnLista(decididas: Decididas, avisos: AvisosLista | null, canal?: CanalDeListas): { estado: (id: string) => Asistencia; guardado: (id: string) => Asistencia; fallos: number; boton: (e: EventoLista) => EstadoBotonRenglon; extras: ReactNode } {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [elegidas, setElegidas] = useState<Elegidas<Asistencia>>({});
  const [recibidas, setRecibidas] = useState(decididas);
  if (decididas !== recibidas) {
    setRecibidas(decididas);
    setElegidas(alRecibir);
  }
  const cuenta = avisos?.cuenta ?? null;
  const corregidas = corregirAsistencias(cuenta, decididas);
  useEffect(() => {
    limpiarAsistenciasResueltas(cuenta, decididas);
  }, [cuenta, decididas]);
  const toques = useRef<Toques>({});
  // ¿La lista sigue en la pantalla? El canal es de la pantalla y la sobrevive (Lugares, con Mapa y Lista): un guardado
  // que termina cuando la lista ya no está no puede tomar la pregunta, porque nadie pintaría la hoja ni la soltaría.
  const vivo = useRef(true);
  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);
  const propio = useCanalDeListas();
  const { avisar, tomarPregunta } = canal ?? propio;
  // El dueño de sus avisos en la pantalla: nadie más los limpia sin poner otro en su lugar.
  const de = useId();
  const [hoja, setHoja] = useState<EventoLista | null>(null);
  // Cuántos guardados han fallado: quien pinte pestañas devuelve lo que añadió un toque que no se guardó.
  const [fallos, setFallos] = useState(0);

  // Sin datos para preguntar, la hoja se cierra de verdad: si no, quedaría "abierta" sin pintarse, con la pantalla muda
  // y la pregunta trabada.
  if (hoja && !avisos) setHoja(null);

  const estado = (id: string): Asistencia => (id in elegidas ? elegidas[id].valor : (corregidas?.[id] ?? null));
  /** Lo mismo, pero solo con lo que ya quedó guardado: lo que se está guardando (y lo que falló) no cuenta. */
  const guardado = (id: string): Asistencia => (elegidas[id]?.guardada ? elegidas[id].valor : (corregidas?.[id] ?? null));

  /**
   * Un toque: muestra `valor` al momento y lo guarda. Si al terminar ya hubo otro toque en el renglón, no hace nada más.
   * Si no se pudo guardar, quita lo mostrado y ofrece `reintentar`; si se guardó, `alGuardar`. Devuelve el número del toque.
   */
  function guardar(e: EventoLista, valor: Asistencia, reintentar: () => void, alGuardar?: () => void): number {
    const vez = tocar(toques.current, e.id);
    setElegidas((x) => elegir(x, e.id, valor, vez));
    iniciar(async () => {
      let guardado = false;
      try {
        // `diferir: true` (OL-212, tercera vuelta): mismo motivo que useSeguirEnLista.tsx.
        guardado = await cambiarAsistencia(e.id, valor, true);
      } catch {
        guardado = false;
      }
      if (!esElUltimo(toques.current, e.id, vez)) return;
      setElegidas((x) => trasGuardar(x, e.id, vez, guardado));
      if (!guardado) {
        setFallos((n) => n + 1);
        avisar({ texto: `No se pudo guardar «${recortar(e.titulo)}»`, boton: siSigueSiendoElUltimo(toques.current, e.id, vez, reintentar), etiqueta: "Reintentar", fallo: true, de });
        return;
      }
      if (cuenta) guardarDecisionAsistencia(cuenta, e.id, valor, undefined, valor === null ? null : tarjetaDe(e));
      alGuardar?.();
    });
    return vez;
  }

  function hacer(e: EventoLista, clave: ClaveAccion, previo: Asistencia) {
    const nuevo = asistenciaTras(clave);
    const vez = guardar(
      e,
      nuevo,
      () => hacer(e, clave, previo),
      () => {
        // La pregunta, tras el primer Voy guardado de la pantalla; no si esta cuenta ya contestó en esta visita (la página
        // puede ser de hace un rato). Se toma al guardar, no al pintar: dos Voy seguidos no la hacen dos veces.
        if (!vivo.current || nuevo !== "voy" || !avisos || !hayQuePreguntar(avisos.cuenta, avisos.preguntado) || !tomarPregunta()) return;
        setHoja(e);
      },
    );
    avisar({ texto: textoHecho(clave, e.titulo), boton: siSigueSiendoElUltimo(toques.current, e.id, vez, () => deshacer(e, previo)), de });
  }

  function deshacer(e: EventoLista, previo: Asistencia) {
    guardar(e, previo, () => deshacer(e, previo));
  }

  /**
   * El botón único del renglón (OL-104; solo icono desde OL-106): invita a Voy —también desde "Me interesa", que ya
   * no tiene botón propio en la lista— o, decidido, lo quita (como antes "No voy" al deslizar).
   */
  function boton(e: EventoLista): EstadoBotonRenglon {
    const previo = estado(e.id);
    const clave = claveVoy(previo);
    const decidido = previo === "voy";
    const ruta = hrefEvento(e);
    return {
      decidido,
      // El nombre no cambia con el estado (sería contradictorio con `aria-pressed`, que ya lo dice): "conmutador presionado"
      // con un nombre que dice "ya no vas" suena al revés.
      nombreAccesible: `Voy — ${e.titulo}`,
      alTocar: () => {
        if (decididas === null) {
          // Sin sesión: la ficha aplica la acción al volver de entrar (y, tras Voy, hace la pregunta de avisos una vez).
          const nuevo = asistenciaTras(clave);
          if (nuevo === "voy") anotarIntencion(ruta);
          router.push(`/entrar?siguiente=${encodeURIComponent(`${ruta}?accion=${nuevo ?? ""}`)}`);
          return;
        }
        hacer(e, clave, previo);
      },
    };
  }

  const extras = (
    <>
      {!canal && <AvisoAbajo canal={propio} />}
      {hoja && avisos && <HojaAbierta canal={canal ?? propio} />}
      {hoja && avisos && (
        <Hoja etiqueta="Avisos" onCerrar={() => setHoja(null)}>
          <ConsentimientoAvisos contexto="voy" titulo={hoja.titulo} cuenta={avisos.cuenta} correo={avisos.correo} llavePush={avisos.llavePush} onListo={() => setHoja(null)} calendarioUrl={`${hrefEvento(hoja)}/calendario`} />
        </Hoja>
      )}
    </>
  );

  return { estado, guardado, fallos, boton, extras };
}
