import Link from "next/link";
import Boton, { claseBoton } from "@/components/ui/Boton";
import Buscador from "@/components/ui/Buscador";
import { Chip, Chips, Cuenta } from "@/components/ui/Chip";
import Imagen from "@/components/ui/Imagen";
import { IconoBuscar, IconoCalendario, IconoDescarga, IconoEstrella, IconoInstagram } from "@/components/ui/Iconos";
import { etiquetaDisciplina, hrefArtista } from "@/lib/artistas";
import { diaLocal } from "@/lib/fechas";
import { SIN_FOTO_REDONDA } from "@/lib/imagen";
import {
  actividadDe,
  chipsDisciplina,
  consultaDe,
  conteosEstado,
  diasEntre,
  filtrarCandidatos,
  haceDias,
  hrefFicha,
  hrefShowcase,
  investigacionEnCurso,
  LIMITE_LOTE,
  lineaCifras,
  lineaLote,
  miles,
  mostrarLote,
  ordenarCandidatos,
  paginaDe,
  pasanAlConsejo,
  resumenLote,
  seleccionLote,
  SENALES,
  textoInvestigarTarjeta,
  textoProgramadoPor,
  ultimasInvestigaciones,
  type Candidato,
  type Vista,
} from "@/lib/showcase";
import type { Investigaciones } from "./consultas";
import InvestigarLote from "./InvestigarLote";
import OpcionesLista from "./OpcionesLista";
import { IconoRed, PildoraEstado, PuntajeTabla, Rubrica } from "./Piezas";
import admin from "../admin.module.css";
import s from "./showcase.module.css";

/** La píldora de actividad: verde cada semana, naranja cada mes, gris si no publica. */
const CLASE_ACTIVIDAD = { semana: s.ok, mes: admin.destacada, inactivo: "" } as const;

/**
 * Showcase › Candidatos (OL-426, lo firmado en OL-425): buscador con ✕, chips de disciplina con su cuenta, las hojas de Estado, Orden y Vista, la
 * línea de cifras y una tarjeta (o una fila de la tabla) por artista visible del catálogo. La búsqueda, los filtros, el orden, la vista y la página
 * viven en la URL: se comparten y sobreviven al volver de una ficha (memoria de pantalla). Sin datos propios: recibe la lista ya leída, así la
 * prueban los componentes sin servidor. Va como hijos directos de la página (maquetación plana).
 * OL-439: bajo la línea de cifras, el renglón «Investigar» (a varios, `InvestigarLote`) y, en cada tarjeta, cómo va su investigación o cuántas
 * evidencias deja por revisar. Sin `investigaciones` (las pruebas de antes) no hay corridas ni evidencias; con null (no se pudieron leer), sin renglón.
 */
const SIN_INVESTIGACIONES: Investigaciones = { corridas: [], porRevisar: {}, credito: null };
const diaDe = (iso: string) => diaLocal(new Date(iso));

export default function VistaCandidatos({ todos, vista, hoy, ahora, investigaciones = SIN_INVESTIGACIONES }: { todos: Candidato[]; vista: Vista; hoy: string; ahora?: string; investigaciones?: Investigaciones | null }) {
  const filtrados = ordenarCandidatos(filtrarCandidatos(todos, vista), vista.orden);
  const visibles = filtrados.slice(0, vista.n);
  const conteos = conteosEstado(todos);
  const filtrando = !!vista.q || vista.disciplina !== "todas" || vista.estado !== "todos";
  const sinPagina = { ...vista, n: undefined };
  // El CSV es la lista filtrada entera, en su orden: sin la página ni la vista.
  const consultaCsv = consultaDe({ ...sinPagina, tabla: false });
  const inv = investigaciones ?? SIN_INVESTIGACIONES;
  const ultimas = ultimasInvestigaciones(inv.corridas);
  return (
    <>
      <Buscador valor={vista.q ?? ""} placeholder="Buscar artista" ariaLabel="Buscar artista del showcase" />
      <Chips ariaLabel="Filtrar por disciplina">
        {chipsDisciplina(todos).map((d) => (
          <Chip key={d.valor} activo={vista.disciplina === d.valor} href={hrefShowcase({ ...sinPagina, disciplina: d.valor })}>
            {d.etiqueta}
            <Cuenta n={d.n} />
          </Chip>
        ))}
      </Chips>
      <OpcionesLista vista={vista} conteos={conteos} />
      <p className={admin.nota} role="status">
        {lineaCifras(todos.length, conteos, filtrando ? filtrados.length : null, pasanAlConsejo(todos))}
      </p>
      {investigaciones && <RenglonInvestigar todos={todos} filtrados={filtrados} filtrando={filtrando} inv={investigaciones} hoy={hoy} ahora={ahora ? new Date(ahora) : new Date(`${hoy}T12:00:00`)} />}
      {!filtrados.length ? (
        <p className={admin.vacio}>{vista.q ? `Nadie con «${vista.q}» aquí.` : "Nadie con este filtro."}</p>
      ) : vista.tabla ? (
        <TablaCandidatos lista={visibles} orden={vista.orden} hoy={hoy} />
      ) : (
        <ul className={s.tarjetas} aria-label="Candidatos">
          {visibles.map((c) => (
            <TarjetaCandidato key={c.id} c={c} hoy={hoy} investigacion={textoInvestigarTarjeta(ultimas.get(c.id), inv.porRevisar[c.id] ?? 0, hoy, diaDe)} porRevisar={(inv.porRevisar[c.id] ?? 0) > 0} />
          ))}
        </ul>
      )}
      {filtrados.length > visibles.length && (
        <Boton href={hrefShowcase({ ...vista, n: vista.n + paginaDe(vista.tabla) })} variante="secundario" className={admin.verMas} scroll={false} replace>
          Ver más ({filtrados.length - visibles.length} más)
        </Boton>
      )}
      {filtrados.length > 0 && (
        // Una descarga, no una pantalla: un enlace de siempre (sin el Link de Next) con la lista filtrada, sin la página.
        <a className={`${claseBoton({ variante: "secundario" })} ${s.exportar}`} href={`/api/showcase/csv${consultaCsv ? `?${consultaCsv}` : ""}`} download>
          <IconoDescarga width={20} height={20} />
          Exportar para el consejo (CSV)
        </a>
      )}
    </>
  );
}

/**
 * El renglón «Investigar» de la lista (OL-439): lo que dice (la última orden mientras corre, deja algo por revisar o acabó hoy; si no, a cuántos
 * candidatos propone investigar), su barra y lo que necesita la hoja: las dos selecciones (con sus ids solo si caben en una orden) y el crédito.
 */
function RenglonInvestigar({ todos, filtrados, filtrando, inv, hoy, ahora }: { todos: Candidato[]; filtrados: Candidato[]; filtrando: boolean; inv: Investigaciones; hoy: string; ahora: Date }) {
  const sel = seleccionLote(todos, filtrados, ultimasInvestigaciones(inv.corridas), ahora);
  const lote = resumenLote(inv.corridas, inv.porRevisar);
  const conLote = mostrarLote(lote, hoy, diaDe);
  const n = sel.candidatos.length;
  const texto = conLote ? lineaLote(lote, hoy, diaDe) : n ? `${n} ${n === 1 ? "candidato" : "candidatos"} por investigar` : "Prensa, premios, festivales y obra publicada";
  const enCurso = conLote && lote.enCurso > 0;
  const ids = (lista: string[]) => (lista.length <= LIMITE_LOTE ? lista : null);
  return (
    <InvestigarLote
      texto={texto}
      avance={enCurso ? lote.avance : null}
      corriendo={inv.corridas.some(investigacionEnCurso)}
      lote={enCurso ? lineaLote(lote, hoy, diaDe) : null}
      candidatos={{ n, ids: ids(sel.candidatos) }}
      visibles={{ n: sel.visibles.length, ids: ids(sel.visibles), fueraRecientes: sel.fueraRecientes, fueraDescartados: sel.fueraDescartados, filtrando }}
      disponible={inv.credito ? Math.max(0, inv.credito.usd - inv.credito.gastado) : null}
    />
  );
}

/**
 * La tarjeta de un candidato: foto, nombre (abre su ficha de showcase), estado, la base, las redes, la actividad, cómo va su investigación (OL-439),
 * la rúbrica, la nota y los enlaces.
 */
export function TarjetaCandidato({ c, hoy, investigacion = null, porRevisar = false }: { c: Candidato; hoy: string; investigacion?: string | null; porRevisar?: boolean }) {
  const actividad = actividadDe(c.redes?.ultima_publicacion ?? null, hoy);
  const programado = textoProgramadoPor(c.programadoPor);
  const r = c.redes;
  return (
    <li className={s.tarjeta}>
      <Imagen src={c.foto ?? SIN_FOTO_REDONDA} alt="" className={s.foto} width={56} height={56} sizes="56px" />
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
      {investigacion && (
        // Con evidencias por revisar, en el violeta de las acciones: es a quién entrar.
        <p className={`${s.cifra} ${s.investiga}`} data-revisar={porRevisar || undefined}>
          <IconoBuscar width={18} height={18} />
          <span>{investigacion}</span>
        </p>
      )}
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

/** Las columnas de la tabla; la del orden elegido va en violeta (`aria-sort`). */
const COLUMNAS: { titulo: string; orden?: Vista["orden"] }[] = [
  { titulo: "Artista", orden: "nombre" },
  { titulo: "Disciplina" },
  { titulo: "Estado" },
  ...SENALES.map((x) => ({ titulo: x.corta })),
  { titulo: "Total", orden: "puntaje" },
  { titulo: "Eventos" },
  { titulo: "Foros", orden: "convocatoria" },
  { titulo: "Fest." },
  { titulo: "Seguidores", orden: "seguidores" },
  { titulo: "Última publ.", orden: "ultima" },
];

/** La lista en tabla (Vista: tabla): las mismas cifras en columnas; en el teléfono se desliza dentro de su caja. */
export function TablaCandidatos({ lista, orden, hoy }: { lista: Candidato[]; orden: Vista["orden"]; hoy: string }) {
  return (
    <div className={s.tabla} role="region" aria-label="Candidatos en tabla" tabIndex={0}>
      <table>
        <thead>
          <tr>
            {COLUMNAS.map((col) => (
              <th key={col.titulo} scope="col" aria-sort={col.orden === orden ? (orden === "nombre" ? "ascending" : "descending") : undefined}>
                {col.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lista.map((c) => (
            <tr key={c.id}>
              <td>
                <Link href={hrefFicha(c)}>{c.nombre}</Link>
              </td>
              <td>{etiquetaDisciplina(c.disciplina)}</td>
              <td>
                <PildoraEstado estado={c.estado} />
              </td>
              {SENALES.map((x) => (
                <td key={x.clave}>
                  <PuntajeTabla valor={c.valores[x.clave]} />
                </td>
              ))}
              <td>
                <b>{c.suma}</b>
              </td>
              <td>{c.eventos}</td>
              <td>{c.foros}</td>
              <td>{c.festivales}</td>
              <td>{c.redes?.seguidores != null ? miles(c.redes.seguidores) : "–"}</td>
              <td>{c.redes?.ultima_publicacion ? haceDias(diasEntre(c.redes.ultima_publicacion, hoy)) : "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
