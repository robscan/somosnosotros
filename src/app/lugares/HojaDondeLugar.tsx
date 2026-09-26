"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Limpiar from "@/components/ui/Limpiar";
import { IconoBuscar, IconoChevronIzquierda, IconoPin, IconoUbicacion } from "@/components/ui/Iconos";
import ListaFlotante from "@/components/ui/ListaFlotante";
import MapaDondeEs from "@/components/MapaDondeEs";
import { altoTeclado, combinarResultados, consultarMapa, lugaresPorTexto, modoDePantalla, puntoValido, recuperarLugar, sugerirLugares, type LugarSugerido } from "@/lib/buscarLugares";
import { CIUDAD_INICIAL } from "@/lib/ciudad";
import { configPublica } from "@/lib/config";
import { buscarConContexto, ciudadDeContexto, descartarSinCalle, necesitaReintentoLugares } from "@/lib/direccionContexto";
import { lugarDesdePunto } from "@/lib/geocodificar";
import type { Punto } from "@/lib/geo";
import { hrefLugar, type LugarResumen } from "@/lib/lugares";
import { ubicacionCercanaFresca } from "@/lib/ubicacion";
import { lugarCercano, textoInicialBusqueda } from "./dondeEstaPantalla";
import sug from "@/components/ui/Sugerencia.module.css";
import styles from "./HojaDondeLugar.module.css";

type Draft = { punto: Punto | null; direccion: string; ciudad: string | null };

type Props = {
  /** Lugares registrados de la ciudad (pines del mapa): aquí NUNCA se eligen (se está creando/corrigiendo un
   *  lugar, no eligiendo uno existente) -solo avisan "ya existe" y llevan a su ficha (founder, OL-211). */
  lugares: LugarResumen[];
  /** El nombre ya escrito en el formulario, para adelantar la primera búsqueda al entrar por "Buscar". */
  nombreForm: string;
  /** Con foco en el campo (se entró por "Buscar"); sin foco, se entró por "Cambiar" (ya hay ubicación). */
  conFoco: boolean;
  punto: Punto | null;
  direccion: string;
  ciudad: string;
  yo: (Punto & { vez: number }) | null;
  ubicando: boolean;
  avisoUbicacion: string | null;
  onEstoyAqui: (poner: (p: Punto) => void) => void;
  onListo: (v: { punto: Punto; direccion: string; ciudad: string | null }) => void;
  onCerrar: () => void;
};

/**
 * "Dónde está" de Agregar/Editar lugar (OL-211), adaptación del canon "¿Dónde es?" del alta de evento (OL-173,
 * docs/rediseno/43; arreglos de OL-179/OL-182/OL-187) — mismo mapa de fondo con los lugares registrados como
 * pines, un solo campo "Nombre o dirección", lista flotante que nunca tapa nada, pin arrastrable con
 * geocodificación inversa, "Estoy aquí" y sin inventar nunca una ubicación. La adaptación (founder, OL-211): aquí
 * se está creando un LUGAR, no eligiendo uno para un evento -así que los lugares ya registrados (sus pines y sus
 * renglones en la lista) solo avisan "ya existe" y llevan a su ficha (`lugarCercano`, regla de los 150 m de
 * `lugares/acciones.ts`; `elegirLugarExistente` de aquí abajo), nunca se adoptan como el propio punto. El nombre
 * vive en el formulario de fuera (no se repite aquí): "Listo" solo confirma dirección, coordenadas y ciudad;
 * "Atrás" no cambia nada, igual que en el canon.
 */
export default function HojaDondeLugar({ lugares, nombreForm, conFoco, punto, direccion, ciudad, yo, ubicando, avisoUbicacion, onEstoyAqui, onListo, onCerrar }: Props) {
  const [draft, setDraft] = useState<Draft>({ punto, direccion, ciudad: ciudad || null });
  const [ajustado, setAjustado] = useState(false);
  // Lugar registrado tocado (su pin, o su renglón en la lista): solo un aviso "ya existe" con su ficha, nunca
  // adopta su punto. Se limpia en cuanto la persona vuelve a mover su propio pin (deja de ser lo último que tocó).
  const [avisoTocado, setAvisoTocado] = useState<LugarResumen | null>(null);
  const [q, setQ] = useState(() => textoInicialBusqueda(nombreForm, !conFoco));
  const [cerradaParaTexto, setCerradaParaTexto] = useState<string | null>(null);
  const [resultadosMapbox, setResultadosMapbox] = useState<LugarSugerido[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const campoRef = useRef<HTMLDivElement>(null);
  const sesion = useRef("");
  const versionPin = useRef(0);
  const versionBusqueda = useRef(0);
  useEffect(() => {
    sesion.current = crypto.randomUUID();
  }, []);

  const posicionTelefono = ubicacionCercanaFresca();
  const contexto = draft.punto ? { ciudad: CIUDAD_INICIAL, centro: draft.punto, origen: "posicion" as const } : ciudadDeContexto({ texto: q, posicion: yo ?? posicionTelefono });

  const listaCerradaActual = cerradaParaTexto === q;

  // Misma búsqueda que "¿Dónde es?" del alta de evento (Mapbox + directorio, buscarConContexto ya construido en
  // OL-100): con menos de 3 letras no se busca.
  useEffect(() => {
    const texto = q.trim();
    if (texto.length < 3) return;
    const { mapboxToken } = configPublica();
    const version = ++versionBusqueda.current;
    const timer = setTimeout(async () => {
      setBuscando(true);
      setErrorBusqueda(null);
      try {
        if (!mapboxToken) throw new Error("Sin servicio de direcciones");
        const opciones = await buscarConContexto(
          texto,
          contexto,
          (t, bbox) => sugerirLugares(t, mapboxToken, contexto.centro, sesion.current, consultarMapa, bbox).then((r) => descartarSinCalle(r, texto)),
          (r) => necesitaReintentoLugares(r.map((o) => o.distanciaM)),
        );
        if (version === versionBusqueda.current) setResultadosMapbox(opciones);
      } catch {
        if (version === versionBusqueda.current) setErrorBusqueda("No pude buscar. Intenta de nuevo o toca el mapa.");
      } finally {
        if (version === versionBusqueda.current) setBuscando(false);
      }
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, contexto.origen, contexto.ciudad.slug]);

  const textoBusqueda = q.trim();
  const conTextoLargo = textoBusqueda.length >= 3;
  const lugaresFiltrados = textoBusqueda ? lugaresPorTexto(lugares, q) : [];
  const combinados = combinarResultados(lugaresFiltrados, conTextoLargo ? resultadosMapbox : []);
  const modo = modoDePantalla(q, false, combinados.length > 0);
  const listaAbierta = (modo === "resultados" || modo === "no-encontrado") && !listaCerradaActual;

  /** Mueve el pin propio: se escriba a mano, venga de un POI o de arrastrar -reverse geocoding para la dirección,
   *  nunca un punto inventado (regla de OL-182, igual aquí). */
  async function moverPin(p: Punto, esArrastre = false) {
    setAjustado(esArrastre);
    setAvisoTocado(null);
    const version = ++versionPin.current;
    setDraft({ punto: p, direccion: "Ubicando…", ciudad: null });
    const { mapboxToken } = configPublica();
    if (!mapboxToken) {
      if (version === versionPin.current) setDraft((a) => (a.punto === p ? { ...a, direccion: "" } : a));
      return;
    }
    try {
      const r = await lugarDesdePunto(p, mapboxToken);
      if (version !== versionPin.current) return;
      setDraft((a) => (a.punto === p ? { punto: p, direccion: r?.direccion ?? "", ciudad: r?.ciudad ?? null } : a));
    } catch {
      if (version === versionPin.current) setDraft((a) => (a.punto === p ? { ...a, direccion: "" } : a));
    }
  }

  async function elegirMapbox(item: LugarSugerido) {
    const { mapboxToken } = configPublica();
    if (!mapboxToken) return;
    setAvisoTocado(null);
    setAjustado(false);
    setBuscando(true);
    try {
      const r = await recuperarLugar(item.mapboxId, mapboxToken, sesion.current, consultarMapa);
      if (!r || !puntoValido(r)) throw new Error("Sin coordenadas");
      setDraft({ punto: { lat: r.lat, lng: r.lng }, direccion: r.direccion || item.direccion, ciudad: r.ciudad });
      setQ("");
    } catch {
      setErrorBusqueda("No pude ubicar esa opción. Busca de nuevo o toca el mapa.");
    } finally {
      setBuscando(false);
    }
  }

  /** Un lugar YA REGISTRADO (su pin, o su renglón en la lista): solo avisa -nunca adopta su punto (founder,
   *  OL-211: "sirven para avisar «ya existe» ... y llevar a su ficha, no para elegirlos"). */
  function elegirLugarExistente(l: LugarResumen) {
    setAvisoTocado(l);
    // Cierra la lista (como cualquier toque de un renglón): sin esto el aviso quedaría tapado detrás de ella,
    // ya que aquí no hay ningún cambio de texto que la cierre sola (no se adopta el punto de este lugar).
    setCerradaParaTexto(q);
  }

  function estoyAquiClick() {
    onEstoyAqui((p) => void moverPin(p));
  }

  function atras() {
    onCerrar();
  }
  function listo() {
    if (!draft.punto) {
      onCerrar();
      return;
    }
    onListo({ punto: draft.punto, direccion: draft.direccion === "Ubicando…" ? "" : draft.direccion, ciudad: draft.ciudad });
    onCerrar();
  }

  const listoHabilitado = !!draft.punto;
  // Aviso "ya existe" (founder, OL-211): el último lugar tocado manda; sin ninguno, el que quede a menos de 150 m
  // del punto que se está fijando -la misma regla que usa `lugares/acciones.ts` para no duplicar.
  const avisoExiste = avisoTocado ?? (draft.punto ? lugarCercano(lugares, draft.punto) : null);

  const [bottomBarra, setBottomBarra] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    function medir() {
      setBottomBarra(altoTeclado(window.innerHeight, vv ? { height: vv.height, offsetTop: vv.offsetTop } : null));
    }
    medir();
    if (!vv) return;
    vv.addEventListener("resize", medir);
    vv.addEventListener("scroll", medir);
    return () => {
      vv.removeEventListener("resize", medir);
      vv.removeEventListener("scroll", medir);
    };
  }, []);
  const estoyAquiBottomPx = bottomBarra + 16;
  const estoyAquiBottom = estoyAquiBottomPx > 16 ? `min(${estoyAquiBottomPx}px, calc(100% - 64px))` : `${estoyAquiBottomPx}px`;

  return (
    <div className={styles.capa} role="dialog" aria-label="Dónde está">
      <div className={styles.cabecera}>
        <button type="button" className={styles.atras} onClick={atras}>
          <IconoChevronIzquierda width={18} height={18} />
          Atrás
        </button>
        <h2>Dónde está</h2>
        <button type="button" className={styles.listo} onClick={listo} disabled={!listoHabilitado}>
          Listo
        </button>
      </div>
      <div className={styles.cuerpo}>
        <div className={styles.campo} ref={campoRef}>
          <IconoBuscar width={20} height={20} />
          <input
            type="text"
            value={q}
            onChange={(e) => {
              // Una nueva búsqueda deja atrás el aviso de un renglón tocado antes (no el de la proximidad del
              // propio pin, que se recalcula solo con `draft.punto`).
              setAvisoTocado(null);
              setQ(e.target.value);
            }}
            placeholder="Nombre o dirección"
            aria-label="Buscar el lugar"
            autoComplete="off"
            autoFocus={conFoco}
            role="combobox"
            aria-expanded={listaAbierta}
            aria-controls="lista-donde-esta"
            aria-autocomplete="list"
          />
          <Limpiar visible={!!q} />
        </div>
        <div className={styles.mapaLleno}>
          <MapaDondeEs
            lugares={lugares}
            seleccion={draft.punto}
            centrarEn={contexto.centro}
            ciudad={contexto.ciudad}
            yo={yo}
            onLugar={(id) => {
              const l = lugares.find((x) => x.id === id);
              if (l) elegirLugarExistente(l);
            }}
            onPoi={(_nombre, p) => void moverPin(p)}
            onPunto={(p) => void moverPin(p)}
            onArrastre={(p) => void moverPin(p, true)}
          />
          <button type="button" className={styles.estoyAqui} style={{ bottom: estoyAquiBottom }} onClick={estoyAquiClick} disabled={ubicando} aria-label="Estoy aquí" title="Estoy aquí">
            <IconoUbicacion width={22} height={22} />
          </button>
          {modo === "inicial" && avisoUbicacion && <p className={styles.avisoUbicacion}>{avisoUbicacion}</p>}
          {/* El aviso "ya existe" vive en el mismo cuadro flotante que el resumen del pin -pero se muestra AUNQUE
              todavía no haya un punto propio puesto (tocar un pin o un renglón registrado, antes de fijar el
              propio, también debe avisar: founder, OL-211, "sirven para avisar «ya existe» ... y llevar a su
              ficha"). Basta con que la lista esté cerrada (no "modo inicial": tocar un renglón sin borrar lo
              escrito no cambia de modo, y el aviso no debe quedar oculto detrás de un texto que ya no importa). */}
          {!listaAbierta && (draft.punto || avisoExiste) && (
            <div className={styles.resumen}>
              {draft.punto && (
                <>
                  <IconoPin width={18} height={18} />
                  <span className={styles.resumenDireccion}>{draft.direccion || "Ubicando…"}</span>
                  {ajustado && <span className={styles.notaAjuste}>Moviste el pin. Revisa que la dirección corresponda.</span>}
                </>
              )}
              {avisoExiste && (
                <span className={styles.notaAjuste}>
                  «{avisoExiste.nombre}» ya existe cerca de aquí. <Link href={hrefLugar(avisoExiste)}>Ver ficha</Link>
                </span>
              )}
            </div>
          )}
          <ListaFlotante abierta={listaAbierta} onCerrar={() => setCerradaParaTexto(q)} ancla={campoRef} id="lista-donde-esta" etiqueta="Lugares y direcciones">
            {modo === "resultados" &&
              combinados.map((r) =>
                r.tipo === "lugar" ? (
                  <li key={`l-${r.lugar.id}`}>
                    <button type="button" role="option" aria-selected={false} className={sug.renglon} onClick={() => elegirLugarExistente(r.lugar)}>
                      <IconoPin width={20} height={20} />
                      <b>
                        {r.lugar.nombre}
                        <span className={styles.marcaExiste}>Ya existe</span>
                      </b>
                      <small>{r.lugar.direccion}</small>
                    </button>
                  </li>
                ) : (
                  <li key={`m-${r.item.mapboxId}`}>
                    <button type="button" role="option" aria-selected={false} className={sug.renglon} onClick={() => void elegirMapbox(r.item)}>
                      <IconoPin width={20} height={20} />
                      <b>{r.item.esDireccion ? q.trim() : r.item.nombre}</b>
                      <small>{[r.item.direccion, r.item.ciudad].filter(Boolean).join(" · ")}</small>
                    </button>
                  </li>
                ),
              )}
            {modo === "no-encontrado" && (
              <li className={styles.avisoNoEncontrado} role="status">
                <b>«{q.trim()}» no está registrado.</b>
                Toca el mapa para ubicarlo.
              </li>
            )}
            {conTextoLargo && modo === "resultados" && buscando && (
              <li className={styles.avisoFlotante} role="status">
                Buscando…
              </li>
            )}
            {conTextoLargo && modo === "resultados" && errorBusqueda && (
              <li className={styles.avisoFlotante} role="alert">
                {errorBusqueda}
              </li>
            )}
          </ListaFlotante>
        </div>
      </div>
    </div>
  );
}
