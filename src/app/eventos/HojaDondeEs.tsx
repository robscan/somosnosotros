"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Mapa from "@/components/Mapa";
import Boton from "@/components/ui/Boton";
import ContadorCaracteres from "@/components/ui/ContadorCaracteres";
import Hoja from "@/components/ui/Hoja";
import Limpiar from "@/components/ui/Limpiar";
import limpiar from "@/components/ui/Limpiar.module.css";
import { IconoBuscar, IconoMas, IconoPin, IconoUbicacion } from "@/components/ui/Iconos";
import ListaFlotante from "@/components/ui/ListaFlotante";
import { LIMITES_EVENTO, REVELAR_OPCIONES, type ModoSitio } from "@/lib/eventos";
import type { Punto } from "@/lib/geo";
import { SIN_FOTO } from "@/lib/imagen";
import { etiquetaLugar, type LugarResumen } from "@/lib/lugares";
import { CIUDAD_INICIAL, type Ciudad } from "@/lib/ciudad";
import { configPublica } from "@/lib/config";
import { buscarDirecciones, type Sugerencia } from "@/lib/geocodificar";
import { sugerirLugares, recuperarLugar, type LugarSugerido } from "@/lib/buscarLugares";
import { ubicacionCercanaFresca, leerUbicacionCercana } from "@/lib/ubicacion";
import { buscarConContexto, ciudadDeContexto, descartarSinCalle, filtrarYOrdenarDirecciones, necesitaReintento, necesitaReintentoLugares, redondearParaMapbox } from "./direccionContexto";
import { cambiarReserva, consultarMapa, lugaresPorTexto, ponerPinManual, puntoValido, revisarNombreLegacy, sitioListo, textoDelSitio } from "./direccionEvento";
import { avisarQueVuelvo } from "./borrador";
import canon from "@/components/ui/FormularioCanon.module.css";
import mapa from "@/components/Mapa.module.css";
import sug from "@/components/ui/Sugerencia.module.css";
import styles from "./HojaDondeEs.module.css";

/** Lo que resuelve Dónde cuando no es un lugar registrado: el sitio, su pin y, si es reservado, la dirección exacta. */
export type OtroSitio = {
  reservado: boolean;
  sitioTexto: string;
  /** Direccion publica estructurada, nunca parte del alias persistido. */
  direccion?: string;
  nombreLegacy?: boolean;
  referenciaLegacy?: string;
  pinPendiente?: boolean;
  sitioPunto: Punto | null;
  direccionPrivada: string;
  privadoPunto: Punto | null;
  revelarHoras: number;
  indicaciones: string;
  /** La ciudad del pin, deducida por Mapbox al ponerlo (null hasta entonces). */
  ciudad: string | null;
};

type Props = {
  lugares: LugarResumen[];
  modoSitio: ModoSitio;
  lugarId: string;
  otro: OtroSitio;
  /** La persona en el mapa (punto azul), si ya se ubicó. */
  yo: (Punto & { vez: number }) | null;
  ubicando: boolean;
  avisoUbicacion: string | null;
  /** Adónde vuelve "Registrar un lugar nuevo" con el lugar elegido. */
  volverA: string;
  onLugar: (id: string) => void;
  onOtro: (o: OtroSitio, desdePin?: boolean) => void;
  onGesto: () => void;
  onEstoyAqui: (poner: (p: Punto) => void) => void;
  onCerrar: () => void;
  /**
   * Ciudad del chip de la Agenda desde la que se entró a publicar (OL-100, punto 6 de docs/rediseno/26): una pista
   * más de la cascada de contexto, por debajo del propio texto y del lugar leído del cartel. Null si no llega
   * ninguna (hoy `/eventos/nuevo` no la recibe todavía).
   */
  ciudadContexto?: Ciudad | null;
};

/**
 * Hoja "Dónde es" del alta de evento (docs/rediseno/15, decisión 2): un solo camino para resolver Dónde. Arriba el
 * campo con la lupa y los lugares registrados (foto, tipo, calle) que se filtran al escribir; debajo, "Es en otro
 * sitio" (nombre, pin y el interruptor de reservado con la dirección exacta) y "Registrar un lugar nuevo".
 *
 * La búsqueda de direcciones y lugares (OL-100, docs/rediseno/26) acota a una "ciudad de contexto" en cascada: el
 * propio texto (si dice "S.L.P.", "SLP"…), el chip de la Agenda, o la posición aproximada del teléfono (cacheada, o
 * pedida con un toque aquí mismo — regla de ubicación firmada por el founder, 2026-09-21); San Luis Potosí de
 * respaldo. Si la primera búsqueda no trae nada cerca de esa ciudad, una segunda automática con el texto limpio y
 * la ciudad pegada (caso con nombre: "Galeana #423, S.L.P." → "Galeana 423, San Luis Potosí"), una sola vez.
 */
export default function HojaDondeEs({ lugares, modoSitio, lugarId, otro, yo, ubicando, avisoUbicacion, volverA, onLugar, onOtro, onGesto, onEstoyAqui, onCerrar, ciudadContexto = null }: Props) {
  const [q, setQ] = useState("");
  const [vista, setVista] = useState<"lista" | "otro">(modoSitio !== "lugar" && (textoDelSitio(otro) || otro.reservado) ? "otro" : "lista");
  const [consulta, setConsulta] = useState<{ texto: string; tipo: "direccion" | "lugar" } | null>(() => {
    const texto = otro.reservado ? otro.direccionPrivada : otro.direccion;
    return modoSitio !== "lugar" && texto && !(otro.reservado ? otro.privadoPunto : otro.sitioPunto) ? { texto, tipo: "direccion" } : null;
  });
  const [direcciones, setDirecciones] = useState<Sugerencia[]>([]);
  const [sugeridos, setSugeridos] = useState<LugarSugerido[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const version = useRef(0);
  const sesion = useRef("");
  useEffect(() => {
    sesion.current = crypto.randomUUID();
    const invalidar = () => { ++version.current; };
    return invalidar;
  }, []);
  const punto = otro.reservado ? otro.privadoPunto : otro.sitioPunto;
  // Posición aproximada del teléfono: la que ya quedó cacheada de otra pantalla, o la que se pida aquí con el botón.
  const [posicionPedida, setPosicionPedida] = useState<Punto | null>(null);
  const [pidiendoUbicacionCerca, setPidiendoUbicacionCerca] = useState(false);
  const posicionTelefono = posicionPedida ?? ubicacionCercanaFresca();
  // Ciudad de contexto en cascada (OL-100, founder 2026-09-21): el punto ya elegido manda; si no hay, el texto de la
  // búsqueda, la ciudad del chip o la posición del teléfono, y San Luis Potosí de respaldo. La posición del teléfono
  // va redondeada a 3 decimales antes de entrar a la cascada: es lo único de esto que sale hacia Mapbox como pista
  // de ubicación (regla de DEFINICION, "aproximada"); el pin que la persona confirma a mano (`punto`) no se toca,
  // es el dato del evento.
  const contexto = useMemo(() => {
    if (punto) return { ciudad: CIUDAD_INICIAL, centro: punto, origen: "posicion" as const };
    const posicion = yo ?? posicionTelefono;
    return ciudadDeContexto({ texto: consulta?.texto, ciudadChip: ciudadContexto, posicion: posicion ? redondearParaMapbox(posicion) : null });
  }, [punto, consulta?.texto, ciudadContexto, yo, posicionTelefono]);
  const cerca = contexto.centro;
  // Sin ninguna pista real (ni texto, ni chip, ni posición): se ofrece pedirla con un toque, nunca automático.
  const sinPistaDeCiudad = !punto && !yo && !posicionTelefono && contexto.origen === "inicial";
  async function usarMiUbicacionCerca() {
    setPidiendoUbicacionCerca(true);
    try {
      setPosicionPedida(await leerUbicacionCercana());
    } catch {
      // Silencioso, como "Estoy aquí": sin ella, la búsqueda sigue con el centro de la ciudad de respaldo.
    } finally {
      setPidiendoUbicacionCerca(false);
    }
  }
  useEffect(() => {
    if (!consulta || consulta.texto.trim().length < 3) return;
    const { mapboxToken } = configPublica();
    const revision = version.current;
    let vigente = true;
    const timer = setTimeout(async () => {
      setBuscando(true);
      try {
        if (!mapboxToken) throw new Error("Sin servicio de direcciones");
        if (consulta.tipo === "direccion") {
          const opciones = await buscarConContexto(
            consulta.texto,
            contexto,
            (texto, bbox) => buscarDirecciones(texto, mapboxToken, cerca, consultarMapa, bbox).then((r) => filtrarYOrdenarDirecciones(r.filter(puntoValido), consulta.texto, cerca)),
            (r) => necesitaReintento(r, cerca),
          );
          if (vigente && revision === version.current) {
            setDirecciones(opciones);
            if (!opciones.length) setError("No encontré esa dirección. Prueba con calle, número y ciudad, o toca el mapa.");
          }
        } else {
          const opciones = await buscarConContexto(
            consulta.texto,
            contexto,
            (texto, bbox) => sugerirLugares(texto, mapboxToken, cerca, sesion.current, consultarMapa, bbox).then((r) => descartarSinCalle(r, consulta.texto)),
            (r) => necesitaReintentoLugares(r.map((o) => o.distanciaM)),
          );
          if (vigente && revision === version.current) setSugeridos(opciones);
        }
      } catch {
        if (vigente && revision === version.current) setError("No pude buscar la dirección. Intenta de nuevo o toca el mapa.");
      } finally {
        if (vigente && revision === version.current) setBuscando(false);
      }
    }, 350);
    return () => { vigente = false; clearTimeout(timer); };
  }, [consulta, cerca, contexto]);
  function invalidar() {
    const revision = ++version.current;
    onGesto();
    setConsulta(null);
    setDirecciones([]);
    setSugeridos([]);
    setBuscando(false);
    setError(null);
    return revision;
  }
  function cambiar(parte: Partial<OtroSitio>, desdePin = false) {
    invalidar();
    onOtro({ ...otro, ...parte }, desdePin);
  }
  function escribirDireccion(texto: string) {
    cambiar({ ...revisarNombreLegacy(otro), pinPendiente: !!texto.trim(), ...(otro.reservado ? { direccionPrivada: texto, privadoPunto: null, ciudad: null } : { direccion: texto, sitioPunto: null, ciudad: null }) });
    setConsulta({ texto, tipo: "direccion" });
  }
  function elegirDireccion(s: Sugerencia) {
    if (!puntoValido(s)) return;
    const p = { lat: s.lat, lng: s.lng };
    cambiar({ ...revisarNombreLegacy(otro), pinPendiente: false, ...(otro.reservado ? { direccionPrivada: s.direccion, privadoPunto: p, ciudad: s.ciudad } : { direccion: s.direccion, sitioPunto: p, ciudad: s.ciudad }) });
  }
  async function elegirSugerido(s: LugarSugerido) {
    const revision = invalidar();
    const { mapboxToken } = configPublica();
    if (!mapboxToken) return;
    setBuscando(true);
    try {
      const r = await recuperarLugar(s.mapboxId, mapboxToken, sesion.current, consultarMapa);
      if (revision !== version.current) return;
      if (!r || !puntoValido(r)) throw new Error("Sin coordenadas");
      const p = { lat: r.lat, lng: r.lng };
      const revisado = revisarNombreLegacy(otro);
      onOtro({ ...revisado, pinPendiente: false, sitioTexto: otro.reservado || s.esDireccion ? revisado.sitioTexto : s.nombre, ciudad: r.ciudad,
        ...(otro.reservado ? { direccionPrivada: r.direccion || s.direccion, privadoPunto: p } : { direccion: r.direccion || s.direccion, sitioPunto: p }) });
      setVista("otro");
    } catch {
      if (revision === version.current) setError("No pude ubicar esa opción. Busca de nuevo o toca el mapa.");
    } finally {
      if (revision === version.current) setBuscando(false);
    }
  }
  const cerrar = () => { invalidar(); onCerrar(); };
  const filtrados = lugaresPorTexto(lugares, q);
  const otroListo = sitioListo(otro);
  // Las dos búsquedas remotas (direcciones y lugares) flotan sobre el layout, ancladas a su campo: nunca empujan el
  // mapa ni los campos de abajo (founder, producción, 2026-09-21). ui/ListaFlotante hace el trabajo; aquí solo el
  // contenido: "Buscando…", el error, o las opciones.
  const campoDireccionRef = useRef<HTMLElement>(null);
  const campoListaRef = useRef<HTMLElement>(null);
  const panelDireccion = !!consulta && consulta.tipo === "direccion";
  const panelLista = !!consulta && consulta.tipo === "lugar";
  const contenidoDirecciones = buscando ? (
    <li className={styles.avisoFlotante} role="status">Buscando…</li>
  ) : error ? (
    <li className={styles.avisoFlotante} role="alert">{error}</li>
  ) : (
    direcciones.map((s) => (
      <li key={`${s.lat},${s.lng}`}>
        <button type="button" className={sug.renglon} role="option" aria-selected={false} onClick={() => elegirDireccion(s)}>
          <IconoPin width={20} height={20} />
          <b>{s.nombre || s.direccion}</b>
          <small>{[s.nombre ? s.direccion : null, s.ciudad].filter(Boolean).join(" · ")}</small>
        </button>
      </li>
    ))
  );

  if (vista === "otro") {
    const ponerPunto = (p: Punto) => cambiar(ponerPinManual(otro, p), true);
    return (
      <Hoja etiqueta="Es en otro sitio" onCerrar={cerrar}>
        <h3>Es en otro sitio</h3>
        <div className={styles.otro}>
          <label className={`${canon.campo} ${canon.sinIcono}`}>
            <input type="text" value={otro.sitioTexto} onChange={(e) => cambiar({ sitioTexto: e.target.value, nombreLegacy: false })} maxLength={LIMITES_EVENTO.sitio} placeholder={otro.reservado ? "Cómo se anuncia, ej. Casa en Tequis" : "Nombre del sitio, ej. Plaza de Armas"} aria-label={otro.reservado ? "Cómo se anuncia" : "Nombre del sitio"} autoComplete="off" autoFocus />
            <Limpiar visible={!!otro.sitioTexto} />
            <ContadorCaracteres valor={otro.sitioTexto} tope={LIMITES_EVENTO.sitio} />
          </label>
          {/* La ayuda de qué falta va bajo el campo, no dentro del botón (founder, 2026-09-21: canon para todos los formularios). */}
          {/* Nunca canon.cuerpoNota aquí: lleva grid-area: cuerpo, y .otro es una rejilla sin esa área — el
              navegador crea una columna implícita para ubicarlo y toda la hoja se rompe (founder, producción,
              2026-09-21). Clase llana, como el resto de los avisos de esta hoja. */}
          {!otro.sitioTexto.trim() && <p className={styles.nota}>Falta el nombre del sitio.</p>}
          {otro.referenciaLegacy && !otro.sitioTexto.trim() && <p className={styles.nota}>Nombre público por confirmar. Texto anterior: {otro.referenciaLegacy}</p>}
          {!otro.reservado && (
            <label className={canon.campo} ref={campoDireccionRef as React.RefObject<HTMLLabelElement>}>
              <IconoBuscar width={20} height={20} />
              <input
                type="text"
                value={otro.direccion ?? ""}
                onChange={(e) => escribirDireccion(e.target.value)}
                maxLength={LIMITES_EVENTO.direccion}
                placeholder="Calle y número, o colonia"
                aria-label="Buscar la dirección"
                autoComplete="off"
                role="combobox"
                aria-expanded={panelDireccion}
                aria-controls="lista-direcciones"
                aria-autocomplete="list"
              />
              <Limpiar visible={!!otro.direccion} />
              <ContadorCaracteres valor={otro.direccion} tope={LIMITES_EVENTO.direccion} />
            </label>
          )}
          <div className={styles.mapa}>
            <Mapa modo="elegir" valor={punto} onCambio={ponerPunto} ubicacion={yo} />
            <button type="button" className={`${mapa.ubicame} ${styles.ubicame}`} onClick={() => { invalidar(); onEstoyAqui(ponerPunto); }} disabled={ubicando} aria-label="Estoy aquí" title="Estoy aquí">
              <IconoUbicacion width={22} height={22} />
            </button>
          </div>
          {avisoUbicacion && <p className={styles.nota}>{avisoUbicacion}</p>}
          {otro.sitioTexto.trim() && otro.pinPendiente && <p className={styles.nota}>Falta confirmar el pin.</p>}
          <div className={styles.reservado}>
            <b>Reservado</b>
            <small>{otro.reservado ? "La dirección exacta solo la ven quienes van, cuando toque" : "La dirección solo la ven quienes van"}</small>
            <button type="button" role="switch" aria-checked={otro.reservado} aria-label="Sitio reservado" className={canon.palanca} onClick={() => cambiar(cambiarReserva(otro))} />
          </div>
          {otro.reservado && (
            <>
              <span className={limpiar.caja} ref={campoDireccionRef as React.RefObject<HTMLSpanElement>}>
                <input
                  type="text"
                  value={otro.direccionPrivada}
                  onChange={(e) => escribirDireccion(e.target.value)}
                  maxLength={LIMITES_EVENTO.direccion}
                  placeholder="Dirección exacta: calle y número, colonia"
                  aria-label="Dirección exacta"
                  className={canon.entrada}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={panelDireccion}
                  aria-controls="lista-direcciones"
                  aria-autocomplete="list"
                />
                <Limpiar visible={!!otro.direccionPrivada} />
                <ContadorCaracteres valor={otro.direccionPrivada} tope={LIMITES_EVENTO.direccion} />
              </span>
              {otro.sitioTexto.trim() && !otro.pinPendiente && !otro.direccionPrivada.trim() && <p className={styles.nota}>Falta la dirección exacta.</p>}
              <select value={otro.revelarHoras} onChange={(e) => cambiar({ revelarHoras: Number(e.target.value) })} aria-label="Cuándo se revela" className={styles.select}>
                {REVELAR_OPCIONES.map((o) => (
                  <option key={o.horas} value={o.horas}>
                    Se revela {o.etiqueta}
                  </option>
                ))}
              </select>
              <span className={limpiar.caja}>
                <input type="text" value={otro.indicaciones} onChange={(e) => cambiar({ indicaciones: e.target.value })} maxLength={LIMITES_EVENTO.indicaciones} placeholder="Indicaciones, ej. portón verde (opcional)" aria-label="Indicaciones" className={canon.entrada} autoComplete="off" />
                <Limpiar visible={!!otro.indicaciones} />
                <ContadorCaracteres valor={otro.indicaciones} tope={LIMITES_EVENTO.indicaciones} />
              </span>
            </>
          )}
          {otro.pinPendiente && punto && puntoValido(punto) && (
            <div>
              <p className={styles.nota}>Moviste el pin. Revisa que la dirección corresponda.</p>
              <button type="button" className={styles.volver} onClick={() => cambiar({ pinPendiente: false })}>
                Usar esta dirección con el pin
              </button>
            </div>
          )}
          <button type="button" className={styles.volver} onClick={() => { invalidar(); setVista("lista"); }}>
            Mejor un lugar registrado
          </button>
        </div>
        <ListaFlotante abierta={panelDireccion} onCerrar={invalidar} ancla={campoDireccionRef} id="lista-direcciones" etiqueta="Direcciones encontradas">
          {contenidoDirecciones}
        </ListaFlotante>
        <Boton type="button" onClick={cerrar} disabled={!otroListo}>
          Listo
        </Boton>
      </Hoja>
    );
  }

  return (
    <Hoja etiqueta="Dónde es" onCerrar={cerrar}>
      <h3>Dónde es</h3>
      <label className={`${canon.campo} ${styles.pegajoso}`} ref={campoListaRef as React.RefObject<HTMLLabelElement>}>
        <IconoBuscar width={20} height={20} />
        <input
          type="text"
          value={q}
          onChange={(e) => { invalidar(); setQ(e.target.value); setConsulta({ texto: e.target.value, tipo: "lugar" }); }}
          placeholder="Nombre o dirección"
          aria-label="Buscar el lugar"
          autoComplete="off"
          autoFocus
          role="combobox"
          aria-expanded={panelLista}
          aria-controls="lista-sugeridos"
          aria-autocomplete="list"
        />
        <Limpiar visible={!!q} />
      </label>
      {/* Sin ninguna pista de en qué ciudad buscar: se pide con un toque, nunca automático (founder, 2026-09-21). */}
      {sinPistaDeCiudad && q.trim().length >= 3 && (
        <button type="button" className={styles.usarUbicacion} onClick={usarMiUbicacionCerca} disabled={pidiendoUbicacionCerca}>
          <IconoUbicacion width={20} height={20} />
          <span>{pidiendoUbicacionCerca ? "Ubicando…" : "Usar mi ubicación para buscar cerca"}</span>
        </button>
      )}
      {filtrados.length > 0 ? (
        <ul className={`${sug.lista} ${styles.lista}`} role="listbox" aria-label="Lugares registrados">
          {filtrados.map((l) => (
            <li key={l.id}>
              <button type="button" role="option" aria-selected={l.id === lugarId} className={`${sug.renglon} ${sug.conFoto}`} onClick={() => { invalidar(); onLugar(l.id); }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage */}
                <img src={l.portada ?? SIN_FOTO} alt="" className={sug.foto} />
                <b>{l.nombre}</b>
                <small>{[etiquetaLugar(l), l.direccion].filter(Boolean).join(" · ")}</small>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.nadie}>{lugares.length ? `Ningún lugar registrado coincide con «${q.trim()}».` : "Todavía no hay lugares registrados."}</p>
      )}
      <ListaFlotante abierta={panelLista} onCerrar={invalidar} ancla={campoListaRef} id="lista-sugeridos" etiqueta="Lugares y direcciones encontrados">
        {buscando ? (
          <li className={styles.avisoFlotante} role="status">Buscando…</li>
        ) : error ? (
          <li className={styles.avisoFlotante} role="alert">{error}</li>
        ) : (
          sugeridos.map((s) => (
            <li key={s.mapboxId}>
              <button type="button" role="option" aria-selected={false} className={sug.renglon} onClick={() => elegirSugerido(s)}>
                <IconoPin width={20} height={20} />
                <b>{s.nombre}</b>
                <small>{[s.direccion, s.ciudad].filter(Boolean).join(" · ")}</small>
              </button>
            </li>
          ))
        )}
      </ListaFlotante>
      <ul className={`${sug.lista} ${styles.lista}`}>
        <li>
          <button type="button" className={sug.renglon} onClick={() => { invalidar(); setVista("otro"); }}>
            <IconoPin width={20} height={20} />
            <b>Es en otro sitio</b>
            <small>Una plaza, un parque, una casa: lo escribes y pones el pin</small>
          </button>
        </li>
        <li>
          <Link href={`/lugares/nuevo?siguiente=${encodeURIComponent(volverA)}`} className={sug.renglon} onClick={avisarQueVuelvo}>
            <IconoMas width={20} height={20} />
            <b>Registrar un lugar nuevo</b>
            <small>Vuelves aquí con él elegido</small>
          </Link>
        </li>
      </ul>
    </Hoja>
  );
}
