import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import Barra from "@/components/ui/Barra";
import EnCamino from "@/components/ui/EnCamino";
import { EsqueletoAjuste, EsqueletoLinea } from "@/components/ui/Esqueleto";
import { IconoCalendario, IconoChevronDerecha, IconoDestello, IconoEstrella, IconoInstagram, IconoPersonas, IconoPin, IconoPincel, IconoReloj, IconoUbicacion } from "@/components/ui/Iconos";
import plantilla from "@/components/ui/Plantilla.module.css";
import renglon from "@/components/ui/Renglon.module.css";
import { CUENTA_INSTAGRAM } from "@/lib/instagram/texto";
import { lineaInstagram, lineaRutinas, lineaShowcase } from "@/lib/portadaAdmin";
import IconoGrafo from "./grafo/IconoGrafo";
import { abrirTodosLosNumeros } from "./numerosEnHoja";
import TodosLosNumeros from "./TodosLosNumeros";
import styles from "./admin.module.css";

/** La nota bajo «Esta semana en números»: la misma con los cuadros en gris y con los de verdad, para que nada se mueva al llegar. */
export const NOTA_NUMEROS = "Comparado con la semana anterior";

const ICONO = { personas: IconoPersonas, lugares: IconoPin, eventos: IconoCalendario, artistas: IconoEstrella };
export type ClaveGestionar = keyof typeof ICONO;
export const SECCIONES = [
  { clave: "personas", titulo: "Personas", href: "/admin/personas" },
  { clave: "lugares", titulo: "Lugares", href: "/admin/lugares" },
  { clave: "eventos", titulo: "Eventos", href: "/admin/eventos" },
  { clave: "artistas", titulo: "Artistas", href: "/admin/artistas" },
] as const;

/**
 * Lo que dirá cada línea, de un largo típico, para medir su espera (`EsqueletoLinea` con `muestra`: no se ve ni se lee): así la barra gris se
 * parte en renglones donde se partirá el texto y nada salta al llegar. Las frases son las de la portada con cifras de ejemplo.
 */
const MUESTRA = {
  gestionar: { personas: "3 nuevas · 25 nunca entraron · 1 correo rebota o se quejó", lugares: "40 sin fecha próxima · 2 ocultos", eventos: "12 sin imagen", artistas: "8 llevados por su gente · 1 oculto" },
  instagram: lineaInstagram(CUENTA_INSTAGRAM, 4, 5),
  showcase: lineaShowcase({ candidatos: 16, invitados: 2 }),
  ciudades: "3 abiertas · 2 detectadas",
  rutinas: lineaRutinas(true, "192,29"),
  numeros: [
    { nombre: "Personas nuevas", valor: "3", base: "cuentas nuevas, de 80", cambio: "▲ 2 más" },
    { nombre: "Eventos de la comunidad", valor: "3", base: "publicados por gente que no es de administración", cambio: "▲ 1 más" },
    { nombre: "Voy y Me interesa", valor: "18", base: "de 12 personas", cambio: "▲ 5 más" },
    { nombre: "Eventos esta semana", valor: "37", base: "en 18 de 71 lugares", cambio: "▲ 2 más" },
  ],
} as const;

/**
 * Un renglón de la portada: icono convencional, su nombre, su línea de estado en llano y, si la tiene, su cuenta. El nombre y el enlace se
 * pintan de inmediato; la línea puede llegar después (un `Suspense` con `EsqueletoLinea` del alto de su letra). Al tocarlo, mientras el servidor
 * responde, el renglón lo dice (`EnCamino`). `prefetch={false}` en el de Instagram: su pantalla es la más cara y pasar por encima no debe
 * pedirla (acta del council de OL-497, M8).
 */
export function RenglonPortada({ href, Icono, titulo, detalle, total, prefetch }: { href: string; Icono: ComponentType<SVGProps<SVGSVGElement>>; titulo: string; detalle?: ReactNode; total?: ReactNode; prefetch?: false }) {
  return (
    <li>
      <Link href={href} className={renglon.ajuste} prefetch={prefetch}>
        <Icono width={20} height={20} />
        <b>{titulo}</b>
        {detalle && <small>{detalle}</small>}
        <span>
          {total ?? null}
          <IconoChevronDerecha />
        </span>
        <EnCamino className={renglon.enCamino} />
      </Link>
    </li>
  );
}

/** Gestionar: las cuatro listas con su cuenta y su línea; sin los números (mientras llegan o si no se pudieron leer), solo el nombre. */
export function FilasGestionar({ renglones }: { renglones: readonly { clave: ClaveGestionar; titulo: string; href: string; total?: ReactNode; detalle?: ReactNode }[] }) {
  return (
    <ul className={renglon.tarjeta}>
      {renglones.map((r) => (
        <RenglonPortada key={r.clave} href={r.href} Icono={ICONO[r.clave]} titulo={r.titulo} detalle={r.detalle} total={r.total} />
      ))}
    </ul>
  );
}

/**
 * Administración (OL-494; variante C firmada por el founder el 2026-10-29 del prototipo OL-493, bitácora 525), por bloques (OL-498): la barra,
 * los títulos y los renglones fijos se pintan al instante; Pendiente, los números, Gestionar y la línea de cada renglón llegan cada uno por su
 * cuenta (los pone la página, cada uno en su `Suspense`). Esta pieza es el armazón, el mismo para la página y para su espera (`loading.tsx`, con
 * todo en gris): así no se mueve nada entre la espera, el armazón y cada bloque que llega.
 */
export default function PortadaAdmin({ pendiente, numeros, gestionar, lineas, espera = false }: { pendiente: ReactNode; numeros: ReactNode; gestionar: ReactNode; lineas: { instagram: ReactNode; showcase: ReactNode; ciudades: ReactNode; rutinas: ReactNode }; espera?: boolean }) {
  return (
    <main className={plantilla.paginaContenido} aria-busy={espera || undefined}>
      <Barra volver={{ href: "/ajustes", texto: "Ajustes" }} titulo="Administración" />
      {pendiente}
      {numeros}
      <TodosLosNumeros abrir={abrirTodosLosNumeros} />

      <h2 className={styles.grupo}>Gestionar</h2>
      {gestionar}

      {/* Difusión: lo que da a conocer a la gente y a los artistas. Instagram dice lo que salió y lo que se queda sin salir por falta de material. */}
      <h2 className={styles.grupo}>Difusión</h2>
      <ul className={renglon.tarjeta}>
        <RenglonPortada href="/admin/instagram" prefetch={false} Icono={IconoInstagram} titulo="Instagram" detalle={lineas.instagram} />
        {/* OL-494: presentar artistas a foros, gestores, becas y mecenas es dar a conocer, como Instagram. */}
        <RenglonPortada href="/admin/showcase" Icono={IconoDestello} titulo="Showcase" detalle={lineas.showcase} />
      </ul>

      {/* Herramientas: lo que se usa de vez en cuando. Rutinas lleva a Corridas, donde vive el interruptor de «Completar fichas». */}
      <h2 className={styles.grupo}>Herramientas</h2>
      <ul className={renglon.tarjeta}>
        <RenglonPortada href="/admin/ciudades" Icono={IconoUbicacion} titulo="Ciudades" detalle={lineas.ciudades} />
        <RenglonPortada href="/admin/corridas?desde=admin" Icono={IconoReloj} titulo="Rutinas" detalle={lineas.rutinas} />
        <RenglonPortada href="/admin/grafo" Icono={IconoGrafo} titulo="Grafo cultural" detalle="Mapa en 3D de lugares, artistas y público" />
        <RenglonPortada href="/admin/obras-colectivas" Icono={IconoPincel} titulo="Obras colectivas" detalle="Pintar juntos sobre una pared proyectada" />
      </ul>
    </main>
  );
}

/** Pendiente mientras llega: su título y tres renglones grises. Lleva `aria-busy`: la memoria de scroll no repone antes de que llegue. */
export function PendienteEspera() {
  return (
    <>
      <h2 className={styles.grupo}>Pendiente</h2>
      <ul className={renglon.tarjeta} aria-busy="true" aria-label="Cargando lo pendiente">
        <EsqueletoAjuste />
        <EsqueletoAjuste />
        <EsqueletoAjuste />
      </ul>
    </>
  );
}

/** «Esta semana en números» mientras llega: el título, la nota y cuatro cuadros grises del tamaño de los de verdad. */
export function NumerosEspera() {
  return (
    <>
      <h2 className={`${styles.grupo} ${styles.conNota}`}>Esta semana en números</h2>
      <p className={styles.nota}>{NOTA_NUMEROS}</p>
      <ul className={`${styles.indicadores} ${styles.enSemana}`} aria-busy="true" aria-label="Cargando los números">
        {MUESTRA.numeros.map((m) => (
          <li key={m.nombre} aria-hidden="true">
            {/* El mismo cuadro, con las mismas piezas, cada una en gris y del largo de lo que dirá. */}
            <div className={`${styles.indicador} ${styles.indicadorEspera}`}>
              <span className={styles.nombreIndicador}>
                <EsqueletoLinea muestra={m.nombre} />
              </span>
              <b>
                <EsqueletoLinea muestra={m.valor} />
              </b>
              <small>
                <EsqueletoLinea muestra={m.base} />
              </small>
              <span className={styles.cambio}>
                <EsqueletoLinea muestra={m.cambio} />
              </span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Gestionar mientras llegan sus cuentas: los cuatro renglones de verdad (ya se pueden tocar) con su línea y su cuenta en gris. */
export function GestionarEspera() {
  return <FilasGestionar renglones={SECCIONES.map((s) => ({ ...s, detalle: <EsqueletoLinea muestra={MUESTRA.gestionar[s.clave]} />, total: <EsqueletoLinea muestra="120" /> }))} />;
}

/** La línea de un renglón mientras llega, del largo de lo que dirá. */
export const LineaEspera = ({ de }: { de: keyof Omit<typeof MUESTRA, "gestionar" | "numeros"> }) => <EsqueletoLinea muestra={MUESTRA[de]} />;

/** La portada entera en gris (la espera de `loading.tsx` en /admin): el mismo armazón que la página, con cada bloque en su espera. */
export function PortadaEsqueleto() {
  return <PortadaAdmin espera pendiente={<PendienteEspera />} numeros={<NumerosEspera />} gestionar={<GestionarEspera />} lineas={{ instagram: <LineaEspera de="instagram" />, showcase: <LineaEspera de="showcase" />, ciudades: <LineaEspera de="ciudades" />, rutinas: <LineaEspera de="rutinas" /> }} />;
}
