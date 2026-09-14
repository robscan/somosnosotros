"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import ConsentimientoAvisos from "@/components/ConsentimientoAvisos";
import Hoja from "@/components/ui/Hoja";
import { IconoOk } from "@/components/ui/Iconos";
import ficha from "@/components/ui/Ficha.module.css";

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
  avisosPush: boolean;
  /** Correo enmascarado, para la confirmación. */
  correo: string;
  llavePush: string;
};

/**
 * Barra inferior pegajosa: "Seguir" lleno a lo ancho. Con decisión, estado "✓ Sigues" con la promesa concreta
 * (por correo, en el teléfono, o sin avisos) y "Dejar de seguir". Sin sesión, lleva a entrar y se aplica al volver.
 * La primera vez que sigue algo sin haber sido preguntado, emerge la hoja de avisos. Lugares (decisión 9) y Artistas (decisión 9).
 */
export default function Seguir({ que, nombre, sigo, conSesion, accion, hrefEntrar, avisosPreguntado, avisosCorreo, avisosPush, correo, llavePush }: Props) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [estado, fijar] = useOptimistic(sigo, (_a, nuevo: boolean) => nuevo);
  const [hoja, setHoja] = useState(!avisosPreguntado && sigo && conSesion);
  const cosas = que === "artista" ? "fechas" : "eventos";

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

  const canales = [avisosCorreo && "por correo", avisosPush && "en el teléfono"].filter(Boolean);
  const promesa = canales.length ? `Te avisamos ${canales.join(" y ")} de sus ${cosas}` : avisosPreguntado ? "Sin avisos; se cambia en Mi perfil" : `Te avisamos de sus ${cosas}`;

  if (!conSesion) {
    return (
      <div className={`${ficha.accionFija} ${ficha.accionUnica}`}>
        <Link href={`/entrar?siguiente=${encodeURIComponent(hrefEntrar)}`} className={ficha.primaria}>
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
            <span>
              Sigues
              <small>{promesa}</small>
            </span>
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
