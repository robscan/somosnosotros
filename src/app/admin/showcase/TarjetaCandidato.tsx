import Link from "next/link";
import type { MouseEvent } from "react";
import { IconoBuscar, IconoCalendario, IconoChevronDerecha, IconoEstrella, IconoInstagram, IconoOk, IconoPendiente } from "@/components/ui/Iconos";
import Imagen from "@/components/ui/Imagen";
import { etiquetaDisciplina, hrefArtista } from "@/lib/artistas";
import { SIN_FOTO_REDONDA } from "@/lib/imagen";
import { actividadDe, diasEntre, haceDias, hrefFicha, hrefPorAprobar, miles, textoProgramadoPor, type Candidato } from "@/lib/showcase";
import { IconoRed, PildoraEstado, Rubrica } from "./Piezas";
import admin from "../admin.module.css";
import s from "./showcase.module.css";

/** La píldora de actividad: verde cada semana, naranja cada mes, gris si no publica. */
const CLASE_ACTIVIDAD = { semana: s.ok, mes: admin.destacada, inactivo: "" } as const;

/** Seleccionando (OL-446): si está elegida y qué pasa al tocarla (la casilla o cualquier parte de la tarjeta). */
export type Eleccion = { elegido: boolean; onCambio: () => void };

/**
 * La tarjeta de un candidato: foto, nombre (abre su ficha de showcase), estado, la base, las redes, la actividad, cómo va su investigación (OL-439),
 * la rúbrica, la nota y los enlaces. OL-446 (lo firmado en OL-443): con evidencias por revisar, esa línea es el indicador, tocable a todo lo ancho
 * con su chevron derecho, y abre «Por aprobar» en este artista; seleccionando, la casilla sobre la foto y toda la tarjeta marcan o desmarcan.
 */
export default function TarjetaCandidato({ c, hoy, investigacion = null, porRevisar = 0, eleccion = null }: { c: Candidato; hoy: string; investigacion?: string | null; porRevisar?: number; eleccion?: Eleccion | null }) {
  const actividad = actividadDe(c.redes?.ultima_publicacion ?? null, hoy);
  const programado = textoProgramadoPor(c.programadoPor);
  const r = c.redes;
  // Seleccionando, tocar la tarjeta (también su nombre y sus enlaces) marca o desmarca, en vez de abrir.
  const alTocar = eleccion
    ? (e: MouseEvent) => {
        e.preventDefault();
        eleccion.onCambio();
      }
    : undefined;
  return (
    <li className={eleccion ? `${s.tarjeta} ${s.elegible}` : s.tarjeta} data-elegido={eleccion?.elegido || undefined} onClickCapture={alTocar}>
      <Imagen src={c.foto ?? SIN_FOTO_REDONDA} alt="" className={s.foto} width={56} height={56} sizes="56px" />
      {eleccion && (
        <button type="button" role="checkbox" className={s.marca} aria-checked={eleccion.elegido} aria-label={`Elegir a ${c.nombre}`}>
          {eleccion.elegido && <IconoOk width={16} height={16} strokeWidth={3} />}
        </button>
      )}
      <Link href={hrefFicha(c)} className={s.nombre}>
        {c.nombre}
      </Link>
      <small className={s.disciplina}>
        {etiquetaDisciplina(c.disciplina)} · {c.ciudad}
      </small>
      <PildoraEstado estado={c.estado} className={s.estado} />
      <p className={`${s.cifra} ${s.circula}`}>
        <IconoCalendario width={18} height={18} />
        <span>
          <b>{c.eventos}</b> {c.eventos === 1 ? "evento" : "eventos"} · <b>{c.foros}</b> {c.foros === 1 ? "foro" : "foros"} · <b>{c.festivales}</b> {c.festivales === 1 ? "festival" : "festivales"}
        </span>
      </p>
      {r && (
        <p className={`${s.cifra} ${s.redes}`}>
          <IconoRed red={r.red} width={18} height={18} />
          <span>
            {r.seguidores !== null && (
              <>
                <b>{miles(r.seguidores)}</b> seguidores
              </>
            )}
            {r.seguidores !== null && r.publicaciones !== null && " · "}
            {r.publicaciones !== null && (
              <>
                <b>{r.publicaciones}</b> publicaciones
              </>
            )}
            {r.ultima_publicacion && `${r.seguidores !== null || r.publicaciones !== null ? " · " : ""}última ${haceDias(diasEntre(r.ultima_publicacion, hoy))}`}
          </span>
        </p>
      )}
      {actividad && <span className={[admin.etiqueta, CLASE_ACTIVIDAD[actividad.clave], s.actividad].filter(Boolean).join(" ")}>{actividad.texto}</span>}
      {investigacion &&
        (porRevisar > 0 ? (
          // El indicador: en el violeta de las acciones, tocable, entra a Por aprobar en este artista (chevron derecho: otra pantalla).
          <Link href={hrefPorAprobar(c.id)} className={`${s.cifra} ${s.investiga} ${s.revisar}`} data-revisar>
            <IconoPendiente width={18} height={18} />
            <span>{investigacion}</span>
            <IconoChevronDerecha width={16} height={16} />
          </Link>
        ) : (
          <p className={`${s.cifra} ${s.investiga}`}>
            <IconoBuscar width={18} height={18} />
            <span>{investigacion}</span>
          </p>
        ))}
      <Rubrica valores={c.valores} suma={c.suma} />
      {c.nota && <p className={s.nota}>{c.nota}</p>}
      {programado && (
        <p className={s.programa}>
          Programado por: <b>{programado}</b>
        </p>
      )}
      <p className={s.enlaces}>
        <Link className={admin.enlace} href={hrefArtista({ id: c.id, slug: c.slug })}>
          <IconoEstrella width={18} height={18} />
          Ficha
        </Link>
        {c.instagram && (
          <a className={admin.enlace} href={c.instagram} target="_blank" rel="noopener noreferrer">
            <IconoInstagram width={18} height={18} />
            Instagram
          </a>
        )}
      </p>
    </li>
  );
}
