"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useTerminar } from "@/components/ui/Atras";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Limpiar from "@/components/ui/Limpiar";
import limpiar from "@/components/ui/Limpiar.module.css";
import CampoImagenUrl from "@/components/CampoImagenUrl";
import { useAbrirConError } from "@/components/ui/abrirConError";
import { Chip } from "@/components/ui/Chip";
import { IconoBoleto, IconoBuscar, IconoMas, IconoPersonas, IconoPin, IconoReloj } from "@/components/ui/Iconos";
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
import { subirFoto, type FalloAlSubir } from "@/lib/subirFoto";
import { leerUbicacion } from "@/lib/ubicacion";
import { cupoDeCartel, leerCartelAccion, pedirMasLecturas, zonaDelPunto, type Cupo, type ResultadoEvento } from "./acciones";
import { CLAVE_BORRADOR, olvidarBorrador, tomarLugarNuevo, vengoDeRegistrarLugar } from "./borrador";
import HojaDondeEs, { type OtroSitio } from "./HojaDondeEs";
import SelectorCuando from "./SelectorCuando";
import TarjetaCartel from "./TarjetaCartel";
import { operacionEvento } from "./operacionEvento";
import { alLlegar, falloAlLeer, falloAlSubir, falloDeCorte, leido, mesDelCupo, type EstadoCartel } from "./estadoCartel";
import { crearGestosFlyer, type CampoFlyer } from "./gestosFlyer";
import { sitioListo, textoDelSitio } from "./direccionEvento";
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
  /** Lecturas de cartel que le quedan este mes (docs/rediseno/23). Null si no hay sesión o no aplica. */
  cupo?: Cupo | null;
  revision?: string;
};

/**
 * Alta de evento con el canon (docs/rediseno/15, decisiones 1 a 3; docs/rediseno/22): arriba la tarjeta del cartel,
 * que al subirlo llena el formulario y es lo único que explica la pantalla; luego el nombre, y debajo los renglones
 * resueltos con el mismo dibujo: Cuándo (hoy · 19:00), Dónde (una sola salida: la lupa abre la hoja "Dónde es"),
 * Quién, Cuánto (gratis) y Más. El botón dice qué falta. Sin frases de ayuda.
 */
export default function FormularioEvento({ accion, lugares, lugarInicial, evento, privado, zonaSitio = ZONA_INICIAL, modo, usuarioId, cartelActivo = false, quienInicial, mios = [], esAdmin = false, volverA = "/eventos/nuevo", cupo = null, revision }: Props) {
  const [revisionInicial] = useState(revision);
  const operacion = useRef<ReturnType<typeof operacionEvento> | null>(null);
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
    direccion: evento?.sitio_direccion ?? "",
    nombreLegacy: !!evento?.sitio_texto && !evento.sitio_direccion && !evento.sitio_reservado,
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
  // Lo que cuenta la tarjeta del cartel: en qué va, qué decir y la foto que se subió. Sin tarjeta, está en reposo.
  const [cartel, setCartel] = useState<EstadoCartel>(null);
  const [cupoActual, setCupoActual] = useState(cupo);
  const [errorCupo, setErrorCupo] = useState(false);
  const [consultandoCupo, setConsultandoCupo] = useState(false);
  const consultaCupo = useRef(0);
  const cupoPropAnterior = useRef(cupo);
  const operandoCartel = useRef(false);
  const periodoCupo = useRef(mesDelCupo());
  const actualizarCupo = useCallback(async () => {
    const consulta = ++consultaCupo.current;
    setConsultandoCupo(true);
    // Una respuesta de otro mes nunca confirma el periodo nuevo.
    const periodo = mesDelCupo();
    try {
      const actual = await cupoDeCartel();
      if (consulta !== consultaCupo.current) return null;
      if (!actual) throw new Error("Cupo no disponible");
      periodoCupo.current = periodo;
      setCupoActual(actual);
      setErrorCupo(false);
      return actual;
    } catch {
      if (consulta === consultaCupo.current) setErrorCupo(true);
      return null;
    } finally {
      if (consulta === consultaCupo.current) setConsultandoCupo(false);
    }
  }, []);
  useEffect(() => {
    if (cupoPropAnterior.current === cupo) return;
    cupoPropAnterior.current = cupo;
    const consulta = ++consultaCupo.current;
    const id = requestAnimationFrame(() => {
      if (consulta !== consultaCupo.current) return;
      setCupoActual(cupo);
      setErrorCupo(false);
      setConsultandoCupo(false);
    });
    return () => cancelAnimationFrame(id);
  }, [cupo]);
  useEffect(() => {
    if (!cartelActivo || !esAlta) return;
    const volver = () => {
      if (document.visibilityState === "visible" && !operandoCartel.current) void actualizarCupo();
    };
    volver();
    window.addEventListener("focus", volver);
    window.addEventListener("pageshow", volver);
    document.addEventListener("visibilitychange", volver);
    const reloj = window.setInterval(() => {
      if (mesDelCupo() !== periodoCupo.current) volver();
    }, 30_000);
    const invalidar = () => { ++consultaCupo.current; };
    return () => {
      invalidar();
      window.removeEventListener("focus", volver);
      window.removeEventListener("pageshow", volver);
      document.removeEventListener("visibilitychange", volver);
      window.clearInterval(reloj);
    };
  }, [actualizarCupo, cartelActivo, esAlta]);
  const [pidiendo, setPidiendo] = useState(false);
  const [errorImagen, setErrorImagen] = useState<string | null>(null);
  const [quien, setQuien] = useState<QuienItem[]>(quienInicial ?? (esAlta && mios.length === 1 ? [{ id: mios[0].id, nombre: mios[0].nombre }] : []));
  const gestos = useRef(crearGestosFlyer(([
    evento?.titulo ? "titulo" : null,
    evento?.inicio ? "cuando" : null,
    evento?.precio !== undefined ? "cuanto" : null,
    evento?.descripcion ? "descripcion" : null,
    evento?.enlace ? "enlace" : null,
    quien.length ? "quien" : null,
    lugarId || otro.sitioTexto || otro.reservado || otro.sitioPunto ? "donde" : null,
    evento?.imagen ? "imagen" : null,
  ] as (CampoFlyer | null)[]).filter((c): c is CampoFlyer => c !== null)));
  const imagenActual = useRef(imagen);
  function ponerImagen(valor: string | null) {
    imagenActual.current = valor;
    setImagen(valor);
  }
  const [abierta, setAbierta] = useState<Abierta>(null);
  const [masAbierto, setMasAbierto] = useState(modo === "editar" && !!(evento?.descripcion || evento?.enlace || evento?.imagen));
  const [hoja, setHoja] = useState(false);
  // "Estoy aquí" en el pin de otro sitio: la persona en el mapa (punto azul) y el pin donde está.
  const [yo, setYo] = useState<(Punto & { vez: number }) | null>(null);
  const [ubicando, setUbicando] = useState(false);
  const [avisoUbicacion, setAvisoUbicacion] = useState<string | null>(null);
  async function estoyAqui(poner: (p: Punto) => void) {
    const version = gestos.current.tocar("donde");
    setUbicando(true);
    setAvisoUbicacion(null);
    try {
      const p = await leerUbicacion(true);
      if (!gestos.current.vigente("donde", version)) return;
      setYo((y) => ({ ...p, vez: (y?.vez ?? 0) + 1 }));
      poner(p);
    } catch (e) {
      if (!gestos.current.vigente("donde", version)) return;
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
      if (b && (b.titulo || b.lugarId || (b.otro && textoDelSitio(b.otro)) || b.quien.length)) {
        (["titulo", "cuando", "cuanto", "descripcion", "enlace", "quien", "donde", "imagen"] as CampoFlyer[]).forEach(c => gestos.current.tocar(c));
        setTitulo(b.titulo);
        setInicio(b.inicio);
        setFin(b.fin);
        setGratis(b.gratis);
        setPrecio(b.precio);
        setDescripcion(b.descripcion);
        setEnlace(b.enlace);
        ponerImagen(b.imagen);
        setModoSitio(lugarInicial ? "lugar" : b.modoSitio);
        setLugarId(lugarInicial ?? b.lugarId);
        if (b.otro) setOtro({ ...b.otro, nombreLegacy: b.otro.nombreLegacy ?? (!b.otro.reservado && !!b.otro.sitioTexto && !b.otro.direccion) });
        if (!quienInicial?.length) setQuien(b.quien);
        if (b.descripcion || b.enlace || b.imagen) setMasAbierto(true);
      }
      // Volviendo de registrar un lugar: ese lugar queda elegido (llega por el borrador, no por la URL).
      if (lugarNuevo) {
        gestos.current.tocar("donde");
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
      const vacio = !titulo && !lugarId && !textoDelSitio(otro) && !quien.length && !descripcion && !imagen;
      if (vacio) localStorage.removeItem(CLAVE_BORRADOR);
      else localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ titulo, inicio, fin, gratis, precio, descripcion, enlace, imagen, modoSitio, lugarId, otro, quien } satisfies Borrador));
    } catch {}
  }, [esAlta, titulo, inicio, fin, gratis, precio, descripcion, enlace, imagen, modoSitio, lugarId, otro, quien]);

  // Atrás o la ✕ preguntan solo si el formulario cambió desde que se abrió (guardia estándar de las altas); al confirmar, el borrador se olvida.
  const formRef = useRef<HTMLFormElement>(null);
  // Los avisos de estos campos viven dentro de "Más": si llega uno con el renglón cerrado, se abre solo.
  useAbrirConError(formRef, setMasAbierto, errores.descripcion, errores.enlace, errores.imagen, errorImagen);
  const hojaSalir = useSalirSinPublicar(formRef, modo !== "editar", olvidarBorrador);

  const lugar = lugares.find((l) => l.id === lugarId);
  const ofrecerCartel = cartelActivo && esAlta;
  const dondeResuelto = modoSitio === "lugar" ? !!lugar : sitioListo(otro);
  const errorDonde = errores.lugar_id ?? errores.sitio_texto ?? errores.sitio_direccion ?? errores.direccion_privada;
  const faltaNombre = titulo.trim().length === 0;
  const listo = !faltaNombre && dondeResuelto;

  const valorDonde = modoSitio === "lugar" ? (lugar?.nombre ?? "") : `${textoDelSitio(otro)} · ${modoSitio === "reservado" ? "reservado" : "otro sitio"}`;
  const zona = zonaSegura(modoSitio === "lugar" ? (lugar?.zona ?? evento?.zona) : clavePunto ? zonaPin : ZONA_INICIAL);
  const inicioIso = localAIso(inicio, zona);
  const valorCuando = inicioIso ? formatearCuando(inicioIso, fin ? localAIso(fin, zona) : null, new Date(), zona) : "Falta";
  const valorCuanto = gratis ? "Gratis" : precio.trim() || "Con costo";
  const valorQuien = quien.length ? unirNombres(quien.map((q) => (q.id && mios.some((m) => m.id === q.id) ? `${q.nombre} · tú` : q.nombre))) : "Sin artista";

  /** Lo que sale de la hoja: un lugar registrado, o un sitio (reservado o no). */
  function elegirLugar(id: string) {
    gestos.current.tocar("donde");
    setModoSitio("lugar");
    setLugarId(id);
    setHoja(false);
    resugerir(sugerida, cuando, setInicio, setFin, zonaSegura(lugares.find((l) => l.id === id)?.zona));
  }
  function cambiarOtro(o: OtroSitio, desdePin = false) {
    const version = gestos.current.tocar("donde");
    setOtro(o);
    setModoSitio(o.reservado ? "reservado" : "otro");
    // Con el pin puesto o movido, Mapbox dice en qué ciudad cae (la agenda de esa ciudad lo mostrará).
    const p = o.reservado ? o.privadoPunto : o.sitioPunto;
    const { mapboxToken } = configPublica();
    if (!desdePin || !p || !mapboxToken) return;
    lugarDesdePunto(p, mapboxToken).then((r) => {
      if (!r || !gestos.current.vigente("donde", version)) return;
      setOtro((actual) => ({ ...actual, ciudad: r.ciudad, ...(o.reservado ? { direccionPrivada: r.direccion } : { direccion: r.direccion }) }));
    }).catch(() => {});
  }

  /**
   * Sube la foto; quien llamó decide si todavía corresponde colocarla como imagen del evento.
   * No lanza nunca y siempre apaga "Subiendo…": si se cae la señal a mitad, el botón de publicar no puede quedarse
   * apagado hasta recargar (revisión de la bitácora 095).
   */
  async function subir(archivo: File): Promise<{ url: string } | { error: string; motivo: FalloAlSubir }> {
    setSubiendo(true);
    setErrorImagen(null);
    try {
      const r = await subirFoto("lugares", usuarioId, "evento", archivo, "imagen");
      return r;
    } catch {
      return { error: "No se pudo subir. Revisa tu conexión y prueba otra vez.", motivo: "subida" };
    } finally {
      setSubiendo(false);
    }
  }
  async function subirImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    const version = gestos.current.tocar("imagen");
    const r = await subir(archivo);
    if (!gestos.current.vigente("imagen", version)) return;
    if (!("error" in r)) ponerImagen(r.url);
    setErrorImagen("error" in r ? r.error : null);
  }

  /**
   * "Pedir más": una sola por cuenta. Solo se da por pedida si el servidor lo confirma; si falla o se cae la señal,
   * la tarjeta se queda donde estaba y lo dice ahí mismo, que es donde la persona está mirando.
   */
  async function pedirMas() {
    if (operandoCartel.current) return;
    operandoCartel.current = true;
    setPidiendo(true);
    try {
      const r = await pedirMasLecturas();
      if (!r.ok) {
        setCartel((a) => ({ ...(a ?? { estado: "sin_cupo" }), estado: "sin_cupo", mensaje: "No pude mandar la petición. Puede ser tu conexión." }));
        return;
      }
      setCartel((a) => ({ estado: "pedida", foto: a?.foto }));
      setCupoActual((a) => a ? { ...a, pedida: true } : a);
    } catch {
      setCartel((a) => ({ ...(a ?? { estado: "sin_cupo" }), estado: "sin_cupo", mensaje: "No pude mandar la petición. Puede ser tu conexión." }));
    } finally {
      setPidiendo(false);
      operandoCartel.current = false;
    }
  }

  /**
   * Cartel → se sube, se lee y los renglones se llenan. La persona revisa y publica.
   * Todo va dentro de un try: si la promesa se rompe (se cae la señal, el servidor tarda de más, la función se
   * agota), la tarjeta no puede quedarse en "Leyendo el cartel…" para siempre (revisión de la bitácora 095).
   */
  async function leerCartel(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo || operandoCartel.current || consultandoCupo || errorCupo || !cupoActual || alLlegar(cupoActual)) return;
    operandoCartel.current = true;
    const versionImagen = gestos.current.tocar("imagen");
    setCartel({ estado: "leyendo" });
    setLeyendo(true);
    try {
      // El selector pudo estar abierto mientras se consumía el cupo en otra pantalla.
      const confirmado = await actualizarCupo();
      if (!confirmado || alLlegar(confirmado)) {
        setCartel({ estado: "fallo", titulo: "No se leyó otro cartel", foto: imagenActual.current ?? undefined, mensaje: imagenActual.current ? "La imagen que tenías se queda." : "Puedes seguir a mano." });
        return;
      }
      const subida = await subir(archivo);
      if ("error" in subida) {
        setCartel(falloAlSubir(imagenActual.current, subida.error, subida.motivo));
        return;
      }
      const url = subida.url;
      setCartel({ estado: "leyendo", foto: url });
      const r = await leerCartelAccion(url);
      // La subida no reemplaza la imagen hasta saber que no fue rechazada por cupo.
      if (r.ok || !("sinCupo" in r)) {
        if (gestos.current.vigente("imagen", versionImagen)) ponerImagen(url);
      }
      const foto = imagenActual.current ?? undefined;
      if (!r.ok) {
        // Se acabó el cupo entre que se abrió la pantalla y ahora: la tarjeta pasa a su única salida.
        setCartel("sinCupo" in r ? { estado: "sin_cupo", foto } : falloAlLeer(foto, r.mensaje));
        return;
      }
      const v = r.valores;
      if (v.titulo && gestos.current.puedeCompletar("titulo")) setTitulo(v.titulo);
      if (gestos.current.puedeCompletar("cuando") && v.inicio) {
        sugerida.current = "";
        setInicio(v.inicio);
        setFin(v.fin);
      }
      if (gestos.current.puedeCompletar("cuanto")) {
        setGratis(v.gratis);
        setPrecio(v.precio);
      }
      if (v.descripcion && gestos.current.puedeCompletar("descripcion")) setDescripcion(v.descripcion);
      if (v.enlace && gestos.current.puedeCompletar("enlace")) setEnlace(v.enlace);
      if (r.quien.length && gestos.current.puedeCompletar("quien")) setQuien(r.quien);
      if (gestos.current.puedeCompletar("donde") && r.lugarId) {
        setModoSitio("lugar");
        setLugarId(r.lugarId);
      } else if (gestos.current.puedeCompletar("donde") && (v.lugar || v.direccion)) {
        setModoSitio("otro");
        setOtro((o) => ({ ...o, sitioTexto: v.lugar.slice(0, LIMITES_EVENTO.sitio), direccion: v.direccion.slice(0, LIMITES_EVENTO.direccion), sitioPunto: null, ciudad: null, pinPendiente: !!v.direccion }));
      }
      const faltan = [!v.titulo && "el nombre", !v.inicio && "la fecha", !r.lugarId && !v.lugar && "dónde"].filter(Boolean) as string[];
      setCartel({ ...leido(url, faltan), foto });
    } catch {
      setCartel(falloDeCorte(null, imagenActual.current));
    } finally {
      // También una lectura fallida puede haber consumido: nunca restar en el cliente.
      await actualizarCupo();
      setLeyendo(false);
      operandoCartel.current = false;
    }
  }

  return (
    <>
      <form
        ref={formRef}
        action={(fd) => {
          if (!dondeResuelto) { setHoja(true); return; }
          operacion.current = operacionEvento(fd, operacion.current);
          fd.set("operacion", operacion.current.id);
          // El borrador se suelta al publicar; si el servidor devuelve un error, lo escrito sigue en pantalla.
          if (esAlta) olvidarBorrador();
          quitarGuardia();
          enviar(fd);
        }}
        noValidate
      >
        {modo === "editar" && <input type="hidden" name="revision" value={revisionInicial ?? ""} />}
        {/* 1. El cartel, antes del formulario: subirlo lo llena todo. Es lo único que explica la pantalla
            (firmado por el founder, 2026-09-17: «el texto de la tarjeta ancha debe hacer ese trabajo»). */}
        {ofrecerCartel && <TarjetaCartel cartel={cartel} cupo={cupoActual} ocupado={subiendo || leyendo || consultandoCupo} errorCupo={errorCupo || !cupoActual} onReintentarCupo={actualizarCupo} pidiendo={pidiendo} onElegir={leerCartel} onPedir={pedirMas} />}

        {/* 2. El nombre, solo con su ✕. */}
        <div className={`${canon.campo} ${canon.sinIcono}`}>
          <input name="titulo" type="text" value={titulo} onChange={(e) => { gestos.current.tocar("titulo"); setTitulo(e.target.value); }} maxLength={LIMITES_EVENTO.titulo} placeholder="Nombre del evento" aria-label="Nombre del evento" aria-invalid={!!errores.titulo} autoComplete="off" autoFocus={esAlta} required />
          <Limpiar visible={!!titulo} />
        </div>
        {subiendo && !cartel && !masAbierto && <p className={canon.estado}>Subiendo…</p>}
        {errores.titulo && (
          <p className={canon.error} role="alert">
            {errores.titulo}
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
                    gestos.current.tocar("cuando");
                    sugerida.current = "";
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
                <SelectorQuien valor={quien} onCambio={(q) => { gestos.current.tocar("quien"); setQuien(q); }} mios={mios} />
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
                  <Chip activo={gratis} onClick={() => { gestos.current.tocar("cuanto"); setGratis(true); }}>
                    Gratis
                  </Chip>
                  <Chip activo={!gratis} onClick={() => { gestos.current.tocar("cuanto"); setGratis(false); }}>
                    Con costo
                  </Chip>
                </div>
                {!gratis && (
                <span className={limpiar.caja}>
                  <input type="text" name="precio" value={precio} onChange={(e) => { gestos.current.tocar("cuanto"); setPrecio(e.target.value); }} maxLength={LIMITES_EVENTO.precio} placeholder="Ej. $150, o $100 estudiantes" aria-label="Precio" className={canon.entrada} autoComplete="off" autoFocus />
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
              <Campo etiqueta="Descripción" name="descripcion" multilinea value={descripcion} onChange={(e) => { gestos.current.tocar("descripcion"); setDescripcion(e.target.value); }} maxLength={LIMITES_EVENTO.descripcion} error={errores.descripcion} />
              <Campo etiqueta="Enlace" name="enlace" value={enlace} onChange={(e) => { gestos.current.tocar("enlace"); setEnlace(e.target.value); }} placeholder="Boletos, más información…" inputMode="url" autoCapitalize="none" autoComplete="off" error={errores.enlace} />
              {imagen && (
                // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
                <img src={imagen} alt="" className={styles.imagen} />
              )}
              <label className={canon.subir}>
                <input type="file" accept="image/*" onChange={subirImagen} disabled={subiendo} />
                {subiendo ? "Subiendo…" : imagen ? "Cambiar la imagen" : "Poner el cartel o una foto"}
              </label>
              {(errorImagen || errores.imagen) && (
                <p className={canon.error} role="alert">
                  {errorImagen ?? errores.imagen}
                </p>
              )}
              {esAdmin && <div onChangeCapture={() => gestos.current.tocar("imagen")}><CampoImagenUrl valor={imagen} onCambio={ponerImagen} /></div>}
            </div>
          </li>
        </ul>

        {/* Todo viaja escondido: la hoja vive fuera del formulario y los renglones cerrados no tienen campos. */}
        <input type="hidden" name="modo_sitio" value={modoSitio} />
        <input type="hidden" name="lugar_id" value={modoSitio === "lugar" ? lugarId : ""} />
        <input type="hidden" name="sitio_texto" value={modoSitio === "lugar" ? "" : otro.sitioTexto} />
        <input type="hidden" name="sitio_direccion" value={modoSitio === "otro" ? otro.direccion ?? "" : ""} />
        <input type="hidden" name="sitio_pin_pendiente" value={modoSitio !== "lugar" && otro.pinPendiente ? "si" : "no"} />
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
            {resultado.conflicto && evento?.id && <> <a href={`/eventos/${evento.id}`} target="_blank" rel="noopener noreferrer">Ver versión actual en otra pestaña</a></>}
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
          onGesto={() => gestos.current.tocar("donde")}
          onEstoyAqui={estoyAqui}
          onCerrar={() => setHoja(false)}
        />
      )}
      {hojaSalir}
    </>
  );
}
