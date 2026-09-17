"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useOptimistic, useRef, useState, useTransition } from "react";
import ConsentimientoAvisos from "@/components/ConsentimientoAvisos";
import Hoja from "@/components/ui/Hoja";
import { IconoMas, IconoOk } from "@/components/ui/Iconos";
import ficha from "@/components/ui/Ficha.module.css";
import { useAltoBarraFija } from "@/components/ui/useAltoBarraFija";
import { hayQuePreguntar } from "@/lib/avisosPreguntados";
import { anotarIntencion, tomarIntencion } from "@/lib/intencionAvisos";
import { enEste } from "@/lib/plataforma";
import { esElUltimo, siSigueSiendoElUltimo, tocar, type Toques } from "@/lib/toques";
import { useEstadoPush, usePlataforma } from "@/lib/useAvisosTelefono";
import { AvisoAbajo, HojaAbierta, useCanalDeListas, useCanalDePantalla } from "./useCanalDeListas";

type Props = {
  /** Lugar ("sus eventos") o artista ("sus fechas"): cambia la promesa y la hoja de avisos. */
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
  avisosCorreo: boolean;
  /** Correo enmascarado, para la confirmación. */
  correo: string;
  llavePush: string;
};

/**
 * Barra inferior pegajosa: "Seguir" lleno a lo ancho. Con decisión, estado "✓ Sigues" con la promesa concreta y
 * "Dejar de seguir". Sin sesión, lleva a entrar y se aplica al volver. Lugares (decisión 9) y Artistas (decisión 9).
 * Con docs/rediseno/17: la pregunta de avisos sale tras el toque de Seguir (o al volver de entrar tras tocarlo), nunca sola
 * al abrir la ficha (decisión 6); la promesa dice "en este teléfono" solo si este teléfono está dado de alta (decisión 5).
 * Si no se pudo guardar (o no hay red), la barra vuelve a como estaba y un aviso ofrece Reintentar, como en las listas
 * (bitácora 085). Cada toque lleva su número (lib/toques): uno nuevo cierra el aviso de un fallo anterior, y Reintentar
 * solo actúa si su toque sigue siendo el último. El aviso y la pregunta son de toda la pantalla (useCanalDeListas): en una
 * ficha los comparte con su lista de eventos, así no se encinan ni se pregunta dos veces (OL-057).
 */
export default function Seguir({ que, nombre, sigo, conSesion, cuenta, accion, hrefEntrar, avisosPreguntado, avisosCorreo, correo, llavePush }: Props) {
  const router = useRouter();
  const plataforma = usePlataforma();
  const [pendiente, iniciar] = useTransition();
  const [estado, fijar] = useOptimistic(sigo, (_a, nuevo: boolean) => nuevo);
  const [hoja, setHoja] = useState(false);
  const toques = useRef<Toques>({});
  const barra = useAltoBarraFija<HTMLDivElement>();
  const propio = useCanalDeListas();
  const dePantalla = useCanalDePantalla();
  const canal = dePantalla ?? propio;
  const { avisar, limpiar, tomarPregunta } = canal;
  // El dueño de sus avisos en la pantalla: al tocar quita el suyo, nunca el Reintentar de un renglón.
  const de = useId();
  const [telefono] = useEstadoPush(llavePush, conSesion && sigo);
  const cosas = que === "artista" ? "fechas" : "eventos";
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
      if (!esElUltimo(toques.current, ruta, vez)) return;
      if (!guardado) {
        avisar({ texto: "No se pudo guardar", etiqueta: "Reintentar", fallo: true, de, boton: siSigueSiendoElUltimo(toques.current, ruta, vez, () => cambiar(nuevo)) });
        return;
      }
      // La pregunta solo tras guardar, una por pantalla, y no si esta cuenta ya contestó en esta visita.
      if (nuevo && hayQuePreguntar(cuenta, avisosPreguntado) && tomarPregunta()) setHoja(true);
    });
  }
  /** Se va la hoja (contestada, cerrada o cerrada sola porque el teléfono no puede con los avisos): la barra relee el
   *  consentimiento recién guardado. Soltar la pregunta lo hace `HojaAbierta` al desmontarse, venga por donde venga. */
  function cerrarHoja() {
    setHoja(false);
    router.refresh();
  }

  const canales = [avisosCorreo && "por correo", telefono === "encendido" && enEste(plataforma)].filter(Boolean);
  const promesa = canales.length ? `Te avisamos ${canales.join(" y ")} de sus ${cosas}` : avisosPreguntado ? "Sin avisos; se cambia en Ajustes" : null;

  if (!conSesion) {
    return (
      <div ref={barra} className={`${ficha.accionFija} ${ficha.accionUnica}`}>
        <Link href={`/entrar?siguiente=${encodeURIComponent(hrefEntrar)}`} className={ficha.primaria} onClick={() => anotarIntencion(ruta)}>
          <IconoMas width={20} height={20} />
          Seguir
        </Link>
      </div>
    );
  }
  return (
    <>
      <div ref={barra} className={`${ficha.accionFija} ${estado ? ficha.accionEstado : ficha.accionUnica}`}>
        {estado ? (
          <>
            <span className={ficha.seleccionado} aria-live="polite">
              <IconoOk width={20} height={20} />
              Sigues
              {promesa && <small>{promesa}</small>}
            </span>
            <button type="button" className={ficha.secundario} onClick={() => cambiar(false)} disabled={pendiente}>
              Dejar de seguir
            </button>
          </>
        ) : (
          <button type="button" className={ficha.primaria} onClick={() => cambiar(true)} disabled={pendiente}>
            <IconoMas width={20} height={20} />
            Seguir
          </button>
        )}
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
