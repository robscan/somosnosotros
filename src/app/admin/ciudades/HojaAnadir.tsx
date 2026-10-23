"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import ciudadCss from "@/components/Ciudad.module.css";
import Boton from "@/components/ui/Boton";
import { CampoBuscar } from "@/components/ui/Buscador";
import Campo from "@/components/ui/Campo";
import Hoja from "@/components/ui/Hoja";
import hoja from "@/components/ui/Hoja.module.css";
import { IconoPin, IconoReloj, IconoUbicacion } from "@/components/ui/Iconos";
import renglon from "@/components/ui/Renglon.module.css";
import { ETIQUETA_ESTADO, type EstadoVisible } from "@/lib/ciudadesAdmin";
import { abrirCiudad, resolverCiudad, sugerirCiudades, type Eleccion } from "./acciones";
import { MAPA_AREA, type Alta, type SugerenciaCiudad } from "./alta";
import styles from "../admin.module.css";
import css from "./ciudades.module.css";

export type Detectada = { slug: string; nombre: string; consultas: number };
type Props = {
  /** Las detectadas, de la más consultada a la menos: lo que propone la hoja sin escribir. */
  detectadas: readonly Detectada[];
  /** Abierta desde la fila de una detectada («Abrir»): la hoja empieza ya llena con ella. */
  desde: Detectada | null;
  onCerrar: () => void;
};

const ESPERA_MS = 250;
const PILDORA: Record<EstadoVisible, string> = { abierta: `${styles.etiqueta} ${css.ok}`, detectada: `${styles.etiqueta} ${styles.destacada}`, cerrada: styles.etiqueta };
const consultasEn30 = (n: number) => `${n} ${n === 1 ? "consulta" : "consultas"} en 30 días`;

/**
 * «Añadir ciudad» (prototipo firmado OL-431, pantallas B y C): la hoja de elegir ciudad de la app con un solo campo y su ✕. Sin escribir propone
 * las detectadas; al escribir, Mapbox sugiere ciudades con su estado y su país (desde el servidor) y las que ya están llevan su píldora: una
 * abierta lleva a su panel. Al elegir, el sistema resuelve todo —el mapa chico con el centro y el área, el nombre en la app (con «Cambiar»), la
 * hora y los municipios que cuentan con ella— y la persona solo confirma con «Abrir Oaxaca», que entra directo al panel de la ciudad.
 */
export default function HojaAnadir({ detectadas, desde, onCerrar }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [enfocado, setEnfocado] = useState(false);
  const [buscadas, setBuscadas] = useState<{ q: string; sugerencias: SugerenciaCiudad[]; sinMapa: boolean } | null>(null);
  const [ubicando, setUbicando] = useState<string | null>(desde?.nombre ?? null);
  const [alta, setAlta] = useState<Alta | null>(null);
  const [nombre, setNombre] = useState("");
  const [renombrar, setRenombrar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abriendo, iniciar] = useTransition();
  // Cada pedido lleva su número: si llega uno viejo (se escribió o se eligió otra cosa mientras), se descarta.
  const pedido = useRef(0);
  const t = q.trim();

  async function resolver(e: Eleccion, etiqueta: string, n = ++pedido.current) {
    setUbicando(etiqueta);
    setAlta(null);
    setError(null);
    const r = await resolverCiudad(e);
    if (n !== pedido.current) return;
    setUbicando(null);
    if (!r.ok) return setError(r.error);
    setAlta(r.alta);
    setNombre(r.alta.nombre);
    setRenombrar(false);
  }

  // Desde la fila de una detectada: se resuelve al abrir la hoja (el estado ya dice «Ubicando…»).
  const inicial = useRef(desde);
  useEffect(() => {
    if (inicial.current) void resolver({ slug: inicial.current.slug }, inicial.current.nombre, ++pedido.current);
  }, []);

  // Las sugerencias, con una espera corta tras la última tecla (al servidor, que pregunta a Mapbox con su token).
  useEffect(() => {
    if (t.length < 2 || alta || ubicando) return;
    const n = ++pedido.current;
    const espera = setTimeout(async () => {
      const r = await sugerirCiudades(t);
      if (n !== pedido.current) return;
      if (!r.ok) return setError(r.error);
      setBuscadas({ q: t, sugerencias: r.sugerencias, sinMapa: r.sinMapa });
    }, ESPERA_MS);
    return () => clearTimeout(espera);
  }, [t, alta, ubicando]);

  function escribir(v: string) {
    setQ(v);
    setError(null);
    // Escribir otra vez deja la ciudad elegida y vuelve a las sugerencias.
    if (alta || ubicando) {
      pedido.current++;
      setAlta(null);
      setUbicando(null);
      setRenombrar(false);
    }
  }

  function elegir(s: SugerenciaCiudad) {
    if (s.tipo === "existente" && s.estado === "abierta") {
      onCerrar();
      router.push(`/admin/ciudades/${s.slug}`);
      return;
    }
    void (s.tipo === "existente" ? resolver({ slug: s.slug }, s.nombre) : resolver({ lugar: s.lugar }, s.lugar.nombre));
  }

  function abrir() {
    if (!alta || !nombre.trim()) return;
    setError(null);
    iniciar(async () => {
      const r = await abrirCiudad({ desde: alta.desde, nombre, largo: alta.largo, lat: alta.lat, lng: alta.lng, radioKm: alta.radioKm, municipios: alta.municipios });
      if (!r.ok) return setError(r.error);
      router.push(r.href);
    });
  }

  const campo = (
    <div className={css.buscador} onFocus={() => setEnfocado(true)}>
      <CampoBuscar valor={q} onCambiar={escribir} placeholder="Nombre de la ciudad" ariaLabel="Nombre de la ciudad" />
    </div>
  );
  const aviso = error && (
    <p className="aviso-error" role="alert">
      {error}
    </p>
  );

  if (alta) {
    const limpio = nombre.trim();
    const pie = (
      <Boton disabled={!limpio || abriendo} aria-busy={abriendo} onClick={abrir}>
        {abriendo ? "Abriendo…" : limpio ? `Abrir ${limpio}` : "Falta el nombre"}
      </Boton>
    );
    return (
      <Hoja etiqueta="Añadir ciudad" titulo="Añadir ciudad" onCerrar={onCerrar} pie={pie}>
        <div className={ciudadCss.opciones}>
          {campo}
          <MapaArea alta={alta} />
          <ul className={renglon.tarjeta} aria-label="Lo que resolvió el sistema">
            {renombrar ? (
              <li className={css.renombrar}>
                <Campo
                  etiqueta="Nombre en la app"
                  name="nombre"
                  value={nombre}
                  maxLength={80}
                  autoComplete="off"
                  autoCapitalize="words"
                  enterKeyHint="go"
                  onChange={(e) => setNombre(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    abrir();
                  }}
                  ayuda={alta.largo !== limpio ? `Mapbox la llama «${alta.largo}»; ese nombre cuenta igual.` : undefined}
                />
              </li>
            ) : (
              <li>
                <div className={renglon.ajuste}>
                  <IconoPin width={20} height={20} />
                  <b>{nombre}</b>
                  <small>{[alta.largo !== nombre ? alta.largo : null, alta.region || null].filter(Boolean).join(", ")}</small>
                  <button type="button" className={`${styles.enlace} ${css.cambiar}`} onClick={() => setRenombrar(true)}>
                    Cambiar
                  </button>
                </div>
              </li>
            )}
            <li>
              <div className={renglon.ajuste}>
                <IconoReloj width={20} height={20} />
                <b>{alta.hora.titulo}</b>
                {alta.hora.detalle && <small>{alta.hora.detalle}</small>}
              </div>
            </li>
            <li>
              <div className={renglon.ajuste}>
                <IconoUbicacion width={20} height={20} />
                <b>{alta.area.titulo}</b>
                <small>{alta.area.detalle}</small>
              </div>
            </li>
          </ul>
          {aviso}
        </div>
      </Hoja>
    );
  }

  // Sin escribir, las detectadas; al escribir, lo que contestó el servidor (lo anterior se queda mientras llega lo nuevo).
  const lista: SugerenciaCiudad[] | null =
    t.length < 2 ? detectadas.map((d) => ({ tipo: "existente", slug: d.slug, nombre: d.nombre, estado: "detectada", pildora: true, detalle: consultasEn30(d.consultas) })) : (buscadas?.sugerencias ?? null);
  const nota = ubicando ? `Ubicando ${ubicando}…` : t.length < 2 ? "Escribe el nombre de la ciudad: la buscamos en el mapa." : buscadas?.q === t ? `Nada con «${t}».` : "Buscando…";
  return (
    <Hoja etiqueta="Añadir ciudad" titulo="Añadir ciudad" plano onCerrar={onCerrar}>
      <div className={[ciudadCss.opciones, (enfocado || !!q) && ciudadCss.buscando].filter(Boolean).join(" ")}>
        {campo}
        {!ubicando && lista?.length ? (
          <ul className={`${renglon.tarjeta} ${ciudadCss.lista}`} aria-label="Sugerencias">
            {lista.map((s) => (
              <li key={s.tipo === "existente" ? `${s.slug}:${s.nombre}` : s.clave}>
                <button type="button" className={renglon.ajuste} onClick={() => elegir(s)}>
                  <IconoPin width={20} height={20} />
                  <b>
                    {s.tipo === "existente" ? s.nombre : s.lugar.nombre}
                    {s.tipo === "existente" && s.pildora && (
                      <>
                        {" "}
                        <span className={PILDORA[s.estado]}>{ETIQUETA_ESTADO[s.estado]}</span>
                      </>
                    )}
                  </b>
                  <small>{s.detalle}</small>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={hoja.nota} role="status">
            {nota}
          </p>
        )}
        {!ubicando && t.length >= 2 && buscadas?.q === t && buscadas.sinMapa && <p className={hoja.nota}>El mapa no respondió: salen solo las ciudades que ya están.</p>}
        {aviso}
      </div>
    </Hoja>
  );
}

/** El mapa chico de la ciudad elegida (5:2, como «Dónde» en las fichas): la imagen de Mapbox y, encima, el área y el pin. */
function MapaArea({ alta }: { alta: Alta }) {
  const { ancho, alto, radio } = MAPA_AREA;
  const x = ancho / 2;
  const y = alto / 2;
  return (
    <div className={css.mapa} role="img" aria-label={`Mapa: el centro de ${alta.largo} y ${String(alta.radioKm).replace(".", ",")} km alrededor`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Mapbox, como el mapa de las fichas */}
      {alta.mapa && <img src={alta.mapa} alt="" width={ancho} height={alto} />}
      <svg viewBox={`0 0 ${ancho} ${alto}`} aria-hidden="true">
        <circle className={css.area} cx={x} cy={y} r={radio} />
        <path className={css.pin} d={`M${x} ${y + 4}c-9-12-14-20-14-27a14 14 0 1 1 28 0c0 7-5 15-14 27z`} />
        <circle className={css.punto} cx={x} cy={y - 23} r={5} />
      </svg>
    </div>
  );
}
