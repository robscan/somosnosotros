"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Chip, ChipEnlace, Chips } from "@/components/ui/Chip";
import ListaLugares from "@/components/ListaLugares";
import Aviso from "@/components/ui/Aviso";
import Mapa from "@/components/Mapa";
import NavInferior from "@/components/NavInferior";
import Publicar from "@/components/Publicar";
import {
  IconoCalendario,
  IconoLista,
  IconoMapa,
  IconoPin,
  IconoUbicacion,
} from "@/components/ui/Iconos";
import type { Ciudad } from "@/lib/ciudad";
import { etiquetaTipo, filtrarLugares, textoProximo, tiposPresentes, UMBRAL_BUSCAR_LUGARES, UMBRAL_CHIPS_LUGARES, type LugarLista } from "@/lib/lugares";
import renglon from "@/components/Renglon.module.css";
import styles from "./lugares.module.css";

type Vista = "mapa" | "lista";
type Punto = { lat: number; lng: number };
type EstadoGeo = "sin-pedir" | "pidiendo" | "negado" | "error";
type Props = {
  lugares: LugarLista[];
  ciudad: Ciudad;
  conSesion: boolean;
  vistaInicial: Vista;
  /** Tipo elegido, leído de la URL (`?tipo=`); vale para el mapa y la lista. */
  tipo: string | null;
  barra: ReactNode;
};

/**
 * Lugares: Mapa · Lista como dos vistas del mismo directorio; el mapa es la primera.
 * La ubicación se pide con un botón y no se guarda: sirve al punto azul del mapa y al orden de la lista.
 * Decisiones en docs/rediseno/06-lugares-flujo-y-estados.md.
 */
export default function VistaLugares({
  lugares,
  ciudad,
  conSesion,
  vistaInicial,
  tipo,
  barra,
}: Props) {
  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [elegido, setElegido] = useState<LugarLista | null>(null);
  const [punto, setPunto] = useState<Punto | null>(null);
  const [vez, setVez] = useState(0);
  const [geo, setGeo] = useState<EstadoGeo>("sin-pedir");
  // El tipo elegido vive en la URL y vale para las dos vistas: cambiar de Mapa a Lista no lo pierde.
  const tipos = lugares.length >= UMBRAL_CHIPS_LUGARES ? tiposPresentes(lugares) : [];
  const hrefTipo = (t: string | null) => `/lugares?vista=${vista}${t ? `&tipo=${t}` : ""}`;
  const lugaresDelTipo = useMemo(() => (tipo ? lugares.filter((l) => l.tipo === tipo) : lugares), [lugares, tipo]);
  // Una sola búsqueda para las dos vistas. En el mapa, lo encontrado se encuadra; si es uno solo, se abre su tarjeta.
  const [busqueda, setBusqueda] = useState("");
  const enMapa = useMemo(() => filtrarLugares(lugaresDelTipo, busqueda), [lugaresDelTipo, busqueda]);
  const [encuadre, setEncuadre] = useState<{ puntos: Punto[]; vez: number } | null>(null);
  function buscarEnMapa(v: string) {
    setBusqueda(v);
    const hallados = v.trim() ? filtrarLugares(lugaresDelTipo, v) : [];
    setElegido(hallados.length === 1 ? hallados[0] : null); // sin resultado o con varios, la tarjeta se cierra
    if (hallados.length === 0) return;
    setEncuadre((e) => ({ puntos: hallados.map((l) => ({ lat: l.lat, lng: l.lng })), vez: (e?.vez ?? 0) + 1 }));
  }
  const chipsTipo = tipos.length > 1 && (
    <>
      <ChipEnlace activo={!tipo} href={hrefTipo(null)}>
        Todos
      </ChipEnlace>
      {tipos.map((t) => (
        <ChipEnlace key={t.valor} activo={tipo === t.valor} href={hrefTipo(tipo === t.valor ? null : t.valor)}>
          {t.etiqueta}
        </ChipEnlace>
      ))}
    </>
  );

  function pedirUbicacion() {
    if (!("geolocation" in navigator)) {
      setGeo("error");
      return;
    }
    setGeo("pidiendo");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPunto({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setVez((v) => v + 1);
        setGeo("sin-pedir");
      },
      (err) => setGeo(err.code === err.PERMISSION_DENIED ? "negado" : "error"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }
  function cambiarVista(v: Vista) {
    setVista(v);
    setElegido(null);
  }
  const notaGeo =
    geo === "negado"
      ? "No pudimos leer tu ubicación. Actívala para este sitio en los ajustes del teléfono."
      : geo === "error"
        ? "No pudimos leer tu ubicación."
        : null;

  return (
    <main className={`raiz ${vista === "mapa" ? styles.sinRelleno : ""}`}>
      {barra}
      <div
        className={styles.pestanas}
        role="tablist"
        aria-label="Cómo ver los lugares"
      >
        <button
          type="button"
          role="tab"
          className={styles.pestana}
          aria-selected={vista === "mapa"}
          onClick={() => cambiarVista("mapa")}
        >
          <IconoMapa width={18} height={18} /> Mapa
        </button>
        <button
          type="button"
          role="tab"
          className={styles.pestana}
          aria-selected={vista === "lista"}
          onClick={() => cambiarVista("lista")}
        >
          <IconoLista width={18} height={18} /> Lista
        </button>
      </div>

      {vista === "mapa" ? (
        <div className={styles.cajaMapa}>
          <Mapa
            lugares={enMapa}
            encuadre={encuadre}
            ciudad={ciudad}
            presentacion="caja"
            onPin={setElegido}
            elegido={elegido?.id ?? null}
            ubicacion={punto ? { ...punto, vez } : null}
          />
          <div className={styles.sobreMapa}>
            {lugares.length >= UMBRAL_BUSCAR_LUGARES && (
              <input type="search" className={styles.buscarMapa} placeholder="Buscar un lugar por nombre" aria-label="Buscar un lugar por nombre" value={busqueda} onChange={(e) => buscarEnMapa(e.target.value)} autoCapitalize="none" autoCorrect="off" />
            )}
            {chipsTipo && <Chips ariaLabel="Tipo de lugar">{chipsTipo}</Chips>}
            {busqueda.trim() && enMapa.length === 0 && <p className={styles.nadaMapa}>Ningún lugar se llama así. Si existe, regístralo.</p>}
          </div>
          {!elegido && (
            <button
              type="button"
              className={`${styles.ubicame} ${punto ? styles.ubicameActivo : ""}`}
              onClick={punto ? () => setVez((v) => v + 1) : pedirUbicacion}
              disabled={geo === "pidiendo"}
              aria-pressed={!!punto}
              aria-label={
                punto ? "Centrar en mi ubicación" : "Mostrar mi ubicación"
              }
            >
              <IconoUbicacion width={22} height={22} />
            </button>
          )}
          {notaGeo && <Aviso texto={notaGeo} onCerrar={() => setGeo("sin-pedir")} className={styles.avisoMapa} />}
          {elegido && (
            <Link
              href={`/lugares/${elegido.id}`}
              className={styles.tarjeta}
              aria-label={`Ver ${elegido.nombre}`}
            >
              {elegido.portada ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
                <img src={elegido.portada} alt="" className={renglon.foto} />
              ) : (
                <span className={`${renglon.foto} ${renglon.fotoVacia}`} aria-hidden="true">
                  <IconoPin width={24} height={24} />
                </span>
              )}
              <span className={renglon.titulo}>{elegido.nombre}</span>
              <span className={`${renglon.meta} ${renglon.metaColumna}`}>
                <span>{etiquetaTipo(elegido.tipo)}</span>
                <span>
                  <IconoCalendario width={15} height={15} />
                  {elegido.proximo ? (
                    <b>{textoProximo(elegido.proximo.inicio)}</b>
                  ) : (
                    "Sin eventos próximos"
                  )}
                </span>
              </span>
              <span className={styles.ver}>Ver</span>
            </Link>
          )}
        </div>
      ) : (
        <ListaLugares
          lugares={lugaresDelTipo}
          tipo={tipo}
          total={lugares.length}
          busqueda={busqueda}
          onBusqueda={setBusqueda}
          punto={punto}
          ciudad={ciudad}
          conSesion={conSesion}
          chips={
            <>
              <Chip activo={!!punto} onClick={punto ? () => setPunto(null) : pedirUbicacion} disabled={geo === "pidiendo"}>
                <IconoUbicacion width={16} height={16} />
                {geo === "pidiendo" ? "Un momento…" : "Cerca de mí"}
                {punto && (
                  <span className={styles.quitar} aria-hidden="true">
                    ✕
                  </span>
                )}
              </Chip>
              {chipsTipo}
            </>
          }
          aviso={notaGeo && <Aviso texto={notaGeo} onCerrar={() => setGeo("sin-pedir")} className={styles.avisoLista} />}
        />
      )}

      {!elegido && <Publicar que="lugar" />}
      <NavInferior />
    </main>
  );
}
