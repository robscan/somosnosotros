"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ordenarLugares, puntoDeCercania, type LugarLista } from "@/lib/lugares";
import { vistaQueEncuadra, type Vista } from "@/lib/mapa";
import { lugaresDelMapa, type SedeMapa } from "@/lib/mapaSedes";
import { medirCliente } from "@/lib/medir";
import { avisoDeUbicacion, leerUbicacionCercana, permisoConcedido, type EstadoGeo } from "@/lib/ubicacion";
import Mapa from "./Mapa";
import TarjetaSede from "./TarjetaSede";
import { useUbicacionFresca } from "./useUbicacionFresca";
import Aviso from "./ui/Aviso";
import { claseBoton } from "./ui/Boton";
import BotonIcono from "./ui/BotonIcono";
import { IconoCerrar, IconoEncuadrar, IconoRuta, IconoUbicacion } from "./ui/Iconos";
import styles from "./CapaMapa.module.css";

type Punto = { lat: number; lng: number };
type Encuadre = { puntos: Punto[]; vez: number; aLaVista?: boolean };

/** Lo que se deja libre a cada lado al encuadrar las sedes (px): la mitad del nombre más ancho de un pin y un poco de aire (lo mismo que `Mapa`). */
const LADO = 72;
/** Lo que se deja libre abajo sin tarjeta (px): lo que ocupará la de un pin con su margen, así elegir uno casi nunca obliga a mover el mapa. */
const RESERVA_TARJETA = 200;
/** Lo más que se acerca el encuadre, el mismo de Lugares: con una sola sede, su calle y las de alrededor. */
const ZOOM_MAX = 15;
/** El aire bajo los botones de arriba que tampoco cuenta como a la vista (px): un pin pegado a ellos se confunde con ellos. */
const AIRE_ARRIBA = 16;

type Props = {
  sedes: SedeMapa[];
  /** El nombre del mapa para el lector de pantalla («Mapa de Foro lunaria», «Mapa de las sedes de…»). */
  etiqueta: string;
  /** La sede elegida (su tarjeta abajo) y cómo cambiarla: la recuerda la ficha (`MapaFicha`), no la capa. */
  elegido: string | null;
  onElegir: (clave: string | null) => void;
  /** Dónde quedó la cámara la última vez que se cerró; null la primera vez. */
  vista: Vista | null;
  alMover: (vista: Vista) => void;
  /** La persona movió el mapa (sale «Encuadrar»); también lo recuerda la ficha. */
  movido: boolean;
  onMovido: (movido: boolean) => void;
  onCerrar: () => void;
};

/**
 * El mapa de una ficha a pantalla completa (OL-350; prototipo firmado, bitácora 379): una versión ligera de Lugares con solo las sedes de la ficha. Es el
 * mismo mapa (`Mapa`: estilo, pines con su día, nombres que ceden y punto azul) sin registrar lugares al sostener el dedo. Encima, en una sola rejilla: la
 * ✕ arriba a la izquierda; «Mi ubicación» (la de Lugares: pide la ubicación con un toque, encuadra a la persona con las sedes más cercanas y deja su
 * punto) y, bajo ella, «Encuadrar» cuando la persona movió el mapa; el aviso de la ubicación, si no se pudo leer; y abajo la tarjeta del pin elegido:
 * `TarjetaSede` (el ángulo abre la ficha del lugar o del sitio, nunca un mapa) y «Cómo llegar». Tocar el mapa fuera de los pines o el mismo pin suelta la
 * tarjeta. Abre ya encuadrada (`vistaQueEncuadra`), o donde se dejó; al cerrarse, `Mapa` quita el mapa de Mapbox (`quitarMapa`).
 * Se pinta al final del body, como las hojas y el visor del cartel: lo de detrás queda inerte y sin desplazarse mientras está abierta.
 */
export default function CapaMapa({ sedes, etiqueta, elegido, onElegir, vista, alMover, movido, onMovido, onCerrar }: Props) {
  const capa = useRef<HTMLDivElement>(null);
  const tarjeta = useRef<HTMLDivElement>(null);
  const lugares = useMemo(() => lugaresDelMapa(sedes), [sedes]);
  const sede = sedes.find((s) => s.clave === elegido) ?? null;
  // La cámara con la que abre: la de la última vez o, la primera, la que encuadra las sedes en lo que dejan libre los controles y la tarjeta. Esta se
  // mide al montar, así que el mapa espera a tenerla (abre ya encuadrado, sin volar desde otro sitio).
  const [inicio, setInicio] = useState<Vista | null>(vista);
  /** Lo que tapan por arriba los botones y por abajo la tarjeta (o su reserva): cada encuadre lo deja libre. */
  const [tapa, setTapa] = useState({ arriba: 0, abajo: RESERVA_TARJETA });
  const [encuadre, setEncuadre] = useState<Encuadre | null>(null);
  const encuadrar = (puntos: Punto[], aLaVista = false) => setEncuadre((e) => ({ puntos, vez: (e?.vez ?? 0) + 1, aLaVista }));

  // «Mi ubicación», como en Lugares: con el permiso ya dado, el punto azul sigue a la ubicación al día; sin él, nada hasta el primer toque.
  const fresca = useUbicacionFresca();
  const [concedido, setConcedido] = useState(false);
  const hayFresca = fresca !== null;
  useEffect(() => {
    void permisoConcedido().then(setConcedido);
  }, [hayFresca]);
  const [pedido, setPedido] = useState<Punto | null>(null);
  const punto = puntoDeCercania(pedido, fresca, concedido);
  const [vez, setVez] = useState(0);
  const [geo, setGeo] = useState<EstadoGeo>("sin-pedir");
  const aviso = avisoDeUbicacion(geo);
  /** La persona con las cinco sedes más cercanas (lo mismo que encuadra Lugares con sus lugares). */
  const conCercanas = (p: Punto) => [p, ...ordenarLugares(lugares, p).lista.slice(0, 5)];
  function centrarEnMi() {
    medirCliente("mapa_ubicacion");
    if (punto) {
      setVez((v) => v + 1);
      encuadrar(conCercanas(punto));
      onMovido(true);
      return;
    }
    setGeo("pidiendo");
    leerUbicacionCercana().then(
      (p) => {
        setPedido(p);
        setVez((v) => v + 1);
        setGeo("sin-pedir");
        encuadrar(conCercanas(p));
        onMovido(true);
      },
      (error: unknown) => setGeo(error === "negado" ? "negado" : "error"),
    );
  }

  /** Tocar un pin lo elige; tocar el elegido lo suelta. */
  function alPin(lugar: LugarLista) {
    if (lugar.id === elegido) return onElegir(null);
    onElegir(lugar.id);
    medirCliente("mapa_pin");
  }

  // Al montar: el encuadre inicial (si no hay uno de la última vez), con lo que tapan los botones de arriba ya medido. Todo se mide sin transformaciones
  // (`offset…`): la capa entra con una escala y la tarjeta desde un poco más abajo.
  useLayoutEffect(() => {
    const caja = capa.current!;
    const cerrar = caja.querySelector<HTMLElement>(`.${styles.cerrar}`)!;
    const arriba = cerrar.offsetTop + cerrar.offsetHeight + AIRE_ARRIBA;
    setTapa((t) => ({ ...t, arriba }));
    if (!inicio) setInicio(vistaQueEncuadra(sedes.map((s) => s.punto), { ancho: caja.offsetWidth, alto: caja.offsetHeight }, { arriba, abajo: RESERVA_TARJETA, izq: LADO, der: LADO }, ZOOM_MAX));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar: después la cámara es de la persona
  }, []);
  // Con una tarjeta a la vista, lo que tapa es la tarjeta; y si el pin elegido quedó debajo de ella o de un borde, el mapa se mueve lo justo para enseñarlo.
  useLayoutEffect(() => {
    const t = tarjeta.current;
    setTapa((antes) => ({ ...antes, abajo: t ? capa.current!.offsetHeight - t.offsetTop : RESERVA_TARJETA }));
    if (sede) encuadrar([sede.punto], true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo cuando cambia el pin elegido
  }, [elegido]);

  // Mientras está abierta: lo de detrás, inerte y quieto; Escape la cierra; al cerrarse, el foco vuelve a lo que la abrió (el mapa de la ficha).
  useEffect(() => {
    const propia = capa.current!;
    const disparador = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const fondo = [...document.body.children].filter((e): e is HTMLElement => e instanceof HTMLElement && e !== propia && !e.inert);
    fondo.forEach((e) => (e.inert = true));
    const raiz = document.documentElement;
    raiz.style.overflow = "hidden";
    propia.querySelector<HTMLElement>(`.${styles.cerrar}`)?.focus({ preventScroll: true });
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("keydown", alTeclear);
      fondo.forEach((e) => (e.inert = false));
      raiz.style.overflow = "";
      if (disparador?.isConnected) disparador.focus({ preventScroll: true });
    };
  }, [onCerrar]);

  // La marca de Mapbox va abajo a la izquierda: sobre la tarjeta si la hay, si no sobre la zona segura.
  const marca = { "--mapa-marca-abajo": sede ? `${tapa.abajo + 8}px` : undefined } as CSSProperties;
  return createPortal(
    <div ref={capa} className={styles.capa} role="dialog" aria-modal="true" aria-label={etiqueta} style={marca}>
      {inicio && (
        <Mapa
          lugares={lugares}
          elegido={elegido}
          onPin={alPin}
          onVacio={() => onElegir(null)}
          onGesto={() => onMovido(true)}
          ubicacion={punto ? { ...punto, vez } : null}
          encuadre={encuadre}
          vista={inicio}
          alMover={alMover}
          tapaArriba={tapa.arriba}
          tapaAbajo={tapa.abajo}
          conAlta={false}
          marcaAbajo
          etiqueta={etiqueta}
        />
      )}
      <BotonIcono tamano="accion" relieve="elevado" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar el mapa">
        <IconoCerrar width={22} height={22} />
      </BotonIcono>
      <BotonIcono tamano="accion" relieve="elevado" className={styles.ubicacion} data-activa={punto ? "" : undefined} data-pidiendo={geo === "pidiendo" ? "" : undefined} onClick={centrarEnMi} aria-label="Mi ubicación">
        <IconoUbicacion width={22} height={22} />
      </BotonIcono>
      <BotonIcono
        tamano="accion"
        relieve="elevado"
        className={`${styles.encuadrar} ${movido ? "" : styles.encuadrarOculto}`}
        onClick={() => {
          encuadrar(sedes.map((s) => s.punto));
          onMovido(false);
        }}
        aria-label={sedes.length > 1 ? "Encuadrar las sedes" : "Encuadrar la sede"}
      >
        <IconoEncuadrar width={22} height={22} />
      </BotonIcono>
      {aviso && <Aviso texto={aviso} onCerrar={() => setGeo("sin-pedir")} className={styles.aviso} />}
      {sede && (
        <div ref={tarjeta} key={sede.clave} className={styles.tarjeta} role="group" aria-label={sede.nombre}>
          <TarjetaSede nombre={sede.nombre} href={sede.href} reservado={sede.reservado} reemplazar>
            {sede.meta && <small>{sede.meta}</small>}
          </TarjetaSede>
          <a href={sede.comoLlegar} className={claseBoton({ variante: "secundario" })} target="_blank" rel="noopener noreferrer" onClick={() => medirCliente("mapa_como_llegar")}>
            <IconoRuta />
            Cómo llegar
          </a>
        </div>
      )}
    </div>,
    document.body,
  );
}
