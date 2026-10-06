"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTerminar } from "@/components/ui/Atras";
import HojaDonde from "@/components/HojaDonde";
import Boton from "@/components/ui/Boton";
import BotonIcono from "@/components/ui/BotonIcono";
import BotonPublicar from "@/components/ui/BotonPublicar";
import Campo from "@/components/ui/Campo";
import Limpiar from "@/components/ui/Limpiar";
import limpiar from "@/components/ui/Limpiar.module.css";
import CampoImagenUrl from "@/components/CampoImagenUrl";
import { useAbrirConError } from "@/components/ui/abrirConError";
import ContadorCaracteres from "@/components/ui/ContadorCaracteres";
import { Chip } from "@/components/ui/Chip";
import { IconoBoleto, IconoBuscar, IconoMas, IconoPersonas, IconoPin, IconoReloj, IconoUbicacion } from "@/components/ui/Iconos";
import type { ArtistaResumen, QuienItem } from "@/lib/artistas";
import { unirNombres } from "@/lib/artistas";
import { COOPERACION_SOLIDARIA, LIMITES_EVENTO, REVELAR_OPCIONES, esCooperacion, extraerNumero, type Evento, type ModoSitio, type OtroSitio, type SitioPrivado } from "@/lib/eventos";
import { formatearCuando, isoALocal, localAIso, ZONA_INICIAL, zonaSegura } from "@/lib/fechas";
import { faltaEnEvento } from "@/lib/formulario";
import type { LugarResumen } from "@/lib/lugares";
import type { Ciudad } from "@/lib/ciudad";
import { configPublica } from "@/lib/config";
import { lugarDesdePunto } from "@/lib/geocodificar";
import { apartarGuardia, reponerGuardia } from "@/lib/guardiaSalida";
import { subirFoto, type FalloAlSubir } from "@/lib/subirFoto";
import { zonaDelPunto, type ResultadoEvento } from "./acciones";
import SelectorCuando from "./SelectorCuando";
import { operacionEvento } from "./operacionEvento";
import { crearGestosFlyer } from "./gestosFlyer";
import { sitioListo, valorDelSitio } from "./direccionEvento";
import CamposSitio from "./CamposSitio";
import { useEstoyAqui } from "./useEstoyAqui";
import { puedeConservarReservadoSinDireccion, sitioReservadoVencido } from "@/lib/retencionSitio";
import SelectorQuien from "./SelectorQuien";
import canon from "@/components/ui/FormularioCanon.module.css";
import renglon from "@/components/ui/Renglon.module.css";
import styles from "./FormularioEvento.module.css";

type Abierta = "cuando" | "quien" | "cuanto" | null;

type Props = {
  accion: (previo: ResultadoEvento | null, formData: FormData) => Promise<ResultadoEvento>;
  lugares: LugarResumen[];
  evento: Partial<Evento>;
  privado?: SitioPrivado | null;
  /** En otro sitio, la zona de su punto tal como la calcula el servidor al guardar (lib/zona). */
  zonaSitio?: string;
  usuarioId: string;
  /** Quién se presenta, ya resuelto. */
  quienInicial?: QuienItem[];
  /** Artistas ligados a mi cuenta: Quién los marca «tú». */
  mios?: ArtistaResumen[];
  /** El administrador puede pegar la dirección de una imagen (eventos importados). */
  esAdmin?: boolean;
  /** A dónde dice volver la acción que crea un lugar desde la hoja «¿Dónde es?» (solo para que nunca redirija: no se sale de la pantalla). */
  volverA?: string;
  revision?: string;
  /** Ciudad desde la que se entró: una pista más para la búsqueda de dirección (OL-100). */
  ciudadContexto?: Ciudad | null;
};

/**
 * Editar un evento con el canon (docs/rediseno/15, decisiones 1 a 3; docs/rediseno/22): el nombre y, debajo, los renglones resueltos con
 * el mismo dibujo: Cuándo, Dónde (una sola salida: la lupa abre la hoja "Dónde es"), Quién, Cuánto y Más (descripción, enlace y el cartel o
 * una foto). La ayuda de qué falta va bajo el campo o renglón, no dentro del botón (decisión 3 ampliada por el founder, 2026-09-21, OL-100:
 * "aplica como canon para todos los formularios"). Desde OL-312 solo edita: publicar y duplicar son del alta por pasos (`/nuevo/evento`).
 */
export default function FormularioEvento({ accion, lugares, evento, privado, zonaSitio = ZONA_INICIAL, usuarioId, quienInicial, mios = [], esAdmin = false, volverA = "/nuevo/evento", revision, ciudadContexto = null }: Props) {
  const [revisionInicial] = useState(revision);
  const operacion = useRef<ReturnType<typeof operacionEvento> | null>(null);
  const [resultado, enviar, enviando] = useActionState<ResultadoEvento | null, FormData>(accion, null);
  const errores = resultado && !resultado.ok ? resultado.errores : {};
  // Guardado (al editar): la tarea termina sin quedarse en el historial; mientras vuelve, el botón sigue ocupado.
  const terminar = useTerminar();
  const terminado = resultado?.ok === true;
  useEffect(() => {
    if (resultado?.ok) terminar(resultado.volver);
  }, [resultado, terminar]);
  // Si el servidor no publicó, lo escrito sigue en pantalla: la guardia que apartó «Publicar» vuelve (OL-296).
  useEffect(() => {
    if (resultado && !resultado.ok) reponerGuardia();
  }, [resultado]);

  const modoInicial: ModoSitio = evento.sitio_reservado ? "reservado" : evento.sitio_texto ? "otro" : "lugar";
  const [modoSitio, setModoSitio] = useState<ModoSitio>(modoInicial);
  const [lugarId, setLugarId] = useState(evento.lugar_id ?? (lugares.length === 1 ? lugares[0].id : ""));
  // "Agregar lugar" (OL-173, docs/rediseno/43) registra en línea, sin salir de la pantalla: el lugar nuevo
  // todavía no está en `lugares` (la trajo el primer pintado del servidor), así que esta lista propia lo recibe de
  // vuelta de la hoja y lo agrega, para que "Dónde" lo encuentre igual que a cualquier lugar ya registrado.
  const [listaLugares, setListaLugares] = useState<LugarResumen[]>(lugares);
  const [otro, setOtro] = useState<OtroSitio>(() => ({
    reservado: modoInicial === "reservado",
    sitioTexto: evento.sitio_texto ?? "",
    direccion: evento.sitio_direccion ?? "",
    nombreLegacy: !!evento.sitio_texto && !evento.sitio_direccion && !evento.sitio_reservado,
    sitioPunto: evento.sitio_lat != null && evento.sitio_lng != null ? { lat: evento.sitio_lat, lng: evento.sitio_lng } : null,
    direccionPrivada: privado?.direccion ?? "",
    privadoPunto: privado?.lat != null && privado?.lng != null ? { lat: privado.lat, lng: privado.lng } : null,
    revelarHoras: (() => {
      if (evento.sitio_revelar_desde && evento.inicio) {
        const h = Math.round((new Date(evento.inicio).getTime() - new Date(evento.sitio_revelar_desde).getTime()) / 3600000);
        return REVELAR_OPCIONES.some((o) => o.horas === h) ? h : 24;
      }
      return 24;
    })(),
    indicaciones: privado?.indicaciones ?? "",
    ciudad: (evento as { ciudad?: string } | undefined)?.ciudad ?? null,
  }));
  const [titulo, setTitulo] = useState(evento.titulo ?? "");
  // Las horas del selector son las del sitio del evento y se leen en su zona, la misma que usará el servidor al guardar
  // (zonaDelEvento): la del lugar elegido o, en otro sitio, la de su punto.
  const zonaInicial = zonaSegura(modoInicial === "lugar" ? (lugares.find((l) => l.id === evento.lugar_id)?.zona ?? evento.zona) : zonaSitio);
  const [inicio, setInicio] = useState(isoALocal(evento.inicio, zonaInicial));
  const [fin, setFin] = useState(isoALocal(evento.fin, zonaInicial));
  // En otro sitio, la zona sale del punto (el público o el reservado) con la misma cuenta del servidor; se pide cada vez
  // que el punto cambia (la hoja). Sin punto, la de la ciudad inicial, como al guardar.
  const puntoActivo = modoSitio === "reservado" ? otro.privadoPunto : modoSitio === "otro" ? otro.sitioPunto : null;
  const clavePunto = puntoActivo ? `${puntoActivo.lat},${puntoActivo.lng}` : "";
  const [zonaPin, setZonaPin] = useState(zonaSitio);
  const claveConZona = useRef(modoInicial === "lugar" ? "" : clavePunto);
  useEffect(() => {
    if (!clavePunto || clavePunto === claveConZona.current) return;
    claveConZona.current = clavePunto;
    const [lat, lng] = clavePunto.split(",").map(Number);
    let vigente = true;
    zonaDelPunto(lat, lng)
      .then((z) => {
        if (vigente) setZonaPin(z);
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, [clavePunto]);
  const [gratis, setGratis] = useState(!evento.precio);
  const [cooperacion, setCooperacion] = useState(esCooperacion(evento.precio));
  // Al editar, si el precio guardado es "$150", mostrar solo "150" en el campo.
  const [precio, setPrecio] = useState(evento.precio ? extraerNumero(evento.precio) : "");
  const [descripcion, setDescripcion] = useState(evento.descripcion ?? "");
  const [enlace, setEnlace] = useState(evento.enlace ?? "");
  const [imagen, setImagen] = useState<string | null>(evento.imagen ?? null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorImagen, setErrorImagen] = useState<string | null>(null);
  const [quien, setQuien] = useState<QuienItem[]>(quienInicial ?? []);
  // Cuál es el último gesto en «Dónde» y en la imagen: una respuesta que tarda (la dirección de un pin, una subida) no pisa uno más nuevo.
  const gestos = useRef(crearGestosFlyer());
  const [abierta, setAbierta] = useState<Abierta>(null);
  const [masAbierto, setMasAbierto] = useState(!!(evento.descripcion || evento.enlace || evento.imagen));
  // La hoja «Dónde»: cerrada, o abierta (`ubicarme`: con el «Estoy aquí» del renglón, que lee la ubicación al abrir).
  const [hoja, setHoja] = useState<null | { ubicarme: boolean }>(null);
  // "Estoy aquí" en el pin de otro sitio: la persona en el mapa (punto azul) y el pin donde está.
  const { yo, ubicando, avisoUbicacion, estoyAqui } = useEstoyAqui({ tocar: () => gestos.current.tocar("donde"), vigente: (v) => gestos.current.vigente("donde", v) });

  const formRef = useRef<HTMLFormElement>(null);
  // Los avisos de estos campos viven dentro de "Más": si llega uno con el renglón cerrado, se abre solo.
  useAbrirConError(formRef, setMasAbierto, errores.descripcion, errores.enlace, errores.imagen, errorImagen);

  const lugar = listaLugares.find((l) => l.id === lugarId);
  const direccionRetirada = !privado && sitioReservadoVencido(evento);
  const zona = zonaSegura(modoSitio === "lugar" ? (lugar?.zona ?? evento.zona) : clavePunto ? zonaPin : direccionRetirada && modoSitio === "reservado" ? evento.zona : ZONA_INICIAL);
  const inicioIso = localAIso(inicio, zona);
  const conservarSinDireccion = puedeConservarReservadoSinDireccion(evento, {
    sitio_reservado: modoSitio === "reservado", inicio: inicioIso ?? undefined, fin: fin ? localAIso(fin, zona) : null, zona,
  });
  const dondeResuelto = modoSitio === "lugar" ? !!lugar : sitioListo(otro) || (conservarSinDireccion && !!otro.sitioTexto.trim());
  // Vacío de verdad (nada escrito) contra leído-pendiente-de-confirmar (hay nombre/dirección, pero el pin no está
  // puesto o falta la dirección exacta reservada): "Falta" solo es el primero; el segundo dice "Confirmar" (L3).
  const dondeVacio = modoSitio === "lugar" ? !lugar : !otro.sitioTexto.trim();
  const dondeConfirmar = !dondeResuelto && !dondeVacio;
  const errorDonde = errores.lugar_id ?? errores.sitio_texto ?? errores.sitio_direccion ?? errores.direccion_privada;
  const faltaNombre = titulo.trim().length === 0;
  // Lo único que dice qué falta es la nota bajo el botón; cada renglón dice su estado con su valor «Falta» y su borde discontinuo.
  const falta = faltaEnEvento({ nombre: titulo, donde: dondeResuelto ? "listo" : dondeConfirmar ? "por-confirmar" : "falta" });

  const valorDonde = valorDelSitio(modoSitio, lugar, otro);
  const valorCuando = inicioIso ? formatearCuando(inicioIso, fin ? localAIso(fin, zona) : null, new Date(), zona) : "Falta la fecha";
  const valorCuanto = gratis ? "Gratis" : cooperacion ? COOPERACION_SOLIDARIA : precio.trim() || "Con costo";
  const valorQuien = quien.length ? unirNombres(quien.map((q) => (q.id && mios.some((m) => m.id === q.id) ? `${q.nombre} · tú` : q.nombre))) : "Sin artista";

  /** Lo que sale de la hoja: un lugar registrado (`nuevo` si acaba de crearse ahí mismo), o un sitio (reservado o no). */
  function elegirLugar(id: string, nuevo?: LugarResumen) {
    gestos.current.tocar("donde");
    if (nuevo) setListaLugares((actual) => (actual.some((l) => l.id === nuevo.id) ? actual : [...actual, nuevo]));
    setModoSitio("lugar");
    setLugarId(id);
    setHoja(null);
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
      if (!r?.direccion.trim() || !gestos.current.vigente("donde", version)) return;
      setOtro((actual) => ({ ...actual, pinPendiente: false, ciudad: r.ciudad, ...(o.reservado ? { direccionPrivada: r.direccion } : { direccion: r.direccion }) }));
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
    if (!("error" in r)) setImagen(r.url);
    setErrorImagen("error" in r ? r.error : null);
  }

  return (
    <>
      <form
        ref={formRef}
        action={(fd) => {
          if (falta) return;
          operacion.current = operacionEvento(fd, operacion.current);
          fd.set("operacion", operacion.current.id);
          // Si el servidor devuelve un error, lo escrito sigue en pantalla y la guardia vuelve.
          apartarGuardia();
          enviar(fd);
        }}
        noValidate
      >
        <input type="hidden" name="revision" value={revisionInicial ?? ""} />
        {/* 1. El nombre, con el icono del canon y su ✕. Vacío se marca como faltante con el mismo peso que Cuándo/Dónde cuando dicen
            «Falta»: el borde discontinuo; qué falta lo dice una sola vez, la nota bajo el botón (doc 50, H-29 y H-32). Sin autoFocus
            (founder, 2026-09-21, L2): el teclado no sale solo al abrir. */}
        <label className={`${canon.campo} ${faltaNombre && !errores.titulo ? canon.campoFalta : ""}`}>
          <IconoBuscar width={20} height={20} />
          <input
            name="titulo"
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={LIMITES_EVENTO.titulo}
            placeholder="Nombre del evento"
            aria-label="Nombre del evento"
            aria-invalid={!!errores.titulo}
            aria-describedby={errores.titulo ? "error-nombre-evento" : undefined}
            autoComplete="off"
            required
          />
          <Limpiar visible={!!titulo} />
          <ContadorCaracteres valor={titulo} tope={LIMITES_EVENTO.titulo} error={errores.titulo} />
        </label>
        {subiendo && !masAbierto && <p className={canon.estado}>Subiendo…</p>}
        {errores.titulo && (
          <p id="error-nombre-evento" className={canon.error} role="alert">
            {errores.titulo}
          </p>
        )}

        <ul className={renglon.renglones}>
          {/* 2. Cuándo: hoy a las 19:00 ya resuelto; al abrir, Empieza y Termina como el calendario del teléfono. */}
          <li className={`${renglon.resuelto} ${renglon.sinClave} ${abierta === "cuando" ? renglon.abierto : inicioIso ? "" : renglon.pendiente}`}>
            <IconoReloj width={20} height={20} />
            <small>Cuándo</small>
            <b className={inicioIso ? undefined : renglon.falta}>{valorCuando}</b>
            <Boton type="button" variante="texto" alto="control" ancho="contenido" onClick={() => setAbierta((a) => (a === "cuando" ? null : "cuando"))} aria-expanded={abierta === "cuando"}>
              {abierta === "cuando" ? "Listo" : "Cambiar"}
            </Boton>
            {abierta === "cuando" && (
              <div className={renglon.cuerpo}>
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
              <p className={renglon.nota} role="alert">
                {errores.inicio ?? errores.fin}
              </p>
            )}
          </li>

          {/* 3. Dónde: una sola salida, la lupa abre la hoja "Dónde es" (decisión 2). */}
          <li className={`${renglon.resuelto} ${renglon.sinClave} ${dondeResuelto ? "" : renglon.pendiente}`}>
            <IconoPin width={20} height={20} />
            <small>Dónde</small>
            {direccionRetirada && modoSitio === "reservado" && (
              <p className={renglon.nota}>La dirección ya no está disponible por privacidad. Si reprogramas el evento, añade una nueva.</p>
            )}
            {dondeResuelto ? (
              <>
                <b>{valorDonde}</b>
                <Boton type="button" variante="texto" alto="control" ancho="contenido" onClick={() => setHoja({ ubicarme: false })}>
                  Cambiar
                </Boton>
              </>
            ) : dondeConfirmar ? (
              // Leído del cartel o de una sugerencia, pero el pin no está confirmado: "Confirmar", no "Falta" (L3).
              // Una sola línea leída, no el nombre y la dirección juntos (textoDelSitio): revisión del gestor tras
              // el aviso del founder sobre formularios que se salen de la tarjeta con datos largos.
              <>
                <b>{otro.direccion?.trim() || otro.sitioTexto}</b>
                <Boton type="button" variante="texto" alto="control" ancho="contenido" onClick={() => setHoja({ ubicarme: false })}>
                  Confirmar
                </Boton>
              </>
            ) : (
              <>
                <b className={renglon.falta}>Falta el lugar</b>
                <span className={renglon.opciones}>
                  <BotonIcono relieve="contorno" onClick={() => setHoja({ ubicarme: true })} aria-label="Estoy aquí" title="Estoy aquí">
                    <IconoUbicacion width={22} height={22} />
                  </BotonIcono>
                  <BotonIcono relieve="contorno" onClick={() => setHoja({ ubicarme: false })} aria-label="Buscar el lugar" title="Buscar el lugar">
                    <IconoBuscar width={22} height={22} />
                  </BotonIcono>
                </span>
              </>
            )}
            {errorDonde && (
              <p className={renglon.nota} role="alert">
                {errorDonde}
              </p>
            )}
          </li>

          {/* 4. Quién: opcional, no detiene la publicación (Artistas, decisión 12). */}
          <li className={`${renglon.resuelto} ${renglon.sinClave} ${abierta === "quien" ? renglon.abierto : quien.length ? "" : renglon.opcional}`}>
            <IconoPersonas width={20} height={20} />
            <small>Quién</small>
            <b className={quien.length ? undefined : renglon.falta}>{valorQuien}</b>
            <Boton type="button" variante="texto" alto="control" ancho="contenido" onClick={() => setAbierta((a) => (a === "quien" ? null : "quien"))} aria-expanded={abierta === "quien"}>
              {abierta === "quien" ? "Listo" : quien.length ? "Cambiar" : "Agregar"}
            </Boton>
            {abierta === "quien" && (
              <div className={renglon.cuerpo}>
                <SelectorQuien valor={quien} onCambio={setQuien} mios={mios} ciudadContexto={ciudadContexto?.nombre} />
              </div>
            )}
          </li>

          {/* 5. Cuánto: gratis ya resuelto; al abrir, Gratis / Con costo y el precio. */}
          <li className={`${renglon.resuelto} ${renglon.sinClave} ${abierta === "cuanto" ? renglon.abierto : ""}`}>
            <IconoBoleto width={20} height={20} />
            <small>Cuánto</small>
            <b>{valorCuanto}</b>
            <Boton type="button" variante="texto" alto="control" ancho="contenido" onClick={() => setAbierta((a) => (a === "cuanto" ? null : "cuanto"))} aria-expanded={abierta === "cuanto"}>
              {abierta === "cuanto" ? "Listo" : "Cambiar"}
            </Boton>
            {abierta === "cuanto" && (
              <div className={renglon.cuerpo}>
                <div className={canon.chips}>
                  <Chip activo={gratis} onClick={() => { setGratis(true); setCooperacion(false); }}>
                    Gratis
                  </Chip>
                  <Chip activo={cooperacion} onClick={() => { setGratis(false); setCooperacion(true); }}>
                    {COOPERACION_SOLIDARIA}
                  </Chip>
                  <Chip activo={!gratis && !cooperacion} onClick={() => { setGratis(false); setCooperacion(false); }}>
                    Con costo
                  </Chip>
                </div>
                {!gratis && !cooperacion && (
                <span className={limpiar.caja}>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" name="precio" value={precio} onChange={(e) => setPrecio(e.target.value.replace(/\D/g, ''))} maxLength={LIMITES_EVENTO.precio} placeholder="Ej. 150" aria-label="Precio (solo números)" className={canon.entrada} autoComplete="off" autoFocus />
                  <Limpiar visible={!!precio} />
                  <ContadorCaracteres valor={precio} tope={LIMITES_EVENTO.precio} error={errores.precio} />
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
              <p className={renglon.nota} role="alert">
                {errores.precio}
              </p>
            )}
          </li>

          {/* 6. Más: descripción, enlace, cartel o foto. Se esconde, no se desmonta. */}
          <li className={`${renglon.resuelto} ${renglon.sinClave} ${masAbierto ? renglon.abierto : renglon.opcional}`}>
            <IconoMas width={20} height={20} />
            <small>Más</small>
            <b className={renglon.falta}>Más detalles</b>
            <Boton type="button" variante="texto" alto="control" ancho="contenido" onClick={() => setMasAbierto((a) => !a)} aria-expanded={masAbierto}>
              {masAbierto ? "Listo" : "Agregar"}
            </Boton>
            <div className={renglon.cuerpo} hidden={!masAbierto}>
              <Campo etiqueta="Descripción" name="descripcion" multilinea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={LIMITES_EVENTO.descripcion} error={errores.descripcion} mostrarContador />
              <Campo etiqueta="Enlace" name="enlace" value={enlace} onChange={(e) => setEnlace(e.target.value)} placeholder="Boletos, más información…" inputMode="url" autoCapitalize="none" autoComplete="off" error={errores.enlace} />
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
              {esAdmin && <div onChangeCapture={() => gestos.current.tocar("imagen")}><CampoImagenUrl valor={imagen} onCambio={setImagen} /></div>}
            </div>
          </li>
        </ul>

        {/* Todo viaja escondido: la hoja vive fuera del formulario y los renglones cerrados no tienen campos. */}
        <CamposSitio modo={modoSitio} lugarId={lugarId} otro={otro} ciudadContexto={ciudadContexto} />
        {abierta !== "cuando" && (
          <>
            <input type="hidden" name="inicio" value={inicio} />
            <input type="hidden" name="fin" value={fin} />
          </>
        )}
        <input type="hidden" name="quien" value={JSON.stringify(quien)} />
        <input type="hidden" name="gratis" value={gratis ? "si" : "no"} />
        <input type="hidden" name="cooperacion" value={cooperacion ? "si" : "no"} />
        {(gratis || cooperacion || abierta !== "cuanto") && <input type="hidden" name="precio" value={gratis || cooperacion ? "" : precio} />}
        <input type="hidden" name="imagen" value={imagen ?? ""} />

        {resultado && !resultado.ok && resultado.general && (
          <p className="aviso-error" role="alert">
            {resultado.general}
            {resultado.conflicto && evento.id && <> <a href={`/eventos/${evento.id}`} target="_blank" rel="noopener noreferrer">Ver versión actual en otra pestaña</a></>}
          </p>
        )}
        <BotonPublicar id="falta-evento" falta={falta} ocupado={enviando || terminado || subiendo}>
          {enviando || terminado ? "Guardando…" : "Guardar cambios"}
        </BotonPublicar>
      </form>
      {hoja && (
        <HojaDonde
          para="evento"
          lugares={listaLugares}
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
          onCerrar={() => setHoja(null)}
          ciudadContexto={ciudadContexto}
          ubicarme={hoja.ubicarme}
        />
      )}
    </>
  );
}
