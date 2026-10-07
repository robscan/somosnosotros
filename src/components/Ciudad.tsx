"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { enlaceAltaLugar } from "@/lib/armazon";
import { altaLejosDeCiudades, ciudadInicialCercana, ciudadesDeHoja, filasDeCiudades, guardarEleccionCiudad, hrefConCiudad, leerEleccionCiudad, ofrecerUbicacionCiudades, type Ciudad, type CiudadConArtistas, type CiudadConDatos, type SeccionCiudades } from "@/lib/ciudad";
import type { Punto } from "@/lib/geo";
import { normalizarNombre } from "@/lib/lugares";
import { leerUbicacionCercana, permisoConcedido } from "@/lib/ubicacion";
import Boton from "./ui/Boton";
import { CampoBuscar } from "./ui/Buscador";
import { Chip } from "./ui/Chip";
import Hoja from "./ui/Hoja";
import hoja from "./ui/Hoja.module.css";
import { IconoCaret, IconoOk, IconoPin, IconoUbicacion } from "./ui/Iconos";
import renglon from "./ui/Renglon.module.css";
import { avisarUbicacion, useUbicacionFresca } from "./useUbicacionFresca";
import { useCanalDePantalla } from "./useCanalDeListas";
import styles from "./Ciudad.module.css";

type Props = {
  ciudad: Ciudad;
  ciudades: readonly (CiudadConDatos | CiudadConArtistas)[];
  seccion: SeccionCiudades;
  /** Filtrar reemplaza la entrada de historial; no abre otra pantalla. */
  hrefDe: (c: Ciudad) => string;
};
const NEGADO = "sn:ubicacion-negada";
function leerNegado() {
  try { return window.sessionStorage.getItem(NEGADO) === "1"; } catch { return false; }
}
const TITULOS: Record<SeccionCiudades, { titulo: string; nota: string }> = {
  eventos: { titulo: "Ciudades con eventos", nota: "Solo salen ciudades donde ya hay eventos publicados." },
  lugares: { titulo: "Ciudades con lugares", nota: "Solo salen ciudades donde ya hay lugares publicados." },
  artistas: { titulo: "Ciudades con artistas", nota: "Solo salen ciudades donde ya hay artistas registrados." },
  buscar: { titulo: "Ciudades", nota: "Solo salen ciudades donde ya hay lugares o eventos publicados." },
};

// Inicio se remonta al cambiar ciudad. Esta intención dura solo la navegación manual,
// nunca una recarga o la restauración de la preferencia guardada.
let cambioManual: { slug: string; origen: string; destino: string } | null = null;
function descartarCambioManual() {
  cambioManual = null;
  window.removeEventListener("popstate", descartarCambioManual);
  window.removeEventListener("pagehide", descartarCambioManual);
}
function anotarCambioManual(slug: string, href: string) {
  descartarCambioManual();
  cambioManual = { slug, origen: window.location.href, destino: new URL(href, window.location.href).href };
  window.addEventListener("popstate", descartarCambioManual);
  window.addEventListener("pagehide", descartarCambioManual);
}

/** Artistas no tiene centros propios: no lee ni consulta la ubicación para esta hoja. */
export default function ChipCiudad(props: Props) {
  return props.seccion === "artistas" ? <SelectorCiudad {...props} punto={null} /> : <CiudadConUbicacion {...props} />;
}
function CiudadConUbicacion(props: Props) {
  const punto = useUbicacionFresca();
  return <SelectorCiudad {...props} punto={punto} />;
}

function SelectorCiudad({ ciudad, ciudades, seccion, hrefDe, punto }: Props & { punto: Punto | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const busqueda = useSearchParams().toString();
  const canal = useCanalDePantalla();
  const avisar = canal?.avisar;
  const limpiar = canal?.limpiar;
  const [abierta, setAbierta] = useState(false);
  const inicialResuelta = useRef(false);
  const ultimaRutaAvisada = useRef<string | null>(null);
  useEffect(() => {
    // Lugares conserva el canal: Atrás no debe dejar el aviso de la ciudad anterior.
    if (ultimaRutaAvisada.current && ultimaRutaAvisada.current !== window.location.href) {
      ultimaRutaAvisada.current = null;
      limpiar?.("ciudad");
    }
    if (!cambioManual) return;
    if (!avisar || (window.location.href !== cambioManual.origen && window.location.href !== cambioManual.destino)) {
      descartarCambioManual();
      return;
    }
    if (window.location.href !== cambioManual.destino || ciudad.slug !== cambioManual.slug) return;
    ultimaRutaAvisada.current = cambioManual.destino;
    descartarCambioManual();
    avisar({ texto: `Ciudad cambiada a ${ciudad.nombre}`, de: "ciudad" });
  }, [avisar, limpiar, ciudad.slug, ciudad.nombre, pathname, busqueda]);
  useEffect(() => () => {
    // Si se fue a otra pantalla, la elección cancelada no puede reaparecer al volver.
    // El remonte en el destino esperado conserva la marca hasta que resuelva el chip.
    if (cambioManual && window.location.href !== cambioManual.destino) descartarCambioManual();
  }, []);
  useEffect(() => {
    const explicita = new URLSearchParams(window.location.search).has("ciudad");
    const eleccion = leerEleccionCiudad();
    // La preferencia se resuelve contra el catálogo común, no contra la oferta de esta sección.
    if (!explicita && eleccion && ciudades.some(c => c.slug === eleccion)) {
      inicialResuelta.current = true;
      router.replace(hrefConCiudad(window.location.pathname + window.location.search, eleccion));
      return;
    }
    if (inicialResuelta.current || !punto) return;
    inicialResuelta.current = true;
    const cercana = ciudadInicialCercana(ciudad, ciudadesDeHoja(ciudad, ciudades, seccion), punto, seccion, explicita, !!eleccion);
    if (cercana) {
      guardarEleccionCiudad(cercana.slug);
      router.replace(hrefConCiudad(hrefDe(cercana), cercana.slug));
    }
  }, [ciudad, ciudades, punto, seccion, hrefDe, router]);
  function elegir(c: Ciudad) {
    guardarEleccionCiudad(c.slug);
    setAbierta(false);
    descartarCambioManual();
    if (c.slug === ciudad.slug) return;
    const href = hrefConCiudad(hrefDe(c), c.slug);
    if (avisar) anotarCambioManual(c.slug, href);
    router.replace(href);
  }
  return <>
    <Chip variante="contexto" icono={<IconoPin width={16} height={16} />} fin={<IconoCaret width={12} height={12} />} onClick={() => setAbierta(true)}>{ciudad.nombre}</Chip>
    {abierta && <HojaCiudades ciudad={ciudad} ciudades={ciudadesDeHoja(ciudad, ciudades, seccion)} seccion={seccion} hrefDe={hrefDe} punto={punto} onCerrar={() => setAbierta(false)} onElegir={elegir} />}
  </>;
}

function HojaCiudades({ ciudad, ciudades, seccion, punto, onCerrar, onElegir }: Props & { punto: Punto | null; onCerrar: () => void; onElegir: (c: Ciudad) => void }) {
  const [texto, setTexto] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [concedido, setConcedido] = useState<boolean | null>(null);
  const [negado, setNegado] = useState(leerNegado);
  const [leyendo, setLeyendo] = useState(false);
  const [aviso, setAviso] = useState(false);
  const todas: readonly (CiudadConDatos | CiudadConArtistas)[] = ciudades;
  const enBusqueda = buscando || !!texto;
  const buscado = normalizarNombre(texto);
  const filas = filasDeCiudades(ciudad, todas, punto, seccion).filter(({ ciudad: c }) => normalizarNombre(c.nombre).includes(buscado));
  const sinCoincidencias = seccion !== "artistas" && todas.length > 8 && !!buscado && filas.length === 0;
  const alta = altaLejosDeCiudades(ciudad, todas, punto, seccion);
  const { titulo, nota } = TITULOS[seccion];
  useEffect(() => {
    if (seccion === "artistas") return;
    let vigente = true;
    void permisoConcedido().then((valor) => vigente && setConcedido(valor));
    return () => { vigente = false; };
  }, [seccion]);

  async function usarUbicacion() {
    setAviso(false);
    setLeyendo(true);
    try {
      await leerUbicacionCercana();
      avisarUbicacion();
      setConcedido(true);
    } catch (error) {
      if (error === "negado") {
        setNegado(true);
        try { window.sessionStorage.setItem(NEGADO, "1"); } catch { /* La hoja conserva el estado en memoria. */ }
      } else setAviso(true);
    } finally { setLeyendo(false); }
  }

  return <Hoja etiqueta={titulo} titulo={titulo} plano onCerrar={onCerrar}>
    <p className={hoja.nota}>{nota}</p>
    <div className={[styles.opciones, enBusqueda && styles.buscando].filter(Boolean).join(" ")}>
      {!enBusqueda && ofrecerUbicacionCiudades(seccion, punto, concedido, negado) && <Boton variante="secundario" forma="pildora" onClick={usarUbicacion} disabled={leyendo} aria-busy={leyendo}>
        <IconoUbicacion width={20} height={20} /> Usar mi ubicación
      </Boton>}
      {!enBusqueda && aviso && <p className={hoja.nota} role="status">No pudimos leer tu ubicación.</p>}
      {/* Conserva la altura hasta cerrar: perder el foco no debe mover una fila durante el toque. */}
      {todas.length > 8 && <div onFocus={() => setBuscando(true)}>
        <CampoBuscar valor={texto} onCambiar={setTexto} placeholder="Nombre de la ciudad" ariaLabel="Nombre de la ciudad" />
      </div>}
      {filas.length ? <ul className={`${renglon.tarjeta} ${styles.lista}`}>
        {filas.map(({ ciudad: c, distancia, estasAqui }) => <li key={c.slug}>
          <button type="button" className={renglon.ajuste} onClick={() => onElegir(c)} aria-current={c.slug === ciudad.slug ? "true" : undefined}>
            {estasAqui ? <IconoUbicacion width={20} height={20} /> : <IconoPin width={20} height={20} />}
            <b>{c.nombre}</b>
            <small>{estasAqui ? <><span className={styles.aqui}>Estás aquí</span> · </> : distancia !== null ? `${Math.round(distancia).toLocaleString("es-MX")} km · ` : ""}{resumen(c)}</small>
            {c.slug === ciudad.slug && <IconoOk />}
          </button>
        </li>)}
      </ul> : <p className={hoja.nota}>{buscado ? `Nada con «${texto.trim()}».` : "Aún no hay ciudades."}</p>}
      {sinCoincidencias ? <Boton href={enlaceAltaLugar()} onClick={onCerrar}>Agregar un lugar</Boton> : !enBusqueda && alta && <Boton href={alta.href} onClick={onCerrar}>{alta.texto}</Boton>}
    </div>
  </Hoja>;
}

function resumen(c: CiudadConDatos | CiudadConArtistas): string {
  if ("artistas" in c) return c.artistas === 1 ? "1 artista" : c.artistas ? `${c.artistas} artistas` : "Sin artistas todavía";
  const partes: string[] = [];
  if (c.lugares) partes.push(c.lugares === 1 ? "1 lugar" : `${c.lugares} lugares`);
  if (c.eventos) partes.push(c.eventos === 1 ? "1 evento" : `${c.eventos} eventos`);
  return partes.length ? partes.join(" · ") : "Sin lugares todavía";
}
