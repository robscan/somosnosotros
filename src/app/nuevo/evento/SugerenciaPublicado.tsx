"use client";

import { useId, type ReactNode } from "react";
import Boton from "@/components/ui/Boton";
import { Chip } from "@/components/ui/Chip";
import { IconoCalendario, IconoEtiqueta, IconoOk, IconoPersonas, IconoPin } from "@/components/ui/Iconos";
import { textoProgramaRegistrado, textoVisita } from "@/lib/claseEvento";
import { diaConMesDe, diaLocal, rangoCorto } from "@/lib/fechas";
import type { Sugerencia } from "@/lib/sugerencias";
import type { EstadoSugerencia } from "./useSugerencia";
import styles from "./Publicado.module.css";

type Props = {
  estado: EstadoSugerencia;
  /** El evento que se acaba de publicar: su nombre, su día y su sitio (el acto «recién publicado» de un festival). */
  evento: { titulo: string; dia: string; lugar: string | null };
  zona: string;
  /** H1, H4, H5 y ligar: un toque. */
  onAceptar: () => void;
  /** H2: abre «¿Cuándo se puede visitar?». */
  onPeriodo: () => void;
  onAhoraNo: () => void;
};

const lista = new Intl.ListFormat("es", { type: "conjunction" });

/** Una línea de la ficha: icono y texto (lo que falta, en gris). */
function Dato({ icono, falta, children }: { icono: ReactNode; falta?: boolean; children: ReactNode }) {
  return (
    <li>
      {icono}
      <span className={falta ? styles.falta : undefined}>{children}</span>
    </li>
  );
}

/** Los actos de un festival, unidos por una línea; el recién publicado, con el punto hueco (prototipo, caso h4). */
type ActoEnLista = { titulo: string; dia: string; lugar: string | null; nuevo?: boolean };

function Actos({ actos, zona }: { actos: ActoEnLista[]; zona: string }) {
  const ahora = new Date();
  return (
    <ul className={styles.actos}>
      {actos.map((a) => (
        <li key={`${a.titulo}-${a.dia}`} className={a.nuevo ? styles.actoNuevo : undefined}>
          <b>{a.titulo}</b>
          <small>{[diaConMesDe(a.dia, ahora, zona), a.lugar, a.nuevo ? "recién publicado" : null].filter(Boolean).join(" · ")}</small>
        </li>
      ))}
    </ul>
  );
}

/** Los actos que se relacionan: el otro (si lo hay) y el recién publicado, por día. */
function actosDe(s: Extract<Sugerencia, { tipo: "festival" }>, evento: Props["evento"], marcarNuevo: boolean): ActoEnLista[] {
  const este = { titulo: evento.titulo, dia: evento.dia, lugar: evento.lugar, nuevo: marcarNuevo };
  return s.otro ? [s.otro, este].sort((a, b) => a.dia.localeCompare(b.dia)) : [este];
}

/** Lo que dice la ficha de cada sugerencia mientras no existe: su etiqueta, su nombre, sus datos y su botón. */
function porCrear(s: Sugerencia, evento: Props["evento"], zona: string): { etiqueta: string; nombre: string; cuerpo: ReactNode; actos?: ActoEnLista[]; boton: string; periodo?: boolean } {
  const hoy = diaLocal(new Date(), zona);
  if (s.tipo === "exposicion" && s.modo === "ligar") {
    return {
      etiqueta: "Ya está publicada",
      nombre: s.titulo,
      cuerpo: <Dato icono={<IconoCalendario width={20} height={20} />}>{rangoCorto(s.exposicion.desde, s.exposicion.hasta, hoy)} · exposición</Dato>,
      boton: "Ligar la inauguración",
    };
  }
  if (s.tipo === "exposicion") {
    const quien = s.quien.length ? <Dato icono={<IconoPersonas width={20} height={20} />}>{lista.format(s.quien)} · expone</Dato> : null;
    const lugar = s.lugar ? <Dato icono={<IconoPin width={20} height={20} />}>{s.lugar}</Dato> : null;
    if (s.modo === "crear") {
      return {
        etiqueta: "También puedes publicar",
        nombre: s.titulo,
        cuerpo: (
          <>
            <Dato icono={<IconoCalendario width={20} height={20} />}>{rangoCorto(s.visita.desde, s.visita.hasta, hoy)} · exposición</Dato>
            {lugar}
            {quien}
          </>
        ),
        boton: "Publicar exposición",
      };
    }
    return {
      etiqueta: "También puedes publicar",
      nombre: s.titulo,
      cuerpo: (
        <>
          <Dato icono={<IconoCalendario width={20} height={20} />} falta>
            Exposición · ¿Hasta cuándo se puede visitar?
          </Dato>
          {lugar}
          {quien}
        </>
      ),
      boton: "Agregar periodo de visita",
      periodo: true,
    };
  }
  const actos = actosDe(s, evento, true);
  if (s.modo === "marco") {
    return {
      etiqueta: "Parte de",
      nombre: s.mencion,
      cuerpo: <Dato icono={<IconoEtiqueta width={20} height={20} />}>Festival · {textoProgramaRegistrado(s.marco.actos)}</Dato>,
      actos,
      boton: s.otro ? "Relacionar los dos" : "Relacionar",
    };
  }
  return { etiqueta: "Estos dos eventos forman parte de", nombre: s.mencion, cuerpo: null, actos, boton: "Relacionar los dos" };
}

/**
 * La única sugerencia de «Publicado» (OL-323; prototipo aceptado `eventos-superficies.html`, casos h1, h2 y h4; bitácora 314: «la ficha en
 * punteado sustituye a la tarjeta de sugerencia»). Tiene la forma de lo que se crearía —la exposición con sus días, su lugar y quién expone;
 * el festival con sus actos unidos por una línea— en punteado mientras no existe, con su botón y «Ahora no». Al aceptarla, en el mismo sitio, la
 * tarjeta de lo creado con borde lleno («Exposición publicada · Hasta el …», «Ver la exposición»). Nunca un aviso aparte ni una ventana: si
 * se ignora, la pantalla sigue igual. El error de su acción se dice aquí, y nada más se toca.
 */
export default function SugerenciaPublicado({ estado, evento, zona, onAceptar, onPeriodo, onAhoraNo }: Props) {
  const id = useId();
  if (estado.fase === "nada" || estado.fase === "descartada") return null;
  const ahora = new Date();
  const hoy = diaLocal(ahora, zona);

  if (estado.fase === "hecha") {
    const { s, creado, visita, actos } = estado;
    const expo = s.tipo === "exposicion";
    const etiqueta = expo ? (s.modo === "ligar" ? "Inauguración ligada" : "Exposición publicada") : "Ya son parte del festival";
    const nombre = s.tipo === "exposicion" ? s.titulo : s.mencion;
    return (
      <section className={`${styles.ficha} ${styles.creada}`} aria-labelledby={id}>
        <Chip variante="estado" className={`${styles.etiqueta} ${styles.hecha}`}>
          <IconoOk width={14} height={14} /> {etiqueta}
        </Chip>
        <h3 id={id}>{nombre}</h3>
        <ul className={styles.datos}>
          {expo && visita && <Dato icono={<IconoCalendario width={20} height={20} />}>{textoVisita(visita, hoy, ahora, zona)}</Dato>}
          {expo && s.modo !== "ligar" && s.lugar && <Dato icono={<IconoPin width={20} height={20} />}>{s.lugar}</Dato>}
          {!expo && actos !== null && <Dato icono={<IconoEtiqueta width={20} height={20} />}>Festival · {textoProgramaRegistrado(actos)}</Dato>}
        </ul>
        {s.tipo === "festival" && <Actos actos={actosDe(s, evento, false)} zona={zona} />}
        <Boton href={creado.href} variante="secundario">
          {expo ? "Ver la exposición" : "Ver el festival"}
        </Boton>
      </section>
    );
  }

  const { s, enviando, error } = estado;
  const f = porCrear(s, evento, zona);
  return (
    <section className={`${styles.ficha} ${styles.porCrear}`} aria-labelledby={id}>
      <Chip variante="estado" className={styles.etiqueta}>
        {f.etiqueta}
      </Chip>
      <h3 id={id}>{f.nombre}</h3>
      {f.cuerpo && <ul className={styles.datos}>{f.cuerpo}</ul>}
      {f.actos && <Actos actos={f.actos} zona={zona} />}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <Boton type="button" onClick={f.periodo ? onPeriodo : onAceptar} aria-busy={enviando || undefined} disabled={enviando}>
        {f.boton}
      </Boton>
      <Boton type="button" variante="quieto" onClick={onAhoraNo} disabled={enviando}>
        Ahora no
      </Boton>
    </section>
  );
}
