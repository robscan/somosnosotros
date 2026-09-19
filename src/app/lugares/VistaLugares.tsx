"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Chip, ChipEnlace, Chips, Cuenta } from "@/components/ui/Chip";
import ListaLugares from "@/components/ListaLugares";
import PantallaConAviso from "@/components/useCanalDeListas";
import type { AvisosLista } from "@/components/useSeguirEnLista";
import { useMemoriaPantalla } from "@/components/MemoriaPantalla";
import Aviso from "@/components/ui/Aviso";
import Mapa from "@/components/Mapa";
import NavInferior from "@/components/NavInferior";
import Publicar from "@/components/Publicar";
import {
  IconoCalendario,
  IconoCerrar,
  IconoLista,
  IconoMapa,
  IconoUbicacion,
} from "@/components/ui/Iconos";
import { CIUDAD_INICIAL, type Ciudad, type CiudadConDatos } from "@/lib/ciudad";
import type { Destacado, Tarjeta } from "@/lib/destacados";
import { SIN_FOTO } from "@/lib/imagen";
import ChipCiudad from "@/components/Ciudad";
import { calleCorta, etiquetaTipo, filtrarLugares, textoProximo, tiposPresentes, UMBRAL_BUSCAR_LUGARES, UMBRAL_CHIPS_LUGARES, type LugarLista } from "@/lib/lugares";
import renglon from "@/components/Renglon.module.css";
import { Pestana, Pestanas } from "@/components/ui/Pestanas";
import { CampoBuscar } from "@/components/ui/Buscador";
import sug from "@/components/ui/Sugerencia.module.css";
import styles from "./lugares.module.css";

type Vista = "mapa" | "lista";
/** Cuántos resultados de la búsqueda se listan sobre el mapa (el resto se ve en los pines o en la Lista). */
const MAX_RESULTADOS_MAPA = 6;
type Punto = { lat: number; lng: number };
type EstadoGeo = "sin-pedir" | "pidiendo" | "negado" | "error";
type Props = {
  lugares: LugarLista[];
  ciudad: Ciudad;
  ciudades: CiudadConDatos[];
  conSesion: boolean;
  vistaInicial: Vista;
  /** Tipo elegido, leído de la URL (`?tipo=`); vale para el mapa y la lista. */
  tipo: string | null;
  barra: ReactNode;
  /** Los lugares que la persona sigue (la lista los marca y deja seguir al deslizar); null = sin sesión. */
  seguidos: string[] | null;
  avisos: AvisosLista | null;
  /** La tira de destacados de la ciudad (docs/rediseno/20): arriba de la lista y, en naranja, en el mapa. */
  destacados: Destacado[];
  eventosSemana: Tarjeta[];
};

/**
 * Lugares: Mapa · Lista como dos vistas del mismo directorio; el mapa es la primera.
 * La ubicación se pide con un botón y no se guarda: sirve al punto azul del mapa y al orden de la lista.
 * Decisiones en docs/rediseno/06-lugares-flujo-y-estados.md.
 */
export default function VistaLugares({
  lugares,
  ciudad,
  ciudades,
  conSesion,
  vistaInicial,
  tipo,
  barra,
  seguidos,
  avisos,
  destacados,
  eventosSemana,
}: Props) {
  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [elegido, setElegido] = useState<LugarLista | null>(null);
  const [punto, setPunto] = useState<Punto | null>(null);
  const [vez, setVez] = useState(0);
  const [geo, setGeo] = useState<EstadoGeo>("sin-pedir");
  // El tipo elegido vive en la URL y vale para las dos vistas: cambiar de Mapa a Lista no lo pierde.
  const tipos = lugares.length >= UMBRAL_CHIPS_LUGARES ? tiposPresentes(lugares) : [];
  const enCiudad = ciudad.slug === CIUDAD_INICIAL.slug ? "" : `&ciudad=${ciudad.slug}`;
  const hrefTipo = (t: string | null) => `/lugares?vista=${vista}${enCiudad}${t ? `&tipo=${t}` : ""}`;
  // El chip de ciudad va primero en las dos vistas; cambiar de ciudad conserva la vista y suelta el tipo.
  const chipCiudad = <ChipCiudad ciudad={ciudad} ciudades={ciudades} hrefDe={(c) => `/lugares?vista=${vista}${c.slug === CIUDAD_INICIAL.slug ? "" : `&ciudad=${c.slug}`}`} />;
  const lugaresDelTipo = useMemo(() => (tipo ? lugares.filter((l) => l.tipo === tipo) : lugares), [lugares, tipo]);
  // Una sola búsqueda para las dos vistas. En el mapa, lo encontrado se encuadra; si es uno solo, se abre su tarjeta.
  const [busqueda, setBusqueda] = useState("");
  // Al volver de una ficha, la misma vista, lo escrito y el scroll de la lista (el tipo ya viene en la URL; la tira
  // de letras no selecciona nada que recordar: es un acceso directo, no un filtro, corrección del founder, 2026-09-19).
  useMemoriaPantalla<{ vista: Vista; busqueda: string }>("lugares", { vista, busqueda }, (r) => {
    if (r.vista === "mapa" || r.vista === "lista") setVista(r.vista);
    if (typeof r.busqueda === "string") setBusqueda(r.busqueda);
  });
  const enMapa = useMemo(() => filtrarLugares(lugaresDelTipo, busqueda), [lugaresDelTipo, busqueda]);
  const enTira = useMemo(() => destacados.map((d) => d.id), [destacados]);
  const [encuadre, setEncuadre] = useState<{ puntos: Punto[]; vez: number } | null>(null);
  // Lo encontrado se lista bajo el buscador mientras se escribe; al tocar uno se abre su tarjeta y la lista se cierra.
  const [listaAbierta, setListaAbierta] = useState(false);
  const resultados = listaAbierta && busqueda.trim() ? enMapa.slice(0, MAX_RESULTADOS_MAPA) : [];
  function buscarEnMapa(v: string) {
    setBusqueda(v);
    setListaAbierta(true);
    const hallados = v.trim() ? filtrarLugares(lugaresDelTipo, v) : [];
    setElegido(hallados.length === 1 ? hallados[0] : null); // sin resultado o con varios, la tarjeta se cierra
    if (hallados.length === 0) return;
    setEncuadre((e) => ({ puntos: hallados.map((l) => ({ lat: l.lat, lng: l.lng })), vez: (e?.vez ?? 0) + 1 }));
  }
  function elegirResultado(l: LugarLista) {
    setListaAbierta(false);
    setElegido(l);
    setEncuadre((e) => ({ puntos: [{ lat: l.lat, lng: l.lng }], vez: (e?.vez ?? 0) + 1 }));
  }
  const chipsTipo = tipos.length > 1 && (
    <>
      <ChipEnlace activo={!tipo} href={hrefTipo(null)}>
        Todos
        <Cuenta n={lugares.length} />
      </ChipEnlace>
      {tipos.map((t) => (
        <ChipEnlace key={t.valor} activo={tipo === t.valor} href={hrefTipo(tipo === t.valor ? null : t.valor)}>
          {t.etiqueta}
          <Cuenta n={t.n} />
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

  // El aviso de abajo y la pregunta de avisos son de la pantalla, no de la Lista: al cambiar a Mapa y volver, la lista se
  // vuelve a montar, y con un canal suyo la pregunta empezaría de cero cada vez (OL-057, revisión de gestión de cambios).
  return (
    <PantallaConAviso>
      <main className={`raiz ${vista === "mapa" ? styles.sinRelleno : ""}`}>
        {barra}
        <Pestanas ariaLabel="Cómo ver los lugares" repartidas className={styles.pestanas}>
          <Pestana activa={vista === "mapa"} onClick={() => cambiarVista("mapa")}>
            <IconoMapa width={18} height={18} /> Mapa
          </Pestana>
          <Pestana activa={vista === "lista"} onClick={() => cambiarVista("lista")}>
            <IconoLista width={18} height={18} /> Lista
          </Pestana>
        </Pestanas>

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
              destacados={enTira}
            />
            <div className={styles.sobreMapa}>
              {lugares.length >= UMBRAL_BUSCAR_LUGARES && (
                <CampoBuscar className={styles.buscarMapa} placeholder="Buscar un lugar por nombre" ariaLabel="Buscar un lugar por nombre" valor={busqueda} onCambiar={buscarEnMapa} onFocus={() => setListaAbierta(true)} />
              )}
              {resultados.length > 0 && (
                <ul className={`${sug.lista} ${styles.resultadosMapa}`} role="listbox" aria-label="Lugares encontrados">
                  {resultados.map((l) => (
                    <li key={l.id}>
                      <button type="button" className={`${sug.renglon} ${sug.sinIcono}`} onClick={() => elegirResultado(l)} role="option" aria-selected={elegido?.id === l.id}>
                        <b>{l.nombre}</b>
                        <small>
                          {etiquetaTipo(l.tipo)}
                          {calleCorta(l.direccion) ? ` · ${calleCorta(l.direccion)}` : ""}
                        </small>
                      </button>
                    </li>
                  ))}
                  {enMapa.length > resultados.length && <li className={styles.resultadoMas}>Y {enMapa.length - resultados.length} más en el mapa</li>}
                </ul>
              )}
              <Chips ariaLabel="Ciudad y tipo de lugar">
                {chipCiudad}
                {chipsTipo}
              </Chips>
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
                {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage */}
                <img src={elegido.portada ?? SIN_FOTO} alt="" className={renglon.foto} />
                <span className={renglon.titulo}>{elegido.nombre}</span>
                <span className={`${renglon.meta} ${renglon.metaColumna}`}>
                  {enTira.includes(elegido.id) && <span className={styles.destacado}>Destacado</span>}
                  <span>{elegido.privado ? "Solo tú lo ves" : etiquetaTipo(elegido.tipo)}</span>
                  <span>
                    <IconoCalendario width={15} height={15} />
                    {elegido.proximo ? (
                      <b>{textoProximo(elegido.proximo)}</b>
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
            seguidos={seguidos}
            avisos={avisos}
            destacados={destacados}
            eventosSemana={eventosSemana}
            chips={
              <>
                {chipCiudad}
                <Chip activo={!!punto} onClick={punto ? () => setPunto(null) : pedirUbicacion} disabled={geo === "pidiendo"}>
                  <IconoUbicacion width={16} height={16} />
                  {geo === "pidiendo" ? "Un momento…" : "Cerca de mí"}
                  {punto && <IconoCerrar width={18} height={18} className={styles.quitar} />}
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
    </PantallaConAviso>
  );
}
