"use client";

import { useEffect, useId, useOptimistic, useRef, useState, useTransition } from "react";
import ConsentimientoAvisos from "@/components/ConsentimientoAvisos";
import Boton from "@/components/ui/Boton";
import Hoja from "@/components/ui/Hoja";
import { IconoMarcador, IconoOk } from "@/components/ui/Iconos";
import ficha from "@/components/ui/Ficha.module.css";
import { hayQuePreguntar } from "@/lib/avisosPreguntados";
import { anotarIntencion, tomarIntencion } from "@/lib/intencionAvisos";
import { esElUltimo, siSigueSiendoElUltimo, tocar, type Toques } from "@/lib/toques";
import { AvisoAbajo, HojaAbierta, useCanalDeListas, useCanalDePantalla } from "@/components/useCanalDeListas";
import { hrefEvento } from "@/lib/eventos";
import { borrarDecisionesVisita } from "@/lib/decisionesVisita";
import { datosAsistencia, medirCliente } from "@/lib/medir";
import { cambiarAsistencia, type EstadoAsistencia } from "../acciones";

type Props = {
  eventoId: string;
  eventoSlug?: string | null;
  titulo: string;
  miEstado: EstadoAsistencia;
  conSesion: boolean;
  /** El id de quien mira ("" sin sesión), para la pregunta de avisos. */
  cuenta: string;
  /** Ya se le preguntó por los avisos; no se vuelve a preguntar. */
  avisosPreguntado: boolean;
  /** Correo enmascarado, para la confirmación. */
  correo: string;
  llavePush: string;
  /** Una exposición o un festival (OL-321): solo «Me interesa»; no hay un día al que decir «Voy» (doc 55 §3). */
  soloInteres?: boolean;
};

/**
 * Las dos pastillas flotantes de la ficha (docs/rediseno/50, P6): «Me interesa» y «Voy». Cada una es un conmutador: tocarla
 * decide y volver a tocarla lo quita. Decidido, «Voy» pasa a «Vas» (verde, con su palomita) y «Me interesa» a «Te interesa» (con el
 * marcador lleno); sin nota dentro de la pastilla. Sin sesión, las pastillas llevan a entrar y la decisión se aplica al volver. La
 * hoja de avisos sale tras el toque de «Voy» (o al volver de entrar tras tocarlo), nunca sola al abrir la ficha (decisión 6 de
 * docs/rediseno/17). Si no se pudo guardar (o no hay red), la pastilla vuelve a como estaba y un aviso ofrece Reintentar, como en las
 * listas (bitácora 085). Cada toque lleva su número (lib/toques): uno nuevo cierra el aviso de un fallo anterior, y Reintentar solo
 * actúa si su toque sigue siendo el último. El aviso y la pregunta son de toda la pantalla (useCanalDeListas), como en las demás fichas.
 */
export default function Asistencia({ eventoId, eventoSlug, titulo, miEstado, conSesion, cuenta, avisosPreguntado, correo, llavePush, soloInteres = false }: Props) {
  // Sin `pendiente`: la pastilla no se apaga ni late mientras el servidor confirma (OL-354, bitácora 385); lo optimista ya
  // la dejó en su estado final al tocar, y solo vuelve atrás, una vez, si no se pudo guardar.
  const [, iniciar] = useTransition();
  const [estado, fijarOptimista] = useOptimistic<EstadoAsistencia, EstadoAsistencia>(miEstado, (_a, nuevo) => nuevo);
  const [hoja, setHoja] = useState(false);
  const toques = useRef<Toques>({});
  const propio = useCanalDeListas();
  const dePantalla = useCanalDePantalla();
  const canal = dePantalla ?? propio;
  const { avisar, limpiar, tomarPregunta } = canal;
  // El dueño de sus avisos en la pantalla: al tocar quita el suyo, nunca el Reintentar de un renglón.
  const de = useId();
  const ruta = hrefEvento({ id: eventoId, slug: eventoSlug });

  // Volvió de entrar tras tocar "Voy": la pregunta continúa ese toque, una sola vez.
  useEffect(() => {
    if (conSesion && miEstado === "voy" && hayQuePreguntar(cuenta, avisosPreguntado) && tomarIntencion(ruta) && tomarPregunta()) queueMicrotask(() => setHoja(true));
  }, [conSesion, miEstado, cuenta, avisosPreguntado, ruta, tomarPregunta]);

  function cambiar(nuevo: EstadoAsistencia) {
    const previo = estado;
    const vez = tocar(toques.current, eventoId);
    limpiar(de);
    iniciar(async () => {
      fijarOptimista(nuevo);
      let guardado = false;
      try {
        guardado = await cambiarAsistencia(eventoId, nuevo);
      } catch {
        guardado = false;
      }
      // Guardado desde la ficha: la acción revalida en el acto (sin `diferir`), así que el router tira sus copias y cada
      // pantalla se vuelve a pedir fresca. El recuerdo de la visita (OL-222) ya no hace falta y, si se quedara, una
      // decisión vieja tomada en una lista podría ganarle a esta más nueva: se borra.
      if (guardado) borrarDecisionesVisita();
      const medido = guardado ? datosAsistencia(nuevo, previo) : null;
      if (medido) medirCliente("asistencia", medido);
      if (!esElUltimo(toques.current, eventoId, vez)) return;
      if (!guardado) {
        avisar({ texto: "No se pudo guardar", etiqueta: "Reintentar", fallo: true, de, boton: siSigueSiendoElUltimo(toques.current, eventoId, vez, () => cambiar(nuevo)) });
        return;
      }
      // La pregunta solo tras guardar, una por pantalla, y no si esta cuenta ya contestó en esta visita.
      if (nuevo === "voy" && hayQuePreguntar(cuenta, avisosPreguntado) && tomarPregunta()) setHoja(true);
    });
  }
  const entrar = (accion: string) => `/entrar?siguiente=${encodeURIComponent(`${ruta}?accion=${accion}`)}`;

  const voy = estado === "voy";
  const interesa = estado === "me_interesa";

  return (
    <>
      <div className={ficha.flotantes} data-flotantes>
        {conSesion ? (
          <>
            <Boton type="button" variante="secundario" ancho="contenido" flotante aria-pressed={interesa} onClick={() => cambiar(interesa ? null : "me_interesa")}>
              <IconoMarcador width={20} height={20} fill={interesa ? "currentColor" : "none"} />
              {interesa ? "Te interesa" : "Me interesa"}
            </Boton>
            {!soloInteres && (
              <Boton type="button" ancho="contenido" flotante aria-pressed={voy} onClick={() => cambiar(voy ? null : "voy")}>
                <IconoOk width={20} height={20} />
                {voy ? "Vas" : "Voy"}
              </Boton>
            )}
          </>
        ) : (
          <>
            <Boton href={entrar("me_interesa")} variante="secundario" ancho="contenido" flotante>
              <IconoMarcador width={20} height={20} />
              Me interesa
            </Boton>
            {!soloInteres && (
              <Boton href={entrar("voy")} ancho="contenido" flotante onClick={() => anotarIntencion(ruta)}>
                <IconoOk width={20} height={20} />
                Voy
              </Boton>
            )}
          </>
        )}
      </div>
      {!dePantalla && <AvisoAbajo canal={propio} />}
      {hoja && <HojaAbierta canal={canal} />}
      {hoja && (
        <Hoja etiqueta="Avisos" onCerrar={() => setHoja(false)}>
          <ConsentimientoAvisos contexto="voy" titulo={titulo} cuenta={cuenta} correo={correo} llavePush={llavePush} onListo={() => setHoja(false)} calendarioUrl={`${ruta}/calendario`} />
        </Hoja>
      )}
    </>
  );
}
