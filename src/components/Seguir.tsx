"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import ConsentimientoAvisos from "@/components/ConsentimientoAvisos";
import Hecho from "@/components/Hecho";
import Hoja from "@/components/ui/Hoja";
import { IconoMas, IconoOk } from "@/components/ui/Iconos";
import ficha from "@/components/ui/Ficha.module.css";
import { hayQuePreguntar } from "@/lib/avisosPreguntados";
import { anotarIntencion, tomarIntencion } from "@/lib/intencionAvisos";
import { enEste } from "@/lib/plataforma";
import { useEstadoPush, usePlataforma } from "@/lib/useAvisosTelefono";

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
 * (bitácora 085).
 */
export default function Seguir({ que, nombre, sigo, conSesion, cuenta, accion, hrefEntrar, avisosPreguntado, avisosCorreo, correo, llavePush }: Props) {
  const router = useRouter();
  const plataforma = usePlataforma();
  const [pendiente, iniciar] = useTransition();
  const [estado, fijar] = useOptimistic(sigo, (_a, nuevo: boolean) => nuevo);
  const [hoja, setHoja] = useState(false);
  const [fallo, setFallo] = useState<{ nuevo: boolean; vez: number } | null>(null);
  const [telefono] = useEstadoPush(llavePush, conSesion && sigo);
  const cosas = que === "artista" ? "fechas" : "eventos";
  const ruta = hrefEntrar.split("?")[0];

  // Volvió de entrar tras tocar Seguir: la pregunta continúa ese toque, una sola vez.
  useEffect(() => {
    if (conSesion && sigo && hayQuePreguntar(cuenta, avisosPreguntado) && tomarIntencion(ruta)) queueMicrotask(() => setHoja(true));
  }, [conSesion, sigo, cuenta, avisosPreguntado, ruta]);

  function cambiar(nuevo: boolean) {
    iniciar(async () => {
      fijar(nuevo);
      let guardado = false;
      try {
        guardado = await accion(nuevo);
      } catch {
        guardado = false;
      }
      if (!guardado) {
        setFallo((f) => ({ nuevo, vez: (f?.vez ?? 0) + 1 }));
        return;
      }
      // La pregunta solo tras guardar, y no si esta cuenta ya contestó en esta visita (la ficha puede venir de una copia de hace un rato).
      if (nuevo && hayQuePreguntar(cuenta, avisosPreguntado)) setHoja(true);
    });
  }
  function cerrarHoja() {
    setHoja(false);
    router.refresh(); // la promesa de la barra lee el consentimiento recién guardado
  }

  const canales = [avisosCorreo && "por correo", telefono === "encendido" && enEste(plataforma)].filter(Boolean);
  const promesa = canales.length ? `Te avisamos ${canales.join(" y ")} de sus ${cosas}` : avisosPreguntado ? "Sin avisos; se cambia en Ajustes" : null;

  if (!conSesion) {
    return (
      <div className={`${ficha.accionFija} ${ficha.accionUnica}`}>
        <Link href={`/entrar?siguiente=${encodeURIComponent(hrefEntrar)}`} className={ficha.primaria} onClick={() => anotarIntencion(ruta)}>
          <IconoMas width={20} height={20} />
          Seguir
        </Link>
      </div>
    );
  }
  return (
    <>
      {estado ? (
        <div className={`${ficha.accionFija} ${ficha.accionEstado}`}>
          <span className={ficha.seleccionado} aria-live="polite">
            <IconoOk width={20} height={20} />
            Sigues
            {promesa && <small>{promesa}</small>}
          </span>
          <button type="button" className={ficha.secundario} onClick={() => cambiar(false)} disabled={pendiente}>
            Dejar de seguir
          </button>
        </div>
      ) : (
        <div className={`${ficha.accionFija} ${ficha.accionUnica}`}>
          <button type="button" className={ficha.primaria} onClick={() => cambiar(true)} disabled={pendiente}>
            <IconoMas width={20} height={20} />
            Seguir
          </button>
        </div>
      )}
      {fallo && <Hecho key={fallo.vez} texto="No se pudo guardar" etiqueta="Reintentar" fallo sobreBarra onDeshacer={() => cambiar(fallo.nuevo)} onCerrar={() => setFallo((f) => (f?.vez === fallo.vez ? null : f))} />}
      {hoja && (
        <Hoja etiqueta="Avisos" onCerrar={cerrarHoja}>
          <ConsentimientoAvisos contexto={que === "artista" ? "seguir-artista" : "seguir"} titulo={nombre} cuenta={cuenta} correo={correo} llavePush={llavePush} onListo={cerrarHoja} />
        </Hoja>
      )}
    </>
  );
}
