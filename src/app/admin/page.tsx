import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { credito, propuestasPorRevisar, resumenCiudades, usd, type PanelCiudades } from "@/lib/ciudadesAdmin";
import { diaLocal } from "@/lib/fechas";
import { CUENTA_INSTAGRAM } from "@/lib/instagram/texto";
import { tituloDePagina } from "@/lib/marca";
import { cuandoPaso, GALLETA_CIUDAD, indicadoresPortada, leerCiudad, renglonesGestionar, type Aportes, type Pendiente, type Resumen } from "@/lib/panel";
import { lineaInstagram, lineaRutinas, lineaShowcase, type PendienteInstagram } from "@/lib/portadaAdmin";
import { CLAVE_SEMANAL, leerAjusteSemanal } from "@/lib/rutinas/ajusteSemanal";
import { renglonPorAprobar } from "@/lib/showcasePorAprobar";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { cargarPanelCiudades } from "./ciudades/consultas";
import { cargarAportes, cargarPendientes, cargarSoloResumen } from "./consultas";
import Indicadores from "./Indicadores";
import Pendientes from "./Pendientes";
import { cargarInstagramLinea, cargarInstagramPendiente } from "./portada";
import PortadaAdmin, { FilasGestionar, GestionarEspera, LineaEspera, NOTA_NUMEROS, NumerosEspera, PendienteEspera, SECCIONES } from "./PortadaAdmin";
import Reintentar from "./Reintentar";
import { cargarResumenPorAprobar, cargarResumenShowcase } from "./showcase/consultas";
import styles from "./admin.module.css";

export const metadata = { title: tituloDePagina("Administración"), robots: { index: false, follow: false } };

/**
 * Administración (OL-494; variante C firmada por el founder el 2026-10-29 del prototipo OL-493, bitácora 525). Al abrir, una sola pregunta:
 * ¿qué tengo que atender hoy? Cinco bloques en ese orden: Pendiente (lo único en rojo; también si Instagram dejó de publicar), «Esta semana en
 * números» (cuatro cuadros comparados con la semana anterior y «Ver todos los números ›», la hoja con el resto, el embudo, Fichas y el CAPO),
 * Gestionar (las cuatro listas), Difusión (Instagram y Showcase) y Herramientas (Ciudades, Rutinas, Grafo cultural y Obras colectivas), cada
 * renglón con su línea de estado en palabras de todos los días. El interruptor de las rutinas vive en Corridas. Se entra desde Ajustes y Atrás
 * vuelve ahí.
 *
 * OL-498 (bitácora 530): la portada ya no espera a la lectura más lenta. Tras la sesión se pinta el armazón (`PortadaAdmin`: barra, títulos y
 * renglones) y cada bloque llega solo, en su `Suspense` con la forma de lo que viene: Pendiente, los números, las cuentas de Gestionar y la línea
 * de cada renglón (la de Instagram, con «N sin material», cuando esté). Todas las lecturas salen a la vez al entrar; cada bloque espera solo las
 * suyas y ninguna falla tumba a otra: cada una dice en su sitio qué no se pudo leer.
 */
export default async function Admin() {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/admin");
  if (actual.perfil.rol !== "admin") redirect("/");
  const ciudadSesion = leerCiudad("eventos", (await cookies()).get(GALLETA_CIUDAD)?.value ?? null);
  const supabase = await clienteServidor();
  const ahora = new Date();

  const resumen = cargarSoloResumen().catch(() => null);
  const aportes = cargarAportes().catch(() => null);
  const ciudades = cargarPanelCiudades().catch(() => null);
  const pendientes = cargarPendientes().catch(() => ({ pendientes: [], error: true }));
  const porAprobar = cargarResumenPorAprobar();
  const instagram = supabase ? cargarInstagramPendiente(supabase, ahora).catch(() => ({ pendiente: null, leido: false })) : Promise.resolve({ pendiente: null, leido: false });
  const lineaIg = (supabase ? cargarInstagramLinea(supabase, ciudadSesion, ahora).catch(() => null) : Promise.resolve(null)).then((i) => lineaInstagram(CUENTA_INSTAGRAM, i?.publicadas ?? null, i?.sinMaterial ?? null));
  const semanal = supabase
    ? Promise.resolve(supabase.from("configuracion").select("valor").eq("clave", CLAVE_SEMANAL).maybeSingle()).then(
        (r) => (r.error ? null : leerAjusteSemanal(r.data?.valor).activa),
        () => null,
      )
    : Promise.resolve(null);
  const lineas = {
    instagram: lineaIg,
    showcase: cargarResumenShowcase().then(lineaShowcase),
    ciudades: ciudades.then((c) => (c ? resumenCiudades(c.ciudades) : "No pudimos leer las ciudades")),
    rutinas: Promise.all([semanal, ciudades]).then(([activa, c]) => lineaRutinas(activa, c ? usd(credito(c.credito, ahora).queda) : null)),
  };
  const linea = (de: keyof typeof lineas) => (
    <Suspense fallback={<LineaEspera de={de} />}>
      <Texto de={lineas[de]} />
    </Suspense>
  );

  return (
    <PortadaAdmin
      pendiente={
        <Suspense fallback={<PendienteEspera />}>
          <BloquePendiente pendientes={pendientes} ciudades={ciudades} porAprobar={porAprobar} instagram={instagram} ahora={ahora} />
        </Suspense>
      }
      numeros={
        <Suspense fallback={<NumerosEspera />}>
          <BloqueNumeros resumen={resumen} aportes={aportes} ahora={ahora} />
        </Suspense>
      }
      gestionar={
        <Suspense fallback={<GestionarEspera />}>
          <BloqueGestionar resumen={resumen} />
        </Suspense>
      }
      lineas={{ instagram: linea("instagram"), showcase: linea("showcase"), ciudades: linea("ciudades"), rutinas: linea("rutinas") }}
    />
  );
}

/** La línea de estado de un renglón, cuando llega. */
async function Texto({ de }: { de: Promise<string> }) {
  return <>{await de}</>;
}

/**
 * Pendiente: los reclamos y reportes, las propuestas de las rutinas y las evidencias del showcase por revisar (firma de OL-425 y OL-446) y, si
 * dejó de publicar, Instagram (OL-494). Llega cuando están sus cuatro lecturas, juntas: nunca «Nada pendiente» y luego un renglón rojo. Si alguna
 * no se pudo leer, no dice «Nada pendiente»: dice que no pudo leerlo todo.
 */
async function BloquePendiente({ pendientes, ciudades, porAprobar, instagram, ahora }: { pendientes: Promise<{ pendientes: Pendiente[]; error: boolean }>; ciudades: Promise<PanelCiudades | null>; porAprobar: Promise<{ n: number; artistas: number; ultima: string | null } | null>; instagram: Promise<{ pendiente: PendienteInstagram | null; leido: boolean }>; ahora: Date }) {
  const [p, c, pa, ig] = await Promise.all([pendientes, ciudades, porAprobar, instagram]);
  // OL-446: primero las evidencias del showcase por aprobar (un solo renglón a «Por aprobar»); luego las propuestas de las rutinas.
  const showcase = renglonPorAprobar(pa && { ...pa, ultima: pa.ultima && diaLocal(new Date(pa.ultima)) }, diaLocal(ahora));
  const porRevisar = [...(showcase ? [showcase] : []), ...(c ? propuestasPorRevisar(c.corridas, c.ciudades, ahora).filter((x) => x.tipo !== "showcase") : [])];
  return (
    // La llave cambia cuando la lista pasa de no leída a leída (Intentar de nuevo): así se monta con los pendientes reales.
    <Pendientes key={p.error ? "sin-leer" : "leidos"} iniciales={p.pendientes.map((x) => ({ ...x, cuando: cuandoPaso(x.creado_en, ahora) }))} error={p.error} incompleto={!c || !pa || !ig.leido} porRevisar={porRevisar} instagram={ig.pendiente} />
  );
}

/** «Esta semana en números»: los cuatro cuadros, con su error en su sitio. */
async function BloqueNumeros({ resumen, aportes, ahora }: { resumen: Promise<Resumen | null>; aportes: Promise<Aportes | null>; ahora: Date }) {
  const [r, a] = await Promise.all([resumen, aportes]);
  return (
    <>
      <h2 className={r ? `${styles.grupo} ${styles.conNota}` : styles.grupo}>Esta semana en números</h2>
      {r ? <Indicadores lista={indicadoresPortada(r, a, diaLocal(ahora))} nota={NOTA_NUMEROS} numeros /> : <Reintentar texto="No pudimos leer los números." />}
      {r && !a && <Reintentar texto="No pudimos leer Voy y Me interesa." />}
    </>
  );
}

/** Gestionar con sus cuentas; sin ellas, solo el nombre de cada lista. */
async function BloqueGestionar({ resumen }: { resumen: Promise<Resumen | null> }) {
  const r = await resumen;
  return <FilasGestionar renglones={r ? renglonesGestionar(r.gestionar) : SECCIONES} />;
}
