"use client";

import { useEffect, useId, useOptimistic, useRef, useState, useTransition } from "react";
import ConsentimientoAvisos from "@/components/ConsentimientoAvisos";
import Boton from "@/components/ui/Boton";
import Hoja from "@/components/ui/Hoja";
import { IconoCampanaMas, IconoOk, IconoPersonaMas } from "@/components/ui/Iconos";
import ficha from "@/components/ui/Ficha.module.css";
import { hayQuePreguntar } from "@/lib/avisosPreguntados";
import { anotarIntencion, tomarIntencion } from "@/lib/intencionAvisos";
import { esElUltimo, siSigueSiendoElUltimo, tocar, type Toques } from "@/lib/toques";
import { AvisoAbajo, HojaAbierta, useCanalDeListas, useCanalDePantalla } from "./useCanalDeListas";
import { borrarDecisionesVisita } from "@/lib/decisionesVisita";
import { medirCliente } from "@/lib/medir";

type Props = {
  /** Lugar ("sus eventos") o artista ("sus fechas"): cambia el glifo de la pastilla y la hoja de avisos. */
  que: "lugar" | "artista";
  nombre: string;
  sigo: boolean;
  conSesion: boolean;
  /** El id de quien mira ("" sin sesión), para la pregunta de avisos. */
  cuenta: string;
  /** Acción del servidor ya ligada al lugar o artista: seguir (true) o dejar de seguir (false). Devuelve si se guardó. */
  accion: (seguir: boolean) => Promise<boolean>;
  /** A dónde volver tras entrar, con la intención de seguir ya puesta. */
  hrefEntrar: string;
  /** Ya se le preguntó por los avisos (tras un Voy o al seguir otra cosa); no se vuelve a preguntar. */
  avisosPreguntado: boolean;
  /** Correo enmascarado, para la confirmación. */
  correo: string;
  llavePush: string;
};

/**
 * La pastilla flotante de la ficha de un lugar o de un artista (docs/rediseno/50, P6): «Seguir» y, ya seguido, «Sigues» en verde con
 * su palomita; tocarla otra vez deja de seguir. Sin nota dentro de la pastilla. Sin sesión, lleva a entrar y se aplica al volver.
 * Lugares (decisión 9) y Artistas (decisión 9). Con docs/rediseno/17: la pregunta de avisos sale tras el toque de Seguir (o al volver de
 * entrar tras tocarlo), nunca sola al abrir la ficha (decisión 6). Si no se pudo guardar (o no hay red), la pastilla vuelve a como estaba
 * y un aviso ofrece Reintentar, como en las listas (bitácora 085). Cada toque lleva su número (lib/toques): uno nuevo cierra el aviso de
 * un fallo anterior, y Reintentar solo actúa si su toque sigue siendo el último. El aviso y la pregunta son de toda la pantalla
 * (useCanalDeListas): en una ficha los comparte con su lista de eventos, así no se encinan ni se pregunta dos veces (OL-057).
 */
export default function Seguir({ que, nombre, sigo, conSesion, cuenta, accion, hrefEntrar, avisosPreguntado, correo, llavePush }: Props) {
  // Sin `pendiente`: la pastilla no se apaga ni late mientras el servidor confirma (OL-354, bitácora 385); lo optimista ya
  // la dejó en su estado final al tocar, y solo vuelve atrás, una vez, si no se pudo guardar.
  const [, iniciar] = useTransition();
  const [estado, fijar] = useOptimistic(sigo, (_a, nuevo: boolean) => nuevo);
  const [hoja, setHoja] = useState(false);
  const toques = useRef<Toques>({});
  const propio = useCanalDeListas();
  const dePantalla = useCanalDePantalla();
  const canal = dePantalla ?? propio;
  const { avisar, limpiar, tomarPregunta } = canal;
  // El dueño de sus avisos en la pantalla: al tocar quita el suyo, nunca el Reintentar de un renglón.
  const de = useId();
  // Seguir es que te avisen: la campana con «+» para un lugar y la persona con «+» para un artista.
  const Glifo = que === "artista" ? IconoPersonaMas : IconoCampanaMas;
  const ruta = hrefEntrar.split("?")[0];

  // Volvió de entrar tras tocar Seguir: la pregunta continúa ese toque, una sola vez.
  useEffect(() => {
    if (conSesion && sigo && hayQuePreguntar(cuenta, avisosPreguntado) && tomarIntencion(ruta) && tomarPregunta()) queueMicrotask(() => setHoja(true));
  }, [conSesion, sigo, cuenta, avisosPreguntado, ruta, tomarPregunta]);

  function cambiar(nuevo: boolean) {
    const vez = tocar(toques.current, ruta);
    limpiar(de);
    iniciar(async () => {
      fijar(nuevo);
      let guardado = false;
      try {
        guardado = await accion(nuevo);
      } catch {
        guardado = false;
      }
      // Guardado desde la ficha: la acción revalida en el acto (sin `diferir`), así que el router tira sus copias y cada
      // pantalla se vuelve a pedir fresca. El recuerdo de la visita (OL-222) ya no hace falta y, si se quedara, una
      // decisión vieja tomada en una lista podría ganarle a esta más nueva: se borra.
      if (guardado) borrarDecisionesVisita();
      if (guardado) medirCliente("seguir", { que, cambio: nuevo ? "puesto" : "quitado" });
      if (!esElUltimo(toques.current, ruta, vez)) return;
      if (!guardado) {
        avisar({ texto: "No se pudo guardar", etiqueta: "Reintentar", fallo: true, de, boton: siSigueSiendoElUltimo(toques.current, ruta, vez, () => cambiar(nuevo)) });
        return;
      }
      // La pregunta solo tras guardar, una por pantalla, y no si esta cuenta ya contestó en esta visita.
      if (nuevo && hayQuePreguntar(cuenta, avisosPreguntado) && tomarPregunta()) setHoja(true);
    });
  }
  /** Se va la hoja (contestada, cerrada o cerrada sola porque el teléfono no puede con los avisos). Soltar la
   *  pregunta lo hace `HojaAbierta` al desmontarse, venga por donde venga. */
  function cerrarHoja() {
    setHoja(false);
  }

  if (!conSesion) {
    return (
      <div className={ficha.flotantes} data-flotantes>
        <Boton href={`/entrar?siguiente=${encodeURIComponent(hrefEntrar)}`} ancho="contenido" flotante onClick={() => anotarIntencion(ruta)}>
          <Glifo width={20} height={20} />
          Seguir
        </Boton>
      </div>
    );
  }
  return (
    <>
      <div className={ficha.flotantes} data-flotantes>
        <Boton type="button" ancho="contenido" flotante aria-pressed={estado} onClick={() => cambiar(!estado)}>
          {estado ? <IconoOk width={20} height={20} /> : <Glifo width={20} height={20} />}
          {estado ? "Sigues" : "Seguir"}
        </Boton>
      </div>
      {!dePantalla && <AvisoAbajo canal={propio} />}
      {hoja && <HojaAbierta canal={canal} />}
      {hoja && (
        <Hoja etiqueta="Avisos" onCerrar={cerrarHoja}>
          <ConsentimientoAvisos contexto={que === "artista" ? "seguir-artista" : "seguir"} titulo={nombre} cuenta={cuenta} correo={correo} llavePush={llavePush} onListo={cerrarHoja} />
        </Hoja>
      )}
    </>
  );
}
