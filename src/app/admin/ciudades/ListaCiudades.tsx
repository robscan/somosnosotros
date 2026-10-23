"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import Boton from "@/components/ui/Boton";
import { IconoCalendario, IconoChevronDerecha, IconoMas, IconoOjo, IconoPin, IconoReloj } from "@/components/ui/Iconos";
import renglon from "@/components/ui/Renglon.module.css";
import { cifra, ETIQUETA_ESTADO, pegado, type EstadoVisible, type LineaFila } from "@/lib/ciudadesAdmin";
import { mostrarCiudad, ocultarCiudad } from "./acciones";
import HojaAnadir, { type Detectada } from "./HojaAnadir";
import styles from "../admin.module.css";
import css from "./ciudades.module.css";

/** Una ciudad en la lista general, ya ordenada y con sus números (la página los calcula en el servidor). */
export type FilaLista = { slug: string; nombre: string; estado: EstadoVisible; consultas: number; lugares: number; eventos: number; porRevisar: number; linea: LineaFila | null };

const PILDORA: Record<EstadoVisible, string> = { abierta: `${styles.etiqueta} ${css.ok}`, detectada: `${styles.etiqueta} ${styles.destacada}`, cerrada: styles.etiqueta };

/**
 * Administración › Ciudades, la lista general (prototipo firmado OL-431, pantalla A): una fila por ciudad con su píldora, sus tres números con
 * icono y, a la derecha, las propuestas por revisar en violeta (o «Abrir» en una detectada, que también se puede ocultar, respuesta 6); una
 * tercera línea cuando hay algo que decidir. Abajo, Corridas con el crédito, y «Añadir ciudad» flotando: la hoja de elegir ciudad.
 */
export default function ListaCiudades({ filas: alEntrar, credito }: { filas: readonly FilaLista[]; credito: string }) {
  // La lista se toma al entrar, como en la bandeja y en «Pendiente»: una detectada que se oculta se queda como línea con «Deshacer» hasta salir
  // (el servidor ya no la trae al revalidar).
  const [filas] = useState(alEntrar);
  const [hoja, setHoja] = useState<{ desde: Detectada | null } | null>(null);
  const detectadas = filas.filter((f) => f.estado === "detectada").map(({ slug, nombre, consultas }) => ({ slug, nombre, consultas }));
  return (
    <>
      {filas.length ? (
        <ul className={`${renglon.tarjeta} ${css.lista}`} aria-label="Ciudades">
          {filas.map((f) => (
            <li key={f.slug}>{f.estado === "detectada" ? <FilaDetectada f={f} onAbrir={() => setHoja({ desde: { slug: f.slug, nombre: f.nombre, consultas: f.consultas } })} /> : <FilaAbierta f={f} />}</li>
          ))}
        </ul>
      ) : (
        <p className={styles.vacio}>Todavía no hay ciudades: aparecen cuando alguien consulta una, o añádela aquí abajo.</p>
      )}

      <h2 className={styles.grupo}>Corridas</h2>
      <ul className={renglon.tarjeta}>
        <li>
          <Link href="/admin/corridas" className={renglon.ajuste}>
            <IconoReloj width={20} height={20} />
            <b>Corridas</b>
            <small>{credito}</small>
            <span>
              <IconoChevronDerecha />
            </span>
          </Link>
        </li>
      </ul>

      <Boton ancho="contenido" flotante className={css.flotante} aria-haspopup="dialog" onClick={() => setHoja({ desde: null })}>
        <IconoMas width={20} height={20} />
        Añadir ciudad
      </Boton>
      {hoja && <HojaAnadir key={hoja.desde?.slug ?? "nueva"} detectadas={detectadas} desde={hoja.desde} onCerrar={() => setHoja(null)} />}
    </>
  );
}

/** Los tres números con su icono: consultas en 30 días, lugares y eventos próximos (cada uno se lee con su nombre). */
function Cifras({ f }: { f: FilaLista }) {
  const n = (k: number, uno: string, varios: string) => `${cifra(k)} ${k === 1 ? uno : varios}`;
  return (
    <small className={css.cifras}>
      <span role="img" aria-label={n(f.consultas, "consulta en 30 días", "consultas en 30 días")}>
        <IconoOjo width={16} height={16} />
        {cifra(f.consultas)}
      </span>
      <span role="img" aria-label={n(f.lugares, "lugar", "lugares")}>
        <IconoPin width={16} height={16} />
        {cifra(f.lugares)}
      </span>
      <span role="img" aria-label={n(f.eventos, "evento próximo", "eventos próximos")}>
        <IconoCalendario width={16} height={16} />
        {cifra(f.eventos)}
      </span>
    </small>
  );
}

function Nombre({ f, estado = f.estado }: { f: FilaLista; estado?: EstadoVisible }) {
  return (
    <b>
      {f.nombre} <span className={PILDORA[estado]}>{ETIQUETA_ESTADO[estado]}</span>
    </b>
  );
}

/** Una abierta: toda la fila lleva a su panel. */
function FilaAbierta({ f }: { f: FilaLista }) {
  return (
    <Link href={`/admin/ciudades/${f.slug}`} className={`${renglon.ajuste} ${css.filaCiudad}`}>
      <IconoPin width={20} height={20} />
      <Nombre f={f} />
      <Cifras f={f} />
      <span>
        {f.porRevisar > 0 && (
          <b className={css.revisar} role="img" aria-label={`${f.porRevisar} ${f.porRevisar === 1 ? "propuesta" : "propuestas"} por revisar`}>
            {cifra(f.porRevisar)}
          </b>
        )}
        <IconoChevronDerecha />
      </span>
      {f.linea && <span className={[css.linea, f.linea.alerta && css.alerta].filter(Boolean).join(" ")}>{pegado(f.linea.texto)}</span>}
      {f.linea?.avance != null && (
        <span className={`${styles.barraEmbudo} ${css.barra}`} role="progressbar" aria-label={`Avance: ${f.linea.texto}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(f.linea.avance * 100)}>
          <i style={{ width: `${Math.round(f.linea.avance * 100)}%` }} />
        </span>
      )}
    </Link>
  );
}

/** Una detectada: «Abrir» (la hoja ya llena) u «Ocultar» (no vuelve a salir; se deshace en el momento). */
function FilaDetectada({ f, onAbrir }: { f: FilaLista; onAbrir: () => void }) {
  const [oculta, setOculta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enCamino, iniciar] = useTransition();
  const cambiar = (ocultar: boolean) => {
    setError(null);
    iniciar(async () => {
      const r = ocultar ? await ocultarCiudad(f.slug) : await mostrarCiudad(f.slug);
      if (!r.ok) return setError(r.error);
      setOculta(ocultar);
    });
  };
  if (oculta)
    return (
      <div className={`${renglon.ajuste} ${css.filaCiudad}`}>
        <IconoPin width={20} height={20} />
        <Nombre f={f} estado="cerrada" />
        <small role="status">No vuelve a salir aunque la consulten</small>
        <button type="button" className={`${styles.enlace} ${css.cambiar}`} disabled={enCamino} aria-busy={enCamino} onClick={() => cambiar(false)}>
          Deshacer
        </button>
        {error && <p role="alert">{error}</p>}
      </div>
    );
  return (
    <div className={`${renglon.ajuste} ${css.filaCiudad}`}>
      <IconoPin width={20} height={20} />
      <Nombre f={f} />
      <Cifras f={f} />
      <button type="button" className={styles.pildora} aria-haspopup="dialog" aria-label={`Abrir ${f.nombre}`} onClick={onAbrir}>
        Abrir
      </button>
      <button type="button" className={css.ocultar} disabled={enCamino} aria-busy={enCamino} aria-label={`Ocultar ${f.nombre}`} onClick={() => cambiar(true)}>
        Ocultar
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
