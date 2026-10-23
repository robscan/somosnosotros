import Link from "next/link";
import Boton, { claseBoton } from "@/components/ui/Boton";
import Buscador from "@/components/ui/Buscador";
import Cabecera from "@/components/ui/Cabecera";
import { Chip, Chips, Cuenta } from "@/components/ui/Chip";
import { IconoChevronDerecha, IconoDescarga, IconoPendiente } from "@/components/ui/Iconos";
import renglon from "@/components/ui/Renglon.module.css";
import { etiquetaDisciplina } from "@/lib/artistas";
import { diaLocal } from "@/lib/fechas";
import {
  chipsDisciplina,
  consultaDe,
  conteosEstado,
  cuandoFue,
  estadosInvestigacion,
  filtrarCandidatos,
  haceDias,
  diasEntre,
  hechosDe,
  hrefFicha,
  hrefPorAprobar,
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
  ultimasInvestigaciones,
  type Candidato,
  type ContextoFiltro,
  type Vista,
} from "@/lib/showcase";
import { filtrosDe, nPuestos, type Grupo } from "@/lib/showcaseFiltros";
import type { Investigaciones } from "./consultas";
import { FiltrosPuestos } from "./FiltrosShowcase";
import InvestigarLote from "./InvestigarLote";
import ListaSeleccionable from "./ListaSeleccionable";
import OpcionesLista from "./OpcionesLista";
import { PildoraEstado, PuntajeTabla } from "./Piezas";
import admin from "../admin.module.css";
import s from "./showcase.module.css";

/**
 * Showcase › Candidatos (OL-426, lo firmado en OL-425): buscador con ✕, las hojas de Filtros, Orden y Vista, los chips de disciplina con su cuenta,
 * la línea de cifras y una tarjeta (o una fila de la tabla) por artista visible del catálogo. La búsqueda, los filtros, el orden, la vista y la
 * página viven en la URL: se comparten y sobreviven al volver de una ficha (memoria de pantalla). Sin datos propios: recibe la lista ya leída, así
 * la prueban los componentes sin servidor. Va como hijos directos de la página (maquetación plana).
 * OL-439: bajo la línea de cifras, el renglón «Investigar» (a varios, `InvestigarLote`) y, en cada tarjeta, cómo va su investigación o cuántas
 * evidencias deja por revisar. Sin `investigaciones` (las pruebas de antes) no hay corridas ni evidencias; con null (no se pudieron leer), sin renglón.
 * OL-446 (lo firmado en OL-443): la hoja Filtros con sus cuentas y los grupos guardados (`FiltrosShowcase`); la fila de disciplinas se queda a la
 * vista (respuesta 1) y Estado entra a la hoja; lo puesto con su ✕; «Por aprobar» antes de «Investigar»; el indicador tocable en cada tarjeta; y
 * «Seleccionar» para investigar a los elegidos (`ListaSeleccionable`).
 */
const SIN_INVESTIGACIONES: Investigaciones = { corridas: [], porRevisar: {}, credito: null };
const diaDe = (iso: string) => diaLocal(new Date(iso));
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export default function VistaCandidatos({
  todos,
  vista,
  hoy,
  ahora,
  investigaciones = SIN_INVESTIGACIONES,
  grupos = null,
}: {
  todos: Candidato[];
  vista: Vista;
  hoy: string;
  ahora?: string;
  investigaciones?: Investigaciones | null;
  /** Los grupos guardados (OL-446); null si no se pudieron leer: la hoja sigue sin «Tus grupos» ni «Guardar como grupo». */
  grupos?: Grupo[] | null;
}) {
  const instante = ahora ? new Date(ahora) : new Date(`${hoy}T12:00:00`);
  const inv = investigaciones ?? SIN_INVESTIGACIONES;
  const ctx: ContextoFiltro = { hoy, investigacion: investigaciones ? estadosInvestigacion(inv.corridas, inv.terminadas ?? {}, instante) : null, porRevisar: inv.porRevisar };
  const filtrados = ordenarCandidatos(filtrarCandidatos(todos, vista, ctx), vista.orden);
  const visibles = filtrados.slice(0, vista.n);
  const conteos = conteosEstado(todos);
  const filtrando = !!vista.q || nPuestos(filtrosDe(vista)) > 0;
  const sinPagina = { ...vista, n: undefined };
  // El CSV es la lista filtrada entera, en su orden: sin la página ni la vista.
  const consultaCsv = consultaDe({ ...sinPagina, tabla: false });
  const ultimas = ultimasInvestigaciones(inv.corridas);
  const hechos = todos.map((c) => hechosDe(c, ctx));
  const pasan = pasanAlConsejo(filtrando ? filtrados : todos);
  const resumen = resumenLote(inv.corridas, inv.porRevisar);
  const loteEnCurso = resumen && resumen.enCurso > 0 ? resumen : null;
  return (
    <>
      {/* La cabecera de las listas del front (ui/Cabecera, OL-457): Filtros, Orden y Vista en su fila; debajo, las disciplinas y lo puesto. */}
      <Cabecera contexto={<OpcionesLista vista={vista} hechos={hechos} grupos={grupos ?? []} hoy={hoy} />}>
        {/* Pasan al renglón de abajo en vez de deslizarse: ninguna disciplina queda cortada en el borde (OL-457). */}
        <Chips ariaLabel="Filtrar por disciplina" envuelve>
          {chipsDisciplina(todos).map((d) => (
            <Chip key={d.valor} activo={vista.disciplina === d.valor} href={hrefShowcase({ ...sinPagina, disciplina: d.valor })}>
              {d.etiqueta}
              <Cuenta n={d.n} />
            </Chip>
          ))}
        </Chips>
        <FiltrosPuestos vista={vista} grupos={grupos} hechos={hechos} hoy={hoy} />
      </Cabecera>
      <Buscador valor={vista.q ?? ""} placeholder="Buscar artista" ariaLabel="Buscar artista del showcase" />
      <ListaSeleccionable
        cifras={lineaCifras(todos.length, conteos, filtrando ? filtrados.length : null, pasan)}
        seleccionable={!vista.tabla && filtrados.length > 0}
        tarjetas={visibles.map((c) => ({ c, investigacion: textoInvestigarTarjeta(ultimas.get(c.id), inv.porRevisar[c.id] ?? 0, hoy, diaDe), porRevisar: inv.porRevisar[c.id] ?? 0 }))}
        elegibles={filtrados.map((c) => ({ id: c.id, nombre: c.nombre }))}
        filtrando={filtrando}
        hoy={hoy}
        renglones={
          investigaciones && (
            <>
              <RenglonPorAprobar inv={investigaciones} hoy={hoy} />
              <RenglonInvestigar todos={todos} filtrados={filtrados} filtrando={filtrando} inv={investigaciones} hoy={hoy} ahora={instante} />
            </>
          )
        }
        enLugar={!filtrados.length ? <p className={admin.vacio}>{vista.q ? `Nadie con «${vista.q}» aquí.` : "Nadie con estos filtros. Quita uno de arriba."}</p> : vista.tabla ? <TablaCandidatos lista={visibles} orden={vista.orden} hoy={hoy} /> : null}
        verMas={
          filtrados.length > visibles.length && (
            <Boton href={hrefShowcase({ ...vista, n: vista.n + paginaDe(vista.tabla) })} variante="secundario" className={admin.verMas} scroll={false} replace>
              Ver más ({filtrados.length - visibles.length} más)
            </Boton>
          )
        }
        exportar={
          filtrados.length > 0 && (
            // Una descarga, no una pantalla: un enlace de siempre (sin el Link de Next) con la lista filtrada, sin la página.
            <a className={`${claseBoton({ variante: "secundario" })} ${s.exportar}`} href={`/api/showcase/csv${consultaCsv ? `?${consultaCsv}` : ""}`} download>
              <IconoDescarga width={20} height={20} />
              Exportar para el consejo (CSV)
            </a>
          )
        }
        lote={loteEnCurso ? lineaLote(loteEnCurso, hoy, diaDe) : null}
        disponible={inv.credito ? Math.max(0, inv.credito.usd - inv.credito.gastado) : null}
      />
    </>
  );
}

/**
 * «Por aprobar» en la lista (OL-446): cuántas evidencias trajo la rutina y de cuántos artistas, con su cuenta y el chevron derecho (entra a otra
 * pantalla). Sin nada por aprobar no se pinta.
 */
function RenglonPorAprobar({ inv, hoy }: { inv: Investigaciones; hoy: string }) {
  const ids = Object.keys(inv.porRevisar).filter((id) => inv.porRevisar[id] > 0);
  const n = ids.reduce((t, id) => t + inv.porRevisar[id], 0);
  if (!n) return null;
  const ultimas = ultimasInvestigaciones(inv.corridas);
  const fin = ids.map((id) => ultimas.get(id)?.fin).reduce<string | null>((m, f) => (f && (!m || f > m) ? f : m), null);
  return (
    <ul className={`${renglon.tarjeta} ${s.aprobar}`}>
      <li>
        <Link href={hrefPorAprobar()} className={renglon.ajuste}>
          <IconoPendiente width={20} height={20} />
          <b>Por aprobar</b>
          <small>
            {plural(n, "evidencia", "evidencias")} de {plural(ids.length, "artista", "artistas")}
            {fin ? ` · las trajo la rutina ${cuandoFue(diaDe(fin), hoy)}` : ""}
          </small>
          <span>
            <b className={s.cuenta}>{n}</b>
            <IconoChevronDerecha />
          </span>
        </Link>
      </li>
    </ul>
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
