"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTerminar } from "@/components/ui/Atras";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Limpiar from "@/components/ui/Limpiar";
import limpiar from "@/components/ui/Limpiar.module.css";
import CampoImagenUrl from "@/components/CampoImagenUrl";
import { Chip } from "@/components/ui/Chip";
import { IconoBoleto, IconoBuscar, IconoCamara, IconoMas, IconoPersonas, IconoPin, IconoReloj } from "@/components/ui/Iconos";
import type { ArtistaResumen, QuienItem } from "@/lib/artistas";
import { unirNombres } from "@/lib/artistas";
import { LIMITES_EVENTO, REVELAR_OPCIONES, type Evento, type ModoSitio, type SitioPrivado } from "@/lib/eventos";
import { formatearCuando, isoALocal, localAIso, resugerirCuando, sugerirInicio, ZONA_INICIAL, zonaSegura } from "@/lib/fechas";
import type { Punto } from "@/lib/geo";
import type { LugarResumen } from "@/lib/lugares";
import { configPublica } from "@/lib/config";
import { lugarDesdePunto } from "@/lib/geocodificar";
import { quitarGuardia } from "@/lib/guardiaSalida";
import { useSalirSinPublicar } from "@/components/SalirSinPublicar";
import { subirFoto } from "@/lib/subirFoto";
import { leerUbicacion } from "@/lib/ubicacion";
import { leerCartelAccion, zonaDelPunto, type ResultadoEvento } from "./acciones";
import { CLAVE_BORRADOR, olvidarBorrador, tomarLugarNuevo, vengoDeRegistrarLugar } from "./borrador";
import HojaDondeEs, { type OtroSitio } from "./HojaDondeEs";
import SelectorCuando from "./SelectorCuando";
import SelectorQuien from "./SelectorQuien";
import canon from "@/components/ui/FormularioCanon.module.css";
import styles from "./FormularioEvento.module.css";

type Abierta = "cuando" | "quien" | "cuanto" | null;

/** Lo que se guarda del alta en el teléfono (ver borrador.ts: solo vuelve al regresar de registrar un lugar). */
type Borrador = {
  titulo: string;
  inicio: string;
  fin: string;
  gratis: boolean;
  precio: string;
  descripcion: string;
  enlace: string;
  imagen: string | null;
  modoSitio: ModoSitio;
  lugarId: string;
  otro: OtroSitio;
  quien: QuienItem[];
};
function leerBorrador(): Borrador | null {
  try {
    const raw = localStorage.getItem(CLAVE_BORRADOR);
    return raw ? (JSON.parse(raw) as Borrador) : null;
  } catch {
    return null;
  }
}
type Cambio = (cambio: (actual: string) => string) => void;
/**
 * Si la hora sigue siendo la sugerida (nadie la tocó), la vuelve a sugerir en la zona nueva y mueve el fin con la misma
 * duración (resugerirCuando). `cuando` es lo último que se pintó; cada cambio comprueba que no cambió entretanto.
 */
function resugerir(sugerida: { current: string }, cuando: { current: { inicio: string; fin: string } }, setInicio: Cambio, setFin: Cambio, zona: string) {
  const antes = cuando.current;
  const nuevo = resugerirCuando(antes, sugerida.current, zona);
  if (!nuevo) return;
  sugerida.current = nuevo.inicio;
  setInicio((actual) => (actual === antes.inicio ? nuevo.inicio : actual));
  setFin((actual) => (actual === antes.fin ? nuevo.fin : actual));
}

type Props = {
  accion: (previo: ResultadoEvento | null, formData: FormData) => Promise<ResultadoEvento>;
  lugares: LugarResumen[];
  lugarInicial?: string;
  evento?: Partial<Evento>;
  privado?: SitioPrivado | null;
  /** En otro sitio, la zona de su punto tal como la calcula el servidor al guardar (lib/zona). */
  zonaSitio?: string;
  modo: "alta" | "editar" | "duplicar";
  usuarioId: string;
  cartelActivo?: boolean;
  /** Quién se presenta, ya resuelto: al editar o duplicar, o al venir de la ficha de un artista. */
  quienInicial?: QuienItem[];
  /** Artistas ligados a mi cuenta: si es uno solo, Quién ya viene resuelto con él (decisión 12). */
  mios?: ArtistaResumen[];
  /** El administrador puede pegar la dirección de una imagen (eventos importados). */
  esAdmin?: boolean;
  /** Adónde vuelve "Registrar un lugar nuevo" con el lugar elegido. */
  volverA?: string;
};

/**
 * Alta de evento con el canon (docs/rediseno/15, decisiones 1 a 3): un campo arriba, el nombre, con la cámara dentro
 * (leer el cartel llena todo); debajo, renglones resueltos con el mismo dibujo: Cuándo (hoy · 19:00), Dónde (una sola
 * salida: la lupa abre la hoja "Dónde es"), Quién, Cuánto (gratis) y Más. El botón dice qué falta. Sin frases de ayuda.
 */
export default function FormularioEvento({ accion, lugares, lugarInicial, evento, privado, zonaSitio = ZONA_INICIAL, modo, usuarioId, cartelActivo = false, quienInicial, mios = [], esAdmin = false, volverA = "/eventos/nuevo" }: Props) {
  const [resultado, enviar, enviando] = useActionState<ResultadoEvento | null, FormData>(accion, null);
  const errores = resultado && !resultado.ok ? resultado.errores : {};
  const esAlta = modo === "alta";
  // Guardado (al editar): la tarea termina sin quedarse en el historial; mientras vuelve, el botón sigue ocupado.
  const terminar = useTerminar();
  const terminado = resultado?.ok === true;
  useEffect(() => {
    if (resultado?.ok) terminar(resultado.volver);
  }, [resultado, terminar]);

  const modoInicial: ModoSitio = evento?.sitio_reservado ? "reservado" : evento?.sitio_texto ? "otro" : "lugar";
  const [modoSitio, setModoSitio] = useState<ModoSitio>(modoInicial);
  const [lugarId, setLugarId] = useState(evento?.lugar_id ?? lugarInicial ?? (lugares.length === 1 ? lugares[0].id : ""));
  const [otro, setOtro] = useState<OtroSitio>(() => ({
    reservado: modoInicial === "reservado",
    sitioTexto: evento?.sitio_texto ?? "",
    sitioPunto: evento?.sitio_lat != null && evento?.sitio_lng != null ? { lat: evento.sitio_lat, lng: evento.sitio_lng } : null,
    direccionPrivada: privado?.direccion ?? "",
    privadoPunto: privado?.lat != null && privado?.lng != null ? { lat: privado.lat, lng: privado.lng } : null,
    revelarHoras: (() => {
      if (evento?.sitio_revelar_desde && evento?.inicio) {
        const h = Math.round((new Date(evento.inicio).getTime() - new Date(evento.sitio_revelar_desde).getTime()) / 3600000);
        return REVELAR_OPCIONES.some((o) => o.horas === h) ? h : 24;
      }
      return 24;
    })(),
    indicaciones: privado?.indicaciones ?? "",
    ciudad: (evento as { ciudad?: string } | undefined)?.ciudad ?? null,
  }));
  const [titulo, setTitulo] = useState(evento?.titulo ?? "");
  // Las horas del selector son las del sitio del evento y se leen en su zona, la misma que usará el servidor al guardar
  // (zonaDelEvento): la del lugar elegido o, en otro sitio, la de su punto.
  const zonaInicial = zonaSegura(modoInicial === "lugar" ? (lugares.find((l) => l.id === (evento?.lugar_id ?? lugarInicial))?.zona ?? evento?.zona) : zonaSitio);
  const [inicio, setInicio] = useState(modo === "editar" ? isoALocal(evento?.inicio, zonaInicial) : sugerirInicio(new Date(), zonaInicial));
  const [fin, setFin] = useState(modo === "editar" ? isoALocal(evento?.fin, zonaInicial) : "");
  // En otro sitio, la zona sale del punto (el público o el reservado) con la misma cuenta del servidor; se pide cada vez
  // que el punto cambia (hoja, borrador). Sin punto, la de la ciudad inicial, como al guardar.
  const puntoActivo = modoSitio === "reservado" ? otro.privadoPunto : modoSitio === "otro" ? otro.sitioPunto : null;
  const clavePunto = puntoActivo ? `${puntoActivo.lat},${puntoActivo.lng}` : "";
  const [zonaPin, setZonaPin] = useState(zonaSitio);
  // Mientras nadie la toque, la hora sugerida sigue a la zona del sitio (resugerir), con el fin detrás.
  const sugerida = useRef(modo === "editar" ? "" : inicio);
  const cuando = useRef({ inicio, fin });
  useEffect(() => {
    cuando.current = { inicio, fin };
  }, [inicio, fin]);
  const claveConZona = useRef(modoInicial === "lugar" ? "" : clavePunto);
  useEffect(() => {
    if (!clavePunto || clavePunto === claveConZona.current) return;
    claveConZona.current = clavePunto;
    const [lat, lng] = clavePunto.split(",").map(Number);
    let vigente = true;
    zonaDelPunto(lat, lng)
      .then((z) => {
        if (!vigente) return;
        setZonaPin(z);
        resugerir(sugerida, cuando, setInicio, setFin, z);
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, [clavePunto]);
  const [gratis, setGratis] = useState(!evento?.precio);
  const [precio, setPrecio] = useState(evento?.precio ?? "");
  const [descripcion, setDescripcion] = useState(evento?.descripcion ?? "");
  const [enlace, setEnlace] = useState(evento?.enlace ?? "");
  const [imagen, setImagen] = useState<string | null>(evento?.imagen ?? null);
  const [subiendo, setSubiendo] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const [avisoCartel, setAvisoCartel] = useState<string | null>(null);
  const [errorImagen, setErrorImagen] = useState<string | null>(null);
  const [quien, setQuien] = useState<QuienItem[]>(quienInicial ?? (esAlta && mios.length === 1 ? [{ id: mios[0].id, nombre: mios[0].nombre }] : []));
  const [abierta, setAbierta] = useState<Abierta>(null);
  const [masAbierto, setMasAbierto] = useState(modo === "editar" && !!(evento?.descripcion || evento?.enlace || evento?.imagen));
  const [hoja, setHoja] = useState(false);
  // "Estoy aquí" en el pin de otro sitio: la persona en el mapa (punto azul) y el pin donde está.
  const [yo, setYo] = useState<(Punto & { vez: number }) | null>(null);
  const [ubicando, setUbicando] = useState(false);
  const [avisoUbicacion, setAvisoUbicacion] = useState<string | null>(null);
  async function estoyAqui(poner: (p: Punto) => void) {
    setUbicando(true);
    setAvisoUbicacion(null);
    try {
      const p = await leerUbicacion(true);
      setYo((y) => ({ ...p, vez: (y?.vez ?? 0) + 1 }));
      poner(p);
    } catch (e) {
      setAvisoUbicacion(e === "sin-soporte" ? "Este teléfono no da su ubicación. Toca el mapa donde es." : "No se pudo leer tu ubicación. Toca el mapa donde es.");
    } finally {
      setUbicando(false);
    }
  }

  // Borrador (solo en el alta): vuelve tras el primer pintado únicamente si se dejó la señal al ir a registrar un lugar;
  // si no, se olvida. Un lugar o artista que viene en la URL (?lugar=, ?artista=) manda sobre el borrador.
  const guardarBorrador = useRef(false);
  useEffect(() => {
    if (!esAlta) return;
    const id = requestAnimationFrame(() => {
      const volviendo = vengoDeRegistrarLugar();
      const b = volviendo ? leerBorrador() : null;
      const lugarNuevo = volviendo ? tomarLugarNuevo() : null;
      if (!volviendo) olvidarBorrador();
      if (b && (b.titulo || b.lugarId || b.otro?.sitioTexto || b.quien.length)) {
        setTitulo(b.titulo);
        setInicio(b.inicio);
        setFin(b.fin);
        setGratis(b.gratis);
        setPrecio(b.precio);
        setDescripcion(b.descripcion);
        setEnlace(b.enlace);
        setImagen(b.imagen);
        setModoSitio(lugarInicial ? "lugar" : b.modoSitio);
        setLugarId(lugarInicial ?? b.lugarId);
        if (b.otro) setOtro(b.otro);
        if (!quienInicial?.length) setQuien(b.quien);
        if (b.descripcion || b.enlace || b.imagen) setMasAbierto(true);
      }
      // Volviendo de registrar un lugar: ese lugar queda elegido (llega por el borrador, no por la URL).
      if (lugarNuevo) {
        setModoSitio("lugar");
        setLugarId(lugarNuevo);
      }
      guardarBorrador.current = true;
    });
    return () => cancelAnimationFrame(id);
  }, [esAlta, lugarInicial, quienInicial]);
  useEffect(() => {
    if (!esAlta || !guardarBorrador.current) return;
    try {
      const vacio = !titulo && !lugarId && !otro.sitioTexto && !quien.length && !descripcion && !imagen;
      if (vacio) localStorage.removeItem(CLAVE_BORRADOR);
      else localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ titulo, inicio, fin, gratis, precio, descripcion, enlace, imagen, modoSitio, lugarId, otro, quien } satisfies Borrador));
    } catch {}
  }, [esAlta, titulo, inicio, fin, gratis, precio, descripcion, enlace, imagen, modoSitio, lugarId, otro, quien]);

  // Atrás o la ✕ preguntan solo si el formulario cambió desde que se abrió (guardia estándar de las altas); al confirmar, el borrador se olvida.
  const formRef = useRef<HTMLFormElement>(null);
  const hojaSalir = useSalirSinPublicar(formRef, modo !== "editar", olvidarBorrador);

  const lugar = lugares.find((l) => l.id === lugarId);
  const ofrecerCartel = cartelActivo && esAlta;
  const dondeResuelto = modoSitio === "lugar" ? !!lugar : !!otro.sitioTexto.trim() && (modoSitio !== "reservado" || !!otro.direccionPrivada.trim());
  const errorDonde = errores.lugar_id ?? errores.sitio_texto ?? errores.direccion_privada;
  const faltaNombre = titulo.trim().length === 0;
  const listo = !faltaNombre && dondeResuelto;

  const valorDonde = modoSitio === "lugar" ? (lugar?.nombre ?? "") : `${otro.sitioTexto.trim()} · ${modoSitio === "reservado" ? "reservado" : "otro sitio"}`;
  const zona = zonaSegura(modoSitio === "lugar" ? (lugar?.zona ?? evento?.zona) : clavePunto ? zonaPin : ZONA_INICIAL);
  const inicioIso = localAIso(inicio, zona);
  const valorCuando = inicioIso ? formatearCuando(inicioIso, fin ? localAIso(fin, zona) : null, new Date(), zona) : "Falta";
  const valorCuanto = gratis ? "Gratis" : precio.trim() || "Con costo";
  const valorQuien = quien.length ? unirNombres(quien.map((q) => (q.id && mios.some((m) => m.id === q.id) ? `${q.nombre} · tú` : q.nombre))) : "Sin artista";

  /** Lo que sale de la hoja: un lugar registrado, o un sitio (reservado o no). */
  function elegirLugar(id: string) {
    setModoSitio("lugar");
    setLugarId(id);
    setHoja(false);
    resugerir(sugerida, cuando, setInicio, setFin, zonaSegura(lugares.find((l) => l.id === id)?.zona));
  }
  function cambiarOtro(o: OtroSitio) {
    setOtro(o);
    setModoSitio(o.reservado ? "reservado" : "otro");
    // Con el pin puesto o movido, Mapbox dice en qué ciudad cae (la agenda de esa ciudad lo mostrará).
    const p = o.reservado ? o.privadoPunto : o.sitioPunto;
    const anterior = otro.reservado ? otro.privadoPunto : otro.sitioPunto;
    const { mapboxToken } = configPublica();
    if (!p || !mapboxToken || (anterior && anterior.lat === p.lat && anterior.lng === p.lng)) return;
    lugarDesdePunto(p, mapboxToken).then((r) => {
      if (r?.ciudad) setOtro((actual) => ({ ...actual, ciudad: r.ciudad }));
    });
  }

  async function subir(archivo: File): Promise<string | null> {
    setSubiendo(true);
    setErrorImagen(null);
    const r = await subirFoto("lugares", usuarioId, "evento", archivo, "imagen");
    setSubiendo(false);
    if ("error" in r) {
      setErrorImagen(r.error);
      return null;
    }
    setImagen(r.url);
    return r.url;
  }
  async function subirImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (archivo) await subir(archivo);
  }

  /** Cartel → se sube, se lee y los renglones se llenan. La persona revisa y publica. */
  async function leerCartel(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const url = await subir(archivo);
    if (!url) return;
    setLeyendo(true);
    setAvisoCartel(null);
    try {
      const r = await leerCartelAccion(url);
      if (!r.ok) {
        setAvisoCartel(r.mensaje);
        return;
      }
      const v = r.valores;
      if (v.titulo) setTitulo(v.titulo);
      if (v.inicio) setInicio(v.inicio);
      setFin(v.fin);
      setGratis(v.gratis);
      setPrecio(v.precio);
      if (v.descripcion) setDescripcion(v.descripcion);
      if (v.enlace) setEnlace(v.enlace);
      if (r.quien.length) setQuien(r.quien);
      if (r.lugarId) {
        setModoSitio("lugar");
        setLugarId(r.lugarId);
      } else if (v.lugar || v.direccion) {
        setModoSitio("otro");
        setOtro((o) => ({ ...o, reservado: false, sitioTexto: [v.lugar, v.direccion].filter(Boolean).join(" · ").slice(0, LIMITES_EVENTO.sitio) }));
      }
      const faltan = [!v.titulo && "el nombre", !v.inicio && "la fecha", !r.lugarId && !v.lugar && "dónde"].filter(Boolean);
      setAvisoCartel(faltan.length ? `Leí el cartel. Revisa ${faltan.join(", ")} y publica.` : "Leí el cartel. Revisa que todo esté bien y publica.");
    } finally {
      setLeyendo(false);
    }
  }

  return (
    <>
      <form
        ref={formRef}
        action={(fd) => {
          // El borrador se suelta al publicar; si el servidor devuelve un error, lo escrito sigue en pantalla.
          if (esAlta) olvidarBorrador();
          quitarGuardia();
          enviar(fd);
        }}
        noValidate
      >
        {/* 1. El nombre, con la cámara dentro: leer el cartel llena todo (decisión 1). */}
        <label className={`${canon.campo} ${canon.sinIcono} ${ofrecerCartel ? canon.conAccion : ""}`}>
          <input name="titulo" type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={LIMITES_EVENTO.titulo} placeholder="Nombre del evento" aria-label="Nombre del evento" aria-invalid={!!errores.titulo} autoComplete="off" autoFocus={esAlta} required />
          <Limpiar visible={!!titulo} desplazada={ofrecerCartel} />
          {ofrecerCartel && (
            <span className={canon.accionCampo} title="Leer el cartel" aria-disabled={subiendo || leyendo}>
              <IconoCamara width={22} height={22} />
              <input type="file" accept="image/*" onChange={leerCartel} disabled={subiendo || leyendo} aria-label="Leer el cartel" />
            </span>
          )}
        </label>
        {(leyendo || (subiendo && !masAbierto)) && <p className={canon.estado}>{leyendo ? "Leyendo el cartel…" : "Subiendo…"}</p>}
        {errores.titulo && (
          <p className={canon.error} role="alert">
            {errores.titulo}
          </p>
        )}
        {avisoCartel && (
          <p className={styles.aviso} role="status">
            {avisoCartel}
          </p>
        )}

        <ul className={canon.renglones}>
          {/* 2. Cuándo: hoy a las 19:00 ya resuelto; al abrir, Empieza y Termina como el calendario del teléfono. */}
          <li className={`${canon.resuelto} ${abierta === "cuando" ? canon.abierta : ""}`}>
            <IconoReloj width={20} height={20} />
            <span className={canon.clave}>Cuándo</span>
            <span className={`${canon.valor} ${inicioIso ? "" : canon.falta}`}>{valorCuando}</span>
            <button type="button" className={canon.cambiar} onClick={() => setAbierta((a) => (a === "cuando" ? null : "cuando"))} aria-expanded={abierta === "cuando"}>
              {abierta === "cuando" ? "Listo" : "Cambiar"}
            </button>
            {abierta === "cuando" && (
              <div className={canon.cuerpo}>
                <SelectorCuando
                  inicio={inicio}
                  fin={fin}
                  zona={zona}
                  onCambio={(i, f) => {
                    setInicio(i);
                    setFin(f);
                  }}
                  errorInicio={errores.inicio}
                  errorFin={errores.fin}
                />
              </div>
            )}
            {abierta !== "cuando" && (errores.inicio || errores.fin) && (
              <p className={canon.cuerpoNota} role="alert">
                {errores.inicio ?? errores.fin}
              </p>
            )}
          </li>

          {/* 3. Dónde: una sola salida, la lupa abre la hoja "Dónde es" (decisión 2). */}
          <li className={`${canon.resuelto} ${dondeResuelto ? "" : canon.pendiente}`}>
            <IconoPin width={20} height={20} />
            <span className={canon.clave}>Dónde</span>
            {dondeResuelto ? (
              <>
                <span className={canon.valor}>{valorDonde}</span>
                <button type="button" className={canon.cambiar} onClick={() => setHoja(true)}>
                  Cambiar
                </button>
              </>
            ) : (
              <>
                <span className={`${canon.valor} ${canon.falta}`}>Falta</span>
                <button type="button" className={canon.accionIcono} onClick={() => setHoja(true)} aria-label="Buscar el lugar" title="Buscar el lugar">
                  <IconoBuscar width={22} height={22} />
                </button>
              </>
            )}
            {errorDonde && (
              <p className={canon.cuerpoNota} role="alert">
                {errorDonde}
              </p>
            )}
          </li>

          {/* 4. Quién: opcional, no detiene la publicación (Artistas, decisión 12). */}
          <li className={`${canon.resuelto} ${abierta === "quien" ? canon.abierta : quien.length ? "" : canon.pendiente}`}>
            <IconoPersonas width={20} height={20} />
            <span className={canon.clave}>Quién</span>
            <span className={`${canon.valor} ${quien.length ? "" : canon.falta}`}>{valorQuien}</span>
            <button type="button" className={canon.cambiar} onClick={() => setAbierta((a) => (a === "quien" ? null : "quien"))} aria-expanded={abierta === "quien"}>
              {abierta === "quien" ? "Listo" : quien.length ? "Cambiar" : "Agregar"}
            </button>
            {abierta === "quien" && (
              <div className={canon.cuerpo}>
                <SelectorQuien valor={quien} onCambio={setQuien} mios={mios} />
              </div>
            )}
          </li>

          {/* 5. Cuánto: gratis ya resuelto; al abrir, Gratis / Con costo y el precio. */}
          <li className={`${canon.resuelto} ${abierta === "cuanto" ? canon.abierta : ""}`}>
            <IconoBoleto width={20} height={20} />
            <span className={canon.clave}>Cuánto</span>
            <span className={canon.valor}>{valorCuanto}</span>
            <button type="button" className={canon.cambiar} onClick={() => setAbierta((a) => (a === "cuanto" ? null : "cuanto"))} aria-expanded={abierta === "cuanto"}>
              {abierta === "cuanto" ? "Listo" : "Cambiar"}
            </button>
            {abierta === "cuanto" && (
              <div className={canon.cuerpo}>
                <div className={canon.chips}>
                  <Chip activo={gratis} onClick={() => setGratis(true)}>
                    Gratis
                  </Chip>
                  <Chip activo={!gratis} onClick={() => setGratis(false)}>
                    Con costo
                  </Chip>
                </div>
                {!gratis && (
                <span className={limpiar.caja}>
                  <input type="text" name="precio" value={precio} onChange={(e) => setPrecio(e.target.value)} maxLength={LIMITES_EVENTO.precio} placeholder="Ej. $150, o $100 estudiantes" aria-label="Precio" className={canon.entrada} autoComplete="off" autoFocus />
                  <Limpiar visible={!!precio} />
                </span>
              )}
                {errores.precio && (
                  <p className={canon.error} role="alert">
                    {errores.precio}
                  </p>
                )}
              </div>
            )}
            {abierta !== "cuanto" && errores.precio && (
              <p className={canon.cuerpoNota} role="alert">
                {errores.precio}
              </p>
            )}
          </li>

          {/* 6. Más: descripción, enlace, cartel o foto. Se esconde, no se desmonta. */}
          <li className={`${canon.resuelto} ${masAbierto ? canon.abierta : canon.pendiente}`}>
            <IconoMas width={20} height={20} />
            <span className={canon.clave}>Más</span>
            <span className={`${canon.valor} ${canon.falta}`}>Descripción, enlace, {imagen ? "imagen" : "foto"}</span>
            <button type="button" className={canon.cambiar} onClick={() => setMasAbierto((a) => !a)} aria-expanded={masAbierto}>
              {masAbierto ? "Listo" : "Agregar"}
            </button>
            <div className={canon.cuerpo} hidden={!masAbierto}>
              <Campo etiqueta="Descripción" name="descripcion" multilinea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={LIMITES_EVENTO.descripcion} error={errores.descripcion} />
              <Campo etiqueta="Enlace" name="enlace" value={enlace} onChange={(e) => setEnlace(e.target.value)} placeholder="Boletos, más información…" inputMode="url" autoCapitalize="none" autoComplete="off" error={errores.enlace} />
              {imagen && (
                // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
                <img src={imagen} alt="" className={styles.imagen} />
              )}
              <label className={canon.subir}>
                <input type="file" accept="image/*" onChange={subirImagen} disabled={subiendo || leyendo} />
                {subiendo ? "Subiendo…" : imagen ? "Cambiar la imagen" : "Poner el cartel o una foto"}
              </label>
              {(errorImagen || errores.imagen) && (
                <p className={canon.error} role="alert">
                  {errorImagen ?? errores.imagen}
                </p>
              )}
              {esAdmin && <CampoImagenUrl valor={imagen} onCambio={setImagen} />}
            </div>
          </li>
        </ul>

        {/* Todo viaja escondido: la hoja vive fuera del formulario y los renglones cerrados no tienen campos. */}
        <input type="hidden" name="modo_sitio" value={modoSitio} />
        <input type="hidden" name="lugar_id" value={modoSitio === "lugar" ? lugarId : ""} />
        <input type="hidden" name="sitio_texto" value={modoSitio === "lugar" ? "" : otro.sitioTexto} />
        <input type="hidden" name="sitio_lat" value={modoSitio === "otro" && otro.sitioPunto ? otro.sitioPunto.lat : ""} />
        <input type="hidden" name="sitio_lng" value={modoSitio === "otro" && otro.sitioPunto ? otro.sitioPunto.lng : ""} />
        <input type="hidden" name="direccion_privada" value={modoSitio === "reservado" ? otro.direccionPrivada : ""} />
        <input type="hidden" name="privado_lat" value={modoSitio === "reservado" && otro.privadoPunto ? otro.privadoPunto.lat : ""} />
        <input type="hidden" name="privado_lng" value={modoSitio === "reservado" && otro.privadoPunto ? otro.privadoPunto.lng : ""} />
        <input type="hidden" name="revelar_horas" value={otro.revelarHoras} />
        <input type="hidden" name="indicaciones" value={modoSitio === "reservado" ? otro.indicaciones : ""} />
        <input type="hidden" name="ciudad" value={modoSitio === "lugar" ? "" : (otro.ciudad ?? "")} />
        {abierta !== "cuando" && (
          <>
            <input type="hidden" name="inicio" value={inicio} />
            <input type="hidden" name="fin" value={fin} />
          </>
        )}
        <input type="hidden" name="quien" value={JSON.stringify(quien)} />
        <input type="hidden" name="gratis" value={gratis ? "si" : "no"} />
        {(gratis || abierta !== "cuanto") && <input type="hidden" name="precio" value={gratis ? "" : precio} />}
        <input type="hidden" name="imagen" value={imagen ?? ""} />

        {resultado && !resultado.ok && resultado.general && (
          <p className="aviso-error" role="alert">
            {resultado.general}
          </p>
        )}
        {/* El botón dice qué falta (decisión 3). */}
        <Boton type="submit" disabled={enviando || terminado || subiendo || leyendo || !listo}>
          {enviando || terminado ? "Guardando…" : modo === "editar" ? "Guardar cambios" : "Publicar evento"}
          {!enviando && !terminado && !listo && <small className={canon.faltaBoton}>{faltaNombre ? "falta el nombre" : "falta dónde"}</small>}
        </Boton>
      </form>
      {hoja && (
        <HojaDondeEs
          lugares={lugares}
          modoSitio={modoSitio}
          lugarId={lugarId}
          otro={otro}
          yo={yo}
          ubicando={ubicando}
          avisoUbicacion={avisoUbicacion}
          volverA={volverA}
          onLugar={elegirLugar}
          onOtro={cambiarOtro}
          onEstoyAqui={estoyAqui}
          onCerrar={() => setHoja(false)}
        />
      )}
      {hojaSalir}
    </>
  );
}
