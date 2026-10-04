"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { altaLejosDeCiudades, ciudadInicialCercana, ciudadesDeHoja, filasDeCiudades, ofrecerUbicacionCiudades, type Ciudad, type CiudadConArtistas, type CiudadConDatos, type SeccionCiudades } from "@/lib/ciudad";
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
import styles from "./Ciudad.module.css";

type Props = {
  ciudad: Ciudad;
  ciudades: readonly (CiudadConDatos | CiudadConArtistas)[];
  seccion: SeccionCiudades;
  /** Filtrar reemplaza la entrada de historial; no abre otra pantalla. */
  hrefDe: (c: Ciudad) => string;
};
const ELECCION = "sn:ciudad-elegida";
const NEGADO = "sn:ubicacion-negada";
function guardarEleccion(slug: string) {
  try { window.localStorage.setItem(ELECCION, slug); } catch { /* Almacenamiento privado o lleno. */ }
}
function hayEleccion() {
  try { return !!window.localStorage.getItem(ELECCION); } catch { return false; }
}
function leerNegado() {
  try { return window.sessionStorage.getItem(NEGADO) === "1"; } catch { return false; }
}
const TITULOS: Record<SeccionCiudades, { titulo: string; nota: string }> = {
  eventos: { titulo: "Ciudades con eventos", nota: "Solo salen ciudades donde ya hay eventos publicados." },
  lugares: { titulo: "Ciudades con lugares", nota: "Solo salen ciudades donde ya hay lugares publicados." },
  artistas: { titulo: "Ciudades con artistas", nota: "Solo salen ciudades donde ya hay artistas registrados." },
  buscar: { titulo: "Ciudades", nota: "Solo salen ciudades donde ya hay lugares o eventos publicados." },
};

/** Artistas no tiene centros propios: no lee ni consulta la ubicación para esta hoja. */
export default function ChipCiudad(props: Props) {
  const ciudades = ciudadesDeHoja(props.ciudad, props.ciudades, props.seccion);
  const filtradas = { ...props, ciudades };
  return props.seccion === "artistas" ? <SelectorCiudad {...filtradas} punto={null} /> : <CiudadConUbicacion {...filtradas} />;
}
function CiudadConUbicacion(props: Props) {
  const punto = useUbicacionFresca();
  return <SelectorCiudad {...props} punto={punto} />;
}

function SelectorCiudad({ ciudad, ciudades, seccion, hrefDe, punto }: Props & { punto: Punto | null }) {
  const router = useRouter();
  const [abierta, setAbierta] = useState(false);
  const inicialResuelta = useRef(false);
  useEffect(() => {
    if (inicialResuelta.current || !punto) return;
    inicialResuelta.current = true;
    const cercana = ciudadInicialCercana(ciudad, ciudades, punto, seccion, new URLSearchParams(window.location.search).has("ciudad"), hayEleccion());
    if (cercana) {
      guardarEleccion(cercana.slug);
      router.replace(hrefDe(cercana));
    }
  }, [ciudad, ciudades, punto, seccion, hrefDe, router]);
  return <>
    <Chip variante="contexto" icono={<IconoPin width={16} height={16} />} fin={<IconoCaret width={12} height={12} />} onClick={() => setAbierta(true)}>{ciudad.nombre}</Chip>
    {abierta && <HojaCiudades ciudad={ciudad} ciudades={ciudades} seccion={seccion} hrefDe={hrefDe} punto={punto} onCerrar={() => setAbierta(false)} />}
  </>;
}

function HojaCiudades({ ciudad, ciudades, seccion, hrefDe, punto, onCerrar }: Props & { punto: Punto | null; onCerrar: () => void }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [concedido, setConcedido] = useState<boolean | null>(null);
  const [negado, setNegado] = useState(leerNegado);
  const [leyendo, setLeyendo] = useState(false);
  const [aviso, setAviso] = useState(false);
  const todas: readonly (CiudadConDatos | CiudadConArtistas)[] = ciudades;
  const buscado = normalizarNombre(texto);
  const filas = filasDeCiudades(ciudad, todas, punto, seccion).filter(({ ciudad: c }) => normalizarNombre(c.nombre).includes(buscado));
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
  function elegir(c: Ciudad) {
    guardarEleccion(c.slug);
    onCerrar();
    if (c.slug !== ciudad.slug) router.replace(hrefDe(c));
  }

  return <Hoja etiqueta={titulo} titulo={titulo} plano onCerrar={onCerrar}>
    <p className={hoja.nota}>{nota}</p>
    <div className={[styles.opciones, buscando && styles.buscando].filter(Boolean).join(" ")}>
      {ofrecerUbicacionCiudades(seccion, punto, concedido, negado) && <Boton variante="secundario" forma="pildora" onClick={usarUbicacion} disabled={leyendo} aria-busy={leyendo}>
        <IconoUbicacion width={20} height={20} /> Usar mi ubicación
      </Boton>}
      {aviso && <p className={hoja.nota} role="status">No pudimos leer tu ubicación.</p>}
      {todas.length > 8 && <div onFocus={() => setBuscando(true)} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setBuscando(false)}>
        <CampoBuscar valor={texto} onCambiar={setTexto} placeholder="Nombre de la ciudad" ariaLabel="Nombre de la ciudad" />
      </div>}
      {filas.length ? <ul className={`${renglon.tarjeta} ${styles.lista}`}>
        {filas.map(({ ciudad: c, distancia, estasAqui }) => <li key={c.slug}>
          <button type="button" className={renglon.ajuste} onClick={() => elegir(c)} aria-current={c.slug === ciudad.slug ? "true" : undefined}>
            {estasAqui ? <IconoUbicacion width={20} height={20} /> : <IconoPin width={20} height={20} />}
            <b>{c.nombre}</b>
            <small>{estasAqui ? <><span className={styles.aqui}>Estás aquí</span> · </> : distancia !== null ? `${Math.round(distancia).toLocaleString("es-MX")} km · ` : ""}{resumen(c)}</small>
            {c.slug === ciudad.slug && <IconoOk />}
          </button>
        </li>)}
      </ul> : <p className={hoja.nota}>{buscado ? `Nada con «${texto.trim()}».` : "Aún no hay ciudades."}</p>}
      {alta && <Boton href={alta.href} onClick={onCerrar}>{alta.texto}</Boton>}
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
