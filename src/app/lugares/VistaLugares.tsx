"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import ListaLugares from "@/components/ListaLugares";
import Mapa from "@/components/Mapa";
import NavInferior from "@/components/NavInferior";
import Publicar from "@/components/Publicar";
import {
  IconoCalendario,
  IconoLista,
  IconoMapa,
  IconoUbicacion,
} from "@/components/ui/Iconos";
import type { Ciudad } from "@/lib/ciudad";
import { etiquetaTipo, textoProximo, type LugarLista } from "@/lib/lugares";
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
  barra,
}: Props) {
  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [elegido, setElegido] = useState<LugarLista | null>(null);
  const [punto, setPunto] = useState<Punto | null>(null);
  const [vez, setVez] = useState(0);
  const [geo, setGeo] = useState<EstadoGeo>("sin-pedir");

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
            lugares={lugares}
            ciudad={ciudad}
            presentacion="caja"
            onPin={setElegido}
            elegido={elegido?.id ?? null}
            ubicacion={punto ? { ...punto, vez } : null}
          />
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
          {notaGeo && (
            <p className={styles.notaMapa} role="status">
              {notaGeo}
            </p>
          )}
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
                <span
                  className={`${renglon.foto} ${renglon.fotoVacia}`}
                  aria-hidden="true"
                />
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
        <>
          <div className={styles.contexto}>
            <button
              type="button"
              className={`${styles.chip} ${punto ? styles.chipActivo : ""}`}
              onClick={punto ? () => setPunto(null) : pedirUbicacion}
              disabled={geo === "pidiendo"}
              aria-pressed={!!punto}
            >
              <IconoUbicacion width={16} height={16} />
              <span>{geo === "pidiendo" ? "Un momento…" : "Cerca de mí"}</span>
              {punto && (
                <span className={styles.quitar} aria-hidden="true">
                  ✕
                </span>
              )}
            </button>
            {notaGeo && <span className={styles.nota}>{notaGeo}</span>}
          </div>
          <ListaLugares
            lugares={lugares}
            punto={punto}
            ciudad={ciudad}
            conSesion={conSesion}
          />
        </>
      )}

      {!elegido && <Publicar que="lugar" />}
      <NavInferior />
    </main>
  );
}
