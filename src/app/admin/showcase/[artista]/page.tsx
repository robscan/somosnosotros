import Link from "next/link";
import { redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import { IconoCalendario, IconoChevronDerecha, IconoEtiqueta, IconoPin } from "@/components/ui/Iconos";
import Imagen from "@/components/ui/Imagen";
import plantilla from "@/components/ui/Plantilla.module.css";
import { etiquetaDisciplina, hrefArtista } from "@/lib/artistas";
import { diaLocal } from "@/lib/fechas";
import { SIN_FOTO_REDONDA } from "@/lib/imagen";
import { unir } from "@/lib/panel";
import {
  avanceInvestigar,
  detalleEvidencia,
  detalleOpcionEstado,
  detallePropuesta,
  diasEntre,
  ESTADOS,
  etiquetaRed,
  haceDias,
  investigacionEnCurso,
  lineaCreditoInvestigar,
  MAXIMO_RUBRICA,
  propuestasDe,
  renglonesBase,
  resumenSenal,
  RUTA_SHOWCASE,
  SENALES,
  sumaValores,
  textoEstado,
  textoInvestigar,
  textoLectura,
  ultimasPorRed,
  valoresDe,
} from "@/lib/showcase";
import { usuarioActual } from "@/lib/supabase/servidor";
import Reintentar from "../../Reintentar";
import { anioDe, cargarFichaShowcase, cargarInvestigacion } from "../consultas";
import { sugerenciasCompletar } from "@/lib/completarFicha";
import AyudaFicha from "./AyudaFicha";
import CompletarFicha from "./CompletarFicha";
import EstadoFicha from "./EstadoFicha";
import InvestigarFicha from "./InvestigarFicha";
import NotasFicha from "./NotasFicha";
import AvisoPorRevisar from "./AvisoPorRevisar";
import Hallazgos from "../Hallazgos";
import RedesFicha from "./RedesFicha";
import SenalFicha from "./SenalFicha";
import admin from "../../admin.module.css";
import ficha from "@/components/FichaPersona.module.css";
import EnCamino from "@/components/ui/EnCamino";
import renglon from "@/components/ui/Renglon.module.css";
import s from "../showcase.module.css";
import { tituloDePagina } from "@/lib/marca";

export const metadata = { title: tituloDePagina("Ficha de showcase", "Administración"), robots: { index: false, follow: false } };

const RAIZ = "ficha-showcase";
const ICONO_BASE = { total: IconoCalendario, lugar: IconoPin, festival: IconoEtiqueta } as const;

/**
 * La ficha de showcase de un artista (OL-426; lo firmado en OL-425): la cabecera de la ficha de una persona, el estado con quién y cuándo, la
 * rúbrica señal por señal con sus evidencias enlazadas, lo que propuso la rutina por revisar, sus eventos y foros del año (de la base), sus redes
 * con la fecha de cada lectura y las notas privadas del consejo. La ⓘ explica cada parte. Solo administración: lo único que sale de aquí son las
 * evidencias aceptadas (salvo redes), que se publican en su perfil como «Reconocimientos y obra» (OL-445), y lo que «Completar ficha» escribe
 * en su ficha cuando alguien lo acepta.
 * OL-430: «Investigar» (la rutina con la API busca prensa, premios, festivales y obra publicada y deja evidencias propuestas en «Por revisar»),
 * con su renglón justo antes de lo que trae.
 */
export default async function FichaShowcase({ params }: { params: Promise<{ artista: string }> }) {
  const { artista } = await params;
  const clave = decodeURIComponent(artista);
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(`${RUTA_SHOWCASE}/${clave}`)}`);
  if (actual.perfil.rol !== "admin") redirect("/");
  const ahora = new Date();
  const f = await cargarFichaShowcase(clave, ahora);
  if (f === "error" || !f) {
    return (
      <main className={plantilla.paginaContenido}>
        <Barra volver={{ href: RUTA_SHOWCASE, texto: "Showcase" }} titulo={f === "error" ? "Showcase" : "Este artista no está en el catálogo"} />
        {f === "error" ? <Reintentar texto="No pudimos leer esta ficha." /> : <p className={admin.vacio}>Quizá cambió su dirección o se borró su ficha.</p>}
        {f !== "error" && (
          <Link href={RUTA_SHOWCASE} className={admin.salida}>
            Volver al showcase
            <IconoChevronDerecha />
          </Link>
        )}
      </main>
    );
  }
  const hoy = diaLocal(ahora);
  const diaDe = (iso: string) => diaLocal(new Date(iso));
  const yo = actual.perfil.id;
  const nombres = new Map(Object.entries(f.nombres));
  const a = f.artista;
  const estado = textoEstado(f.estado, f.registro, yo, nombres, hoy, diaDe);
  const opciones = ESTADOS.map((e) => ({ valor: e.valor, etiqueta: e.etiqueta, detalle: detalleOpcionEstado(e.valor, f.registro, yo, nombres, hoy, diaDe) }));
  const datos = { circulacion: f.circulacion, ciudad: a.ciudad, evidencias: f.evidencias, lecturas: f.lecturas, reclamada: f.reclamada, novedades: f.novedades, portada: f.portada };
  // OL-437: lo que propone la base y lo que vale (lo fijado a mano manda).
  const valores = valoresDe(f.fijados, propuestasDe(datos, hoy));
  const senales = SENALES.map((x) => ({
    clave: x.clave,
    titulo: x.titulo,
    niveles: x.niveles,
    resumen: resumenSenal(x.clave, datos, hoy),
    valor: valores[x.clave],
    evidencias: f.evidencias.filter((e) => e.senal === x.clave && e.estado !== "propuesta").map((e) => ({ ...e, detalle: detalleEvidencia(e, hoy) })),
  }));
  // OL-446: lo que trajo la rutina, con lo que cambia al aceptar cada una (el mismo componente que «Por aprobar»).
  const propuestas = f.evidencias.filter((e) => e.estado === "propuesta").map((e) => ({ ...e, detalle: detallePropuesta(e, hoy), fuenteTexto: e.fuente || new URL(e.url).hostname.replace(/^www\./, "") }));
  const grupo = {
    artista: { id: a.id, slug: a.slug, nombre: a.nombre, foto: a.foto, href: `${RUTA_SHOWCASE}/${a.slug}`, disciplina: etiquetaDisciplina(a.disciplina), estado: estado.titulo },
    valores,
    obraAceptada: f.evidencias.filter((e) => e.senal === "obra" && e.estado === "aceptada"),
    hallazgos: propuestas,
  };
  const base = renglonesBase(f.eventos, new Map(f.lugares.map((l) => [l.id, l])), new Map([...f.festivales, ...f.eventos.filter((e) => e.clase === "festival")].map((e) => [e.id, e])), a.slug, ahora, diaDe);
  // OL-445: lo que trajeron las rutinas y su ficha pública no tiene.
  const sugerencias = sugerenciasCompletar({ ...f.completar, evidencias: f.evidencias });
  const inv = await cargarInvestigacion(a.id, ahora);
  const porRevisarRutina = f.evidencias.filter((e) => e.estado === "propuesta" && e.leida_por === "rutina").length;
  const textoInv = inv.corrida === undefined ? "No pudimos leer la última investigación" : textoInvestigar(inv.corrida, porRevisarRutina, hoy, diaDe);
  const ultimas = ultimasPorRed(f.lecturas);
  const lecturas = ultimas.map((l) => ({ red: l.red, etiqueta: etiquetaRed(l.red), texto: textoLectura(l, hoy, true), hace: haceDias(diasEntre(diaDe(l.leido_en), hoy)) }));
  return (
    <main id={RAIZ} className={`${plantilla.paginaContenido} ${s.conAyuda}`}>
      <Barra volver={{ href: RUTA_SHOWCASE, texto: "Showcase" }} titulo={a.nombre} tituloEnPagina />
      <div className={ficha.cabecera}>
        <Imagen src={a.foto ?? SIN_FOTO_REDONDA} alt="" className={ficha.avatar} width={72} height={72} sizes="72px" loading="eager" />
        <h1 className={ficha.nombre}>
          {/* OL-446: el nombre lleva a su ficha pública (chevron derecho: entra a otra pantalla). */}
          <Link href={hrefArtista({ id: a.id, slug: a.slug })} className={s.publica}>
            {a.nombre}
            <IconoChevronDerecha width={24} height={24} />
          </Link>
        </h1>
        <p className={ficha.colonia}>{unir([etiquetaDisciplina(a.disciplina), a.ciudad, f.reclamada && "ficha reclamada"])}</p>
      </div>
      {propuestas.length > 0 && <AvisoPorRevisar n={propuestas.length} />}

      <h2 className={admin.grupo}>Estado</h2>
      <EstadoFicha artistaId={a.id} slug={a.slug} nombre={a.nombre} estado={f.estado} titulo={estado.titulo} detalle={estado.detalle} opciones={opciones} />

      <h2 className={admin.grupo} data-ayuda="rubrica">
        Rúbrica{" "}
        <b>
          {sumaValores(valores)} de {MAXIMO_RUBRICA}
        </b>
      </h2>
      {senales.map((x) => (
        <SenalFicha key={x.clave} artistaId={a.id} slug={a.slug} senal={x} />
      ))}

      <h2 className={admin.grupo}>Investigación</h2>
      <InvestigarFicha
        artistaId={a.id}
        slug={a.slug}
        nombre={a.nombre}
        ciudad={a.ciudad}
        texto={textoInv}
        avance={avanceInvestigar(inv.corrida)}
        enCurso={investigacionEnCurso(inv.corrida)}
        credito={lineaCreditoInvestigar(inv.credito, hoy)}
      />

      <Hallazgos grupos={[grupo]} hoy={hoy} modo="ficha" />

      <CompletarFicha artistaId={a.id} slug={a.slug} sugerencias={sugerencias} reclamada={f.reclamada} />

      <h2 className={admin.grupo} data-ayuda="base">
        En la base · {anioDe(ahora).anio}
      </h2>
      {base.length ? (
        <ul className={renglon.tarjeta} data-ayuda="base">
          {base.map((r) => {
            const Icono = ICONO_BASE[r.tipo];
            return (
              <li key={`${r.tipo}-${r.href}`}>
                <Link href={r.href} className={renglon.ajuste}>
                  <Icono width={20} height={20} />
                  <b>{r.titulo}</b>
                  <small>{r.detalle}</small>
                  <span>
                    <IconoChevronDerecha />
                  </span>
                  <EnCamino className={renglon.enCamino} />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={admin.vacio}>Sin eventos en la base este año.</p>
      )}

      <h2 className={ultimas.length ? `${admin.grupo} ${admin.conNota}` : admin.grupo}>Redes</h2>
      {ultimas.length > 0 && <p className={admin.nota}>Última lectura {haceDias(diasEntre(diaDe(ultimas.reduce((m, l) => (l.leido_en > m ? l.leido_en : m), ultimas[0].leido_en)), hoy))}</p>}
      <RedesFicha artistaId={a.id} slug={a.slug} lecturas={lecturas} hoy={hoy} />

      <h2 className={admin.grupo}>Notas del consejo</h2>
      <NotasFicha artistaId={a.id} slug={a.slug} notas={f.notas} />

      <AyudaFicha raizId={RAIZ} />
    </main>
  );
}
