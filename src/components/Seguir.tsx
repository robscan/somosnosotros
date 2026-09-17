"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import ConsentimientoAvisos from "@/components/ConsentimientoAvisos";
import Hoja from "@/components/ui/Hoja";
import { IconoOk } from "@/components/ui/Iconos";
import ficha from "@/components/ui/Ficha.module.css";
import { anotarIntencion, tomarIntencion } from "@/lib/intencionAvisos";
import { enEste } from "@/lib/plataforma";
import { useEstadoPush, usePlataforma } from "@/lib/useAvisosTelefono";

type Props = {
  /** Lugar ("sus eventos") o artista ("sus fechas"): cambia la promesa y la hoja de avisos. */
  que: "lugar" | "artista";
  nombre: string;
  sigo: boolean;
  conSesion: boolean;
  /** Acción del servidor ya ligada al lugar o artista: seguir (true) o dejar de seguir (false). */
  accion: (seguir: boolean) => Promise<void>;
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
 */
export default function Seguir({ que, nombre, sigo, conSesion, accion, hrefEntrar, avisosPreguntado, avisosCorreo, correo, llavePush }: Props) {
  const router = useRouter();
  const plataforma = usePlataforma();
  const [pendiente, iniciar] = useTransition();
  const [estado, fijar] = useOptimistic(sigo, (_a, nuevo: boolean) => nuevo);
  const [hoja, setHoja] = useState(false);
  const [telefono] = useEstadoPush(llavePush, conSesion && sigo);
  const cosas = que === "artista" ? "fechas" : "eventos";
  const ruta = hrefEntrar.split("?")[0];

  // Volvió de entrar tras tocar Seguir: la pregunta continúa ese toque, una sola vez.
  useEffect(() => {
    if (conSesion && sigo && !avisosPreguntado && tomarIntencion(ruta)) queueMicrotask(() => setHoja(true));
  }, [conSesion, sigo, avisosPreguntado, ruta]);

  function cambiar(nuevo: boolean) {
    iniciar(async () => {
      fijar(nuevo);
      await accion(nuevo);
      if (nuevo && !avisosPreguntado) setHoja(true);
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
            Seguir
          </button>
        </div>
      )}
      {hoja && (
        <Hoja etiqueta="Avisos" onCerrar={cerrarHoja}>
          <ConsentimientoAvisos contexto={que === "artista" ? "seguir-artista" : "seguir"} titulo={nombre} correo={correo} llavePush={llavePush} onListo={cerrarHoja} />
        </Hoja>
      )}
    </>
  );
}
