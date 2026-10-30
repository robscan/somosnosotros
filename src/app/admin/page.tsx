import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ComponentType, ReactNode, SVGProps } from "react";
import Barra from "@/components/ui/Barra";
import { IconoCalendario, IconoChevronDerecha, IconoEstrella, IconoInstagram, IconoPersonas, IconoPin, IconoPincel, IconoReloj, IconoUbicacion } from "@/components/ui/Iconos";
import plantilla from "@/components/ui/Plantilla.module.css";
import renglon from "@/components/ui/Renglon.module.css";
import { credito, propuestasPorRevisar, resumenCiudades, usd } from "@/lib/ciudadesAdmin";
import { diaLocal } from "@/lib/fechas";
import { CUENTA_INSTAGRAM } from "@/lib/instagram/texto";
import { tituloDePagina } from "@/lib/marca";
import { cuandoPaso, GALLETA_CIUDAD, indicadoresPortada, leerCiudad, renglonesGestionar } from "@/lib/panel";
import { lineaInstagram, lineaRutinas } from "@/lib/portadaAdmin";
import { CLAVE_SEMANAL, leerAjusteSemanal } from "@/lib/rutinas/ajusteSemanal";
import { renglonPorAprobar } from "@/lib/showcasePorAprobar";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { cargarPanelCiudades } from "./ciudades/consultas";
import { cargarAportes, cargarResumen } from "./consultas";
import IconoGrafo from "./grafo/IconoGrafo";
import Indicadores from "./Indicadores";
import { abrirTodosLosNumeros } from "./numerosEnHoja";
import Pendientes from "./Pendientes";
import { cargarInstagramPortada } from "./portada";
import Reintentar from "./Reintentar";
import RenglonShowcase from "./showcase/RenglonShowcase";
import { cargarResumenPorAprobar } from "./showcase/consultas";
import TodosLosNumeros from "./TodosLosNumeros";
import styles from "./admin.module.css";

export const metadata = { title: tituloDePagina("Administración"), robots: { index: false, follow: false } };

const ICONO = { personas: IconoPersonas, lugares: IconoPin, eventos: IconoCalendario, artistas: IconoEstrella };
const SECCIONES = [
  { clave: "personas", titulo: "Personas", href: "/admin/personas" },
  { clave: "lugares", titulo: "Lugares", href: "/admin/lugares" },
  { clave: "eventos", titulo: "Eventos", href: "/admin/eventos" },
  { clave: "artistas", titulo: "Artistas", href: "/admin/artistas" },
] as const;

/** Un renglón de la portada: icono convencional, su nombre, su línea de estado en llano y, si la tiene, su cuenta. */
function Renglon({ href, Icono, titulo, detalle, total }: { href: string; Icono: ComponentType<SVGProps<SVGSVGElement>>; titulo: string; detalle?: ReactNode; total?: number | null }) {
  return (
    <li>
      <Link href={href} className={renglon.ajuste}>
        <Icono width={20} height={20} />
        <b>{titulo}</b>
        {detalle && <small>{detalle}</small>}
        <span>
          {total ?? null}
          <IconoChevronDerecha />
        </span>
      </Link>
    </li>
  );
}

/**
 * Administración (OL-494; variante C firmada por el founder el 2026-10-29 del prototipo OL-493, bitácora 525). Al abrir, una sola pregunta:
 * ¿qué tengo que atender hoy? Cinco bloques en ese orden: Pendiente (lo único en rojo; también si Instagram dejó de publicar), «Esta semana en
 * números» (cuatro cuadros comparados con la semana anterior y «Ver todos los números ›», la hoja con el resto, el embudo, Fichas y el CAPO),
 * Gestionar (las cuatro listas), Difusión (Instagram y Showcase) y Herramientas (Ciudades, Rutinas, Grafo cultural y Obras colectivas), cada
 * renglón con su línea de estado en palabras de todos los días. El interruptor de las rutinas vive en Corridas. Se entra desde Ajustes y Atrás
 * vuelve ahí.
 */
export default async function Admin() {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/admin");
  if (actual.perfil.rol !== "admin") redirect("/");
  const ciudadSesion = leerCiudad("eventos", (await cookies()).get(GALLETA_CIUDAD)?.value ?? null);
  const supabase = await clienteServidor();
  const [{ resumen, pendientes, errorPendientes }, aportes, ciudades, porAprobar, instagram, semanal] = await Promise.all([
    cargarResumen(),
    cargarAportes(),
    cargarPanelCiudades(),
    cargarResumenPorAprobar(),
    supabase ? cargarInstagramPortada(supabase, ciudadSesion).catch(() => null) : null,
    supabase ? supabase.from("configuracion").select("valor").eq("clave", CLAVE_SEMANAL).maybeSingle() : null,
  ]);
  const ahora = new Date();
  // Las propuestas de las rutinas por revisar suben a «Pendiente» (firma de OL-425); si Ciudades no se pudo leer, solo faltan ellas.
  // OL-446: primero las evidencias del showcase por aprobar (un solo renglón a «Por aprobar»); si no se pudieron leer, solo falta él.
  const showcase = renglonPorAprobar(porAprobar && { ...porAprobar, ultima: porAprobar.ultima && diaLocal(new Date(porAprobar.ultima)) }, diaLocal(ahora));
  const porRevisar = [...(showcase ? [showcase] : []), ...(ciudades ? propuestasPorRevisar(ciudades.corridas, ciudades.ciudades, ahora).filter((p) => p.tipo !== "showcase") : [])];
  const numeros = resumen ? indicadoresPortada(resumen, aportes, diaLocal(ahora)) : [];
  const renglones = resumen ? renglonesGestionar(resumen.gestionar) : SECCIONES.map((s) => ({ ...s, total: null, detalle: null }));
  const rutinas = lineaRutinas(semanal && !semanal.error ? leerAjusteSemanal(semanal.data?.valor).activa : null, ciudades ? usd(credito(ciudades.credito, ahora).queda) : null);
  return (
    <main className={plantilla.paginaContenido}>
      <Barra volver={{ href: "/ajustes", texto: "Ajustes" }} titulo="Administración" />
      {/* La llave cambia cuando la lista pasa de no leída a leída (Intentar de nuevo): así se monta con los pendientes reales. */}
      <Pendientes key={errorPendientes ? "sin-leer" : "leidos"} iniciales={pendientes.map((p) => ({ ...p, cuando: cuandoPaso(p.creado_en, ahora) }))} error={errorPendientes} porRevisar={porRevisar} instagram={instagram?.pendiente ?? null} />

      <h2 className={resumen ? `${styles.grupo} ${styles.conNota}` : styles.grupo}>Esta semana en números</h2>
      {resumen ? <Indicadores lista={numeros} nota="Comparado con la semana anterior" numeros /> : <Reintentar texto="No pudimos leer los números." />}
      {resumen && !aportes && <Reintentar texto="No pudimos leer Voy y Me interesa." />}
      <TodosLosNumeros abrir={abrirTodosLosNumeros} />

      <h2 className={styles.grupo}>Gestionar</h2>
      <ul className={renglon.tarjeta}>
        {renglones.map((r) => (
          <Renglon key={r.clave} href={r.href} Icono={ICONO[r.clave]} titulo={r.titulo} detalle={r.detalle} total={r.total} />
        ))}
      </ul>

      {/* Difusión: lo que da a conocer a la gente y a los artistas. Instagram dice lo que salió y lo que se queda sin salir por falta de material. */}
      <h2 className={styles.grupo}>Difusión</h2>
      <ul className={renglon.tarjeta}>
        <Renglon href="/admin/instagram" Icono={IconoInstagram} titulo="Instagram" detalle={lineaInstagram(CUENTA_INSTAGRAM, instagram?.publicadas ?? null, instagram?.sinMaterial ?? null)} />
        <RenglonShowcase />
      </ul>

      {/* Herramientas: lo que se usa de vez en cuando. Rutinas lleva a Corridas, donde vive el interruptor de «Completar fichas». */}
      <h2 className={styles.grupo}>Herramientas</h2>
      <ul className={renglon.tarjeta}>
        <Renglon href="/admin/ciudades" Icono={IconoUbicacion} titulo="Ciudades" detalle={ciudades ? resumenCiudades(ciudades.ciudades) : "No pudimos leer las ciudades"} />
        <Renglon href="/admin/corridas?desde=admin" Icono={IconoReloj} titulo="Rutinas" detalle={rutinas} />
        <Renglon href="/admin/grafo" Icono={IconoGrafo} titulo="Grafo cultural" detalle="Mapa en 3D de lugares, artistas y público" />
        <Renglon href="/admin/obras-colectivas" Icono={IconoPincel} titulo="Obras colectivas" detalle="Pintar juntos sobre una pared proyectada" />
      </ul>
    </main>
  );
}
