"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconoOk } from "@/components/ui/Iconos";
import type { MotivoReclamo } from "@/lib/reportes";
import type { ArtistaConMiCorreo, ResultadoReclamo } from "./acciones";
import { siguienteEstadoLetrero, type EstadoFinalLetrero } from "./letreroCorreoLigado";
import styles from "./LetreroCorreoLigado.module.css";

type Props = {
  artista: ArtistaConMiCorreo;
  /** `reclamarArtista`, inyectada (mismo patrón que `accion` en `FormularioEvento`): así el letrero se prueba y
   * se captura sin sesión real ni Supabase. */
  reclamar: (artistaId: string, motivo: MotivoReclamo) => Promise<ResultadoReclamo>;
};

/**
 * «Tu correo está enlazado a «Nombre»» (OL-177, pedido del founder 2026-09-24): arriba del listado de Artistas,
 * uno por cada ficha que trae `artistasConMiCorreo()` (correo del CAPO, sin reclamar todavía). Mismo tono que la
 * invitación a crear cuenta de Inicio (`Inicio.module.css`, `.invitacion`/`.crearCuenta`: título en negrita,
 * párrafo, botón violeta redondeado), reproducido aquí como `<button>` con reset de apariencia — el botón dispara
 * una acción, no navega. «Reclamar ficha» llama a `reclamarArtista(artistaId, "es_mio")`: con el correo de la
 * cuenta coincidente queda ligada al instante (L53, migración 20260922140000) y el letrero pasa a «Listo»;
 * si no, el reclamo queda pendiente para el administrador (sin duplicar si se toca más de una vez) y el letrero
 * lo dice. `router.refresh()` solo tras aprobar: trae la tarjeta nueva de «Mis artistas» arriba de este bloque.
 */
export default function LetreroCorreoLigado({ artista, reclamar }: Props) {
  const router = useRouter();
  const [resultado, setResultado] = useState<{ estado: EstadoFinalLetrero; error?: string } | null>(null);
  const [pendiente, iniciar] = useTransition();

  function reclamarFicha() {
    iniciar(async () => {
      const r = await reclamar(artista.id, "es_mio");
      const siguiente = siguienteEstadoLetrero(r);
      setResultado(siguiente);
      if (siguiente.estado === "aprobado") router.refresh();
    });
  }

  if (resultado?.estado === "aprobado") {
    return (
      <div className={styles.invitacion}>
        <p className={styles.hecho}>
          <IconoOk width={18} height={18} />
          <span>Listo: ya gestionas la ficha de «{artista.nombre}».</span>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.invitacion}>
      <b>Tu correo está enlazado a «{artista.nombre}»</b>
      {resultado?.estado === "enviada" ? (
        <p>Solicitud enviada al administrador.</p>
      ) : (
        <>
          <p>Puedes reclamar su ficha aquí mismo y empezar a gestionarla.</p>
          <button type="button" className={styles.reclamar} onClick={reclamarFicha} disabled={pendiente}>
            {pendiente ? "Enviando…" : "Reclamar ficha"}
          </button>
          {resultado?.estado === "error" && (
            <p className={styles.error} role="alert">
              {resultado.error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
