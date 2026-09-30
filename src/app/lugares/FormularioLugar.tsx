"use client";

import Link from "next/link";
import { Fragment, useActionState, useCallback, useEffect, useRef, useState } from "react";
import CampoImagenUrl from "@/components/CampoImagenUrl";
import { useAbrirConError } from "@/components/ui/abrirConError";
import { useTerminar } from "@/components/ui/Atras";
import SelectorEnlaces from "@/components/SelectorEnlaces";
import HojaDonde from "@/components/HojaDonde";
import Boton from "@/components/ui/Boton";
import BotonIcono from "@/components/ui/BotonIcono";
import BotonPublicar from "@/components/ui/BotonPublicar";
import Campo from "@/components/ui/Campo";
import ContadorCaracteres from "@/components/ui/ContadorCaracteres";
import Limpiar from "@/components/ui/Limpiar";
import limpiar from "@/components/ui/Limpiar.module.css";
import { Chip } from "@/components/ui/Chip";
import { IconoBuscar, IconoEtiqueta, IconoMas, IconoOk, IconoPin, IconoUbicacion } from "@/components/ui/Iconos";
import ListaFlotante from "@/components/ui/ListaFlotante";
import type { Ciudad } from "@/lib/ciudad";
import { configPublica } from "@/lib/config";
import { consultarMapa, deducirTipo, lugaresPorTexto, recuperarLugar, sugerirLugares, type LugarSugerido } from "@/lib/buscarLugares";
import { buscarConContexto, descartarSinCalle, necesitaReintentoLugares } from "@/lib/direccionContexto";
import { normalizarRedes } from "@/lib/enlaces";
import { faltaEnLugar } from "@/lib/formulario";
import { contextoDondeEsta } from "@/lib/hojaDonde";
import { lugarDesdePunto } from "@/lib/geocodificar";
import type { Punto } from "@/lib/geo";
import { etiquetaTipo, hrefLugar, LIMITES_LUGAR, TIPOS, type Lugar, type LugarResumen, type Tipo } from "@/lib/lugares";
import { quitarGuardia } from "@/lib/guardiaSalida";
import { subirFoto } from "@/lib/subirFoto";
import { leerUbicacion, ubicacionCercanaFresca } from "@/lib/ubicacion";
import { esteAparatoInicial } from "@/lib/plataforma";
import { usePlataforma } from "@/lib/useAvisosTelefono";
import type { ResultadoLugar } from "./acciones";
import canon from "@/components/ui/FormularioCanon.module.css";
import renglon from "@/components/ui/Renglon.module.css";
import sug from "@/components/ui/Sugerencia.module.css";
import styles from "./FormularioLugar.module.css";

type Props = {
  accion: (previo: ResultadoLugar | null, formData: FormData) => Promise<ResultadoLugar>;
  /** Sin lugar = alta. Con lugar = edición (todo resuelto de entrada). */
  lugar?: Lugar;
  usuarioId: string;
  /** El nombre con el que empieza el alta (viene de una búsqueda que no encontró nada). */
  nombreInicial?: string;
  /** El administrador puede pegar la dirección de una imagen y marcar el lugar como privado (mapeo personal). */
  esAdmin?: boolean;
  /** Lugares ya registrados y visibles (sin el propio, al editar): pines de "¿Dónde está?" (OL-211) para avisar
   *  "ya existe" sin inventar -y sin ofrecerlos para elegir, que aquí no aplica (se está creando/corrigiendo ESTE). */
  lugares: LugarResumen[];
  /** La ciudad elegida (chip): misma cascada de contexto que el alta de evento (OL-100), para que la búsqueda de
   *  "¿Dónde está?" no busque en todo el país sin el pin ya puesto (corrección del gestor sobre el PR #249). */
  ciudadContexto?: Ciudad | null;
  /** El campo del nombre toma el foco al abrir (el alta lo pide solo si es lo primero que se ve). */
  autoFocus?: boolean;
  /** La pantalla de alta tiene tres formularios y solo se ve el del tipo elegido: los otros siguen ahí, escondidos, con lo escrito. */
  oculta?: boolean;
};

/**
 * Alta de lugar, el canon de formulario (docs/rediseno/13, decisiones 8 a 12): un campo arriba (el nombre, que
 * resuelve lo demás con Mapbox) y debajo tres renglones resueltos: Dónde (con dos salidas cuando falta: Estoy aquí
 * y Buscar, que abre la hoja del mapa), Tipo (deducido; chips al abrir; con Otro, qué es) y Más (descripción,
 * redes, foto). El botón dice solo su acción; la ayuda de qué falta va bajo el campo o el renglón que falta
 * (founder, 2026-09-21: canon ampliado para todos los formularios, docs/rediseno/26).
 */
export default function FormularioLugar({ accion, lugar, usuarioId, nombreInicial, esAdmin = false, lugares, ciudadContexto, autoFocus = false, oculta = false }: Props) {
  const plataforma = usePlataforma();
  const esAlta = !lugar;
  const [resultado, enviar, enviando] = useActionState<ResultadoLugar | null, FormData>(accion, null);
  // Guardado: la tarea termina sin quedarse en el historial; mientras vuelve, el botón sigue ocupado.
  const terminar = useTerminar();
  const terminado = resultado?.ok === true;
  useEffect(() => {
    if (resultado?.ok) terminar(resultado.volver);
  }, [resultado, terminar]);
  const errores = resultado && !resultado.ok ? resultado.errores : {};
  const parecidos = resultado && !resultado.ok ? resultado.parecidos : undefined;

  const [nombre, setNombre] = useState(lugar?.nombre ?? nombreInicial ?? "");
  const [tipo, setTipo] = useState<Tipo | "">(lugar?.tipo ?? (nombreInicial ? (deducirTipo(nombreInicial) ?? "otro") : ""));
  const [tipoElegidoAMano, setTipoElegidoAMano] = useState(!!lugar);
  const [detalle, setDetalle] = useState(lugar?.detalle ?? "");
  const [direccion, setDireccion] = useState(lugar?.direccion ?? "");
  const [punto, setPunto] = useState<Punto | null>(lugar ? { lat: lugar.lat, lng: lugar.lng } : null);
  const [ciudad, setCiudad] = useState(lugar?.ciudad ?? "");
  const [sugeridos, setSugeridos] = useState<LugarSugerido[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [recuperando, setRecuperando] = useState(false);
  const [existentes, setExistentes] = useState<LugarResumen[]>([]);
  const [tipoAbierto, setTipoAbierto] = useState(false);
  const [masAbierto, setMasAbierto] = useState(!esAlta);
  const [hoja, setHoja] = useState<null | { conFoco: boolean }>(null);
  // Sin el propio lugar (al editar): su pin no debe avisarse a sí mismo "ya existe" (OL-211).
  const lugaresParaMapa = lugar ? lugares.filter((l) => l.id !== lugar.id) : lugares;
  const [yo, setYo] = useState<(Punto & { vez: number }) | null>(null);
  const [ubicando, setUbicando] = useState(false);
  const [avisoUbicacion, setAvisoUbicacion] = useState<string | null>(null);
  const [portada, setPortada] = useState<string | null>(lugar?.portada ?? null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorPortada, setErrorPortada] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [privado, setPrivado] = useState(!!lugar?.privado);
  const sesionRef = useRef<string>("");
  const ultimaBusqueda = useRef("");
  const nombreElegido = useRef("");
  const versionBusquedaNombre = useRef(0);
  // La lista de sugerencias y el aviso "Ya está registrado" flotan sobre el layout, anclados al campo del nombre
  // (ui/ListaFlotante), y solo viven mientras el campo tiene el foco: es un autocompletado, tapar lo de abajo con
  // el teclado abierto es natural, pero un panel que se queda tapando el siguiente paso (Dónde) sin poder cerrarlo
  // es peor que empujarlo (revisión del gestor, 2026-09-21). Al salir del campo se cierra solo; si sigue habiendo
  // coincidencia, queda una sola línea de ayuda bajo el campo (ver más abajo), que sí ocupa su sitio.
  const campoNombreRef = useRef<HTMLElement>(null);
  const [enfocadoNombre, setEnfocadoNombre] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  // Los avisos de estos campos viven dentro de "Más": si llega uno con el renglón cerrado, se abre solo.
  useAbrirConError(formRef, setMasAbierto, errores.descripcion, errores.enlaces, errores.portada, errorPortada);
  // La posición cacheada del teléfono (si ya se pidió antes, en otra pantalla): último eslabón de la cascada de
  // contexto antes de San Luis Potosí de respaldo, igual que "¿Dónde está?" (`contextoDondeEsta`).
  const posicionTelefono = ubicacionCercanaFresca();

  // Sesión de búsqueda de Mapbox (una por formulario).
  useEffect(() => {
    sesionRef.current = crypto.randomUUID();
  }, []);

  // Nombre → lugares sugeridos por Mapbox y lugares ya registrados (350 ms tras dejar de escribir). Solo en el alta:
  // al editar, el lugar ya está ubicado y con nombre (la lista salía debajo del título al abrir; founder, 2026-09-16).
  // Misma cascada de contexto que "¿Dónde está?" (`contextoDondeEsta`, OL-211, corrección del gestor sobre el PR
  // #249: sin ella, este campo sugería en todo el país -"Laboratorio de Arte Escénico" traía Aguascalientes,
  // Pachuca y CDMX- y un toque llenaba el nombre Y la dirección con un lugar de otro estado); los ya registrados
  // salen con la MISMA comparación pura que la pantalla (`lugaresPorTexto`, sobre el mismo `lugares` ya cargado),
  // no con la función RPC de antes.
  useEffect(() => {
    if (!esAlta) return;
    const texto = nombre.trim();
    if (texto.length < 3 || texto === ultimaBusqueda.current || texto === nombreElegido.current) return;
    const { mapboxToken } = configPublica();
    const contexto = contextoDondeEsta(punto, texto, ciudadContexto, yo, posicionTelefono);
    const version = ++versionBusquedaNombre.current;
    const t = setTimeout(async () => {
      ultimaBusqueda.current = texto;
      setBuscando(true);
      setErrorBusqueda(null);
      setExistentes(lugaresPorTexto(lugares, texto));
      try {
        if (!mapboxToken) throw new Error("Sin servicio de direcciones");
        const opciones = await buscarConContexto(
          texto,
          contexto,
          (t2, bbox) => sugerirLugares(t2, mapboxToken, contexto.centro, sesionRef.current, consultarMapa, bbox).then((r) => descartarSinCalle(r, t2)),
          (r) => necesitaReintentoLugares(r.map((o) => o.distanciaM)),
        );
        if (version === versionBusquedaNombre.current) setSugeridos(opciones);
      } catch {
        if (version === versionBusquedaNombre.current) {
          setSugeridos([]);
          setErrorBusqueda("No pude buscar. Intenta de nuevo.");
        }
      } finally {
        if (version === versionBusquedaNombre.current) setBuscando(false);
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esAlta, nombre, punto, yo, ciudadContexto]);

  /** Al escribir el nombre: limpia listas si es corto y deduce el tipo si nadie lo eligió a mano (Otro si no hay pista). */
  function alEscribirNombre(valor: string) {
    setNombre(valor);
    if (valor.trim().length < 3) {
      setSugeridos([]);
      setExistentes([]);
      setErrorBusqueda(null);
    }
    if (!tipoElegidoAMano) setTipo(valor.trim() ? (deducirTipo(valor) ?? "otro") : "");
  }

  async function elegirSugerido(s: LugarSugerido) {
    const { mapboxToken } = configPublica();
    if (!mapboxToken) return;
    setRecuperando(true);
    setSugeridos([]);
    try {
      const r = await recuperarLugar(s.mapboxId, mapboxToken, sesionRef.current);
      // Una dirección ubica, no nombra: el nombre escrito por la persona se queda ("Workshop 850" no pasa a ser "Calle 850").
      const nombreFinal = s.esDireccion ? nombre.trim() || s.nombre : s.nombre || r?.nombre || nombre;
      nombreElegido.current = nombreFinal;
      ultimaBusqueda.current = nombreFinal;
      setNombre(nombreFinal);
      if (r) {
        setPunto({ lat: r.lat, lng: r.lng });
        setDireccion(r.direccion || s.direccion);
        if (r.ciudad) setCiudad(r.ciudad);
      } else {
        setDireccion(s.direccion);
      }
      if (!tipoElegidoAMano && !s.esDireccion) {
        const deducido = deducirTipo(nombreFinal, [...s.categorias, ...(r?.categorias ?? [])]);
        if (deducido) setTipo(deducido);
      }
      setExistentes(lugaresPorTexto(lugares, nombreFinal));
    } finally {
      setRecuperando(false);
    }
  }

  // Pin movido con el dedo (o "Estoy aquí"): la dirección se deduce sola.
  const alMoverPin = useCallback((p: Punto) => {
    setPunto(p);
    const { mapboxToken } = configPublica();
    if (!mapboxToken) return;
    lugarDesdePunto(p, mapboxToken).then((r) => {
      if (r?.direccion) setDireccion(r.direccion);
      if (r?.ciudad) setCiudad(r.ciudad);
    });
  }, []);

  /** Lee la ubicación y la entrega a quien la pidió: el renglón "Dónde" (con `alMoverPin`, directo) o la hoja
   *  "Dónde está" abierta (con su propio `moverPin`, que muestra "Ubicando…" mientras llega la dirección -mismo
   *  contrato que `onEstoyAqui` en `HojaDonde` del alta de evento, OL-211). */
  async function estoyAqui(poner: (p: Punto) => void) {
    setUbicando(true);
    setAvisoUbicacion(null);
    try {
      const p = await leerUbicacion(true);
      setYo((y) => ({ ...p, vez: (y?.vez ?? 0) + 1 }));
      poner(p);
    } catch (e) {
      setAvisoUbicacion(e === "sin-soporte" ? `${esteAparatoInicial(plataforma)} no da su ubicación. Busca la dirección o toca el mapa.` : "No se pudo leer tu ubicación. Busca la dirección o toca el mapa.");
    } finally {
      setUbicando(false);
    }
  }

  async function subirPortada(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setSubiendo(true);
    setErrorPortada(null);
    const r = await subirFoto("lugares", usuarioId, "portada", archivo);
    if ("error" in r) setErrorPortada(r.error);
    else setPortada(r.url);
    setSubiendo(false);
  }

  // Lo único que dice qué falta es la nota bajo el botón; cada renglón dice su estado con su valor «Falta» y su borde discontinuo.
  const falta = faltaEnLugar({ nombre, ubicado: !!punto });
  const sugerenciasAbiertas = enfocadoNombre && (buscando || recuperando || sugeridos.length > 0 || existentes.length > 0 || !!errorBusqueda);
  // Al salir del campo, si sigue habiendo coincidencia, una sola línea de ayuda (no el panel) — recortada a una
  // línea, con el nombre completo disponible al abrir el lugar (revisión del gestor, 2026-09-21).
  const primerExistente = existentes[0];

  return (
    <>
      <form
        ref={formRef}
        hidden={oculta}
        action={(fd) => {
          if (falta) return;
          quitarGuardia();
          enviar(fd);
        }}
        noValidate
      >
        {/* 1. El nombre: el sistema encuentra el lugar. */}
        <label className={canon.campo} ref={campoNombreRef as React.RefObject<HTMLLabelElement>}>
          <IconoBuscar width={20} height={20} />
          <input
            name="nombre"
            type="text"
            value={nombre}
            onChange={(e) => alEscribirNombre(e.target.value)}
            onFocus={() => setEnfocadoNombre(true)}
            onBlur={() => setEnfocadoNombre(false)}
            maxLength={LIMITES_LUGAR.nombre}
            placeholder="Nombre del lugar"
            aria-label="Nombre del lugar"
            aria-invalid={!!errores.nombre}
            autoComplete="off"
            autoFocus={autoFocus}
            required
            role="combobox"
            aria-expanded={sugerenciasAbiertas}
            aria-controls="lista-sugerencias-lugar"
            aria-autocomplete="list"
          />
          <Limpiar visible={!!nombre} />
          <ContadorCaracteres valor={nombre} tope={LIMITES_LUGAR.nombre} error={errores.nombre} />
        </label>
        {errores.nombre ? (
          <p className={canon.error} role="alert">
            {errores.nombre}
          </p>
        ) : (
          // Con el campo sin foco, si sigue habiendo coincidencia queda esta línea (recortada a una) en vez del
          // panel flotante: el panel tapaba Dónde sin poder cerrarse (revisión del gestor, 2026-09-21).
          !enfocadoNombre &&
          primerExistente && (
            <p className={styles.notaExiste}>
              <span>Ya hay {existentes.length > 1 ? "varios" : "uno"} con este nombre: </span>
              <b className={styles.nombreRecortado}>{primerExistente.nombre}</b>
              <Link href={hrefLugar(primerExistente)}>Ver</Link>
            </p>
          )
        )}
        {/* La lista de sugerencias y "Ya está registrado" flotan sobre el layout, sin empujar Dónde, Tipo, Más ni el
            botón, y solo viven mientras el campo del nombre tiene el foco (revisión del gestor, 2026-09-21: un
            autocompletado tapa lo de abajo con el teclado abierto, pero se cierra solo al salir del campo — la línea
            de arriba toma el relevo). Mismo patrón que `HojaDonde`: el estado ("Buscando…"), el aviso y las
            opciones viven dentro de la misma lista flotante. */}
        <ListaFlotante abierta={sugerenciasAbiertas} onCerrar={() => setEnfocadoNombre(false)} ancla={campoNombreRef} id="lista-sugerencias-lugar" etiqueta="Lugares encontrados">
          {buscando || recuperando ? (
            <li className={styles.avisoFlotante} role="status">
              {recuperando ? "Trayendo la ubicación…" : "Buscando…"}
            </li>
          ) : (
            <>
              {existentes.length > 0 && (
                <li className={`${canon.existe} ${styles.existeFlotante}`} role="status">
                  <IconoOk width={20} height={20} />
                  <span>
                    <b>Ya está registrado:</b>{" "}
                    {existentes.map((e, i) => (
                      <Fragment key={e.id}>
                        {i > 0 ? " · " : ""}
                        <Link href={hrefLugar(e)}>{e.nombre}</Link>
                      </Fragment>
                    ))}
                    . Si es otro con el mismo nombre, sigue.
                  </span>
                </li>
              )}
              {sugeridos.map((s) => (
                <li key={s.mapboxId}>
                  {/* onMouseDown con preventDefault: el toque no le quita el foco al campo antes de que el clic
                      se procese, si no React quita el panel del DOM a medio gesto y el toque no llega a elegir
                      (revisión del gestor, 2026-09-21, sobre el mismo mecanismo de "cerrar al salir del foco"). */}
                  <button type="button" className={`${sug.renglon} ${s.esDireccion ? sug.direccion : ""}`} onMouseDown={(e) => e.preventDefault()} onClick={() => elegirSugerido(s)} role="option" aria-selected={false}>
                    <IconoPin width={20} height={20} />
                    <b>{s.esDireccion ? nombre.trim() : s.nombre}</b>
                    <small>{s.esDireccion ? `Usar la dirección ${s.direccion || s.nombre}` : s.direccion}</small>
                  </button>
                </li>
              ))}
              {errorBusqueda && (
                <li className={styles.avisoFlotante} role="alert">
                  {errorBusqueda}
                </li>
              )}
            </>
          )}
        </ListaFlotante>

        <ul className={renglon.renglones}>
          {/* 2. Dónde: resuelto en cuanto algo lo resuelve; si falta, dos salidas por intención. */}
          <li className={`${renglon.resuelto} ${punto ? "" : renglon.pendiente}`}>
            <IconoPin width={20} height={20} />
            <small>Dónde</small>
            {punto ? (
              <>
                <b>{direccion || "Pin en el mapa"}</b>
                <Boton type="button" variante="texto" alto="control" ancho="contenido" onClick={() => setHoja({ conFoco: false })}>
                  Cambiar
                </Boton>
              </>
            ) : (
              <>
                <b className={renglon.falta}>Falta</b>
                <span className={renglon.opciones}>
                  <BotonIcono relieve="contorno" onClick={() => void estoyAqui(alMoverPin)} disabled={ubicando} aria-label="Estoy aquí" title="Estoy aquí">
                    <IconoUbicacion width={22} height={22} />
                  </BotonIcono>
                  <BotonIcono relieve="contorno" onClick={() => setHoja({ conFoco: true })} aria-label="Buscar la dirección" title="Buscar la dirección">
                    <IconoBuscar width={22} height={22} />
                  </BotonIcono>
                </span>
              </>
            )}
            {errores.ubicacion || errores.direccion ? (
              <p className={renglon.nota} role="alert">
                {errores.ubicacion ?? errores.direccion}
              </p>
            ) : (
              avisoUbicacion && <p className={renglon.nota}>{avisoUbicacion}</p>
            )}
          </li>

          {/* 3. Tipo: deducido del nombre; chips al abrir; con Otro, qué es (opcional). */}
          <li className={`${renglon.resuelto} ${tipoAbierto ? renglon.abierto : ""}`}>
            <IconoEtiqueta width={20} height={20} />
            <small>Tipo</small>
            <b className={tipo ? undefined : renglon.falta}>{tipo ? `${etiquetaTipo(tipo)}${tipo === "otro" && detalle.trim() ? ` · ${detalle.trim()}` : ""}` : "Por el nombre"}</b>
            <Boton type="button" variante="texto" alto="control" ancho="contenido" onClick={() => setTipoAbierto((a) => !a)} aria-expanded={tipoAbierto}>
              {tipoAbierto ? "Listo" : "Cambiar"}
            </Boton>
            {tipoAbierto && (
              <div className={renglon.cuerpo}>
                <div className={canon.chips}>
                  {TIPOS.map((t) => (
                    <Chip
                      key={t.valor}
                      activo={tipo === t.valor}
                      onClick={() => {
                        setTipo(t.valor);
                        setTipoElegidoAMano(true);
                        if (t.valor !== "otro") setTipoAbierto(false);
                      }}
                    >
                      {t.etiqueta}
                    </Chip>
                  ))}
                </div>
                {tipo === "otro" && (
                  <span className={limpiar.caja}>
                    <input type="text" name="detalle" value={detalle} onChange={(e) => setDetalle(e.target.value)} maxLength={LIMITES_LUGAR.detalle} placeholder="¿Qué es? Ej. taller de cerámica (opcional)" aria-label="Qué es" className={canon.entrada} autoComplete="off" />
                    <Limpiar visible={!!detalle} />
                    <ContadorCaracteres valor={detalle} tope={LIMITES_LUGAR.detalle} error={errores.detalle} />
                  </span>
                )}
                {errores.detalle && (
                  <p className={canon.error} role="alert">
                    {errores.detalle}
                  </p>
                )}
              </div>
            )}
          </li>

          {/* 4. Más: descripción, redes, foto (y lo del administrador). Puede hacerse después. */}
          <li className={`${renglon.resuelto} ${masAbierto ? renglon.abierto : renglon.pendiente}`}>
            <IconoMas width={20} height={20} />
            <small>Más</small>
            <b className={renglon.falta}>Descripción, redes, foto</b>
            <Boton type="button" variante="texto" alto="control" ancho="contenido" onClick={() => setMasAbierto((a) => !a)} aria-expanded={masAbierto}>
              {masAbierto ? "Listo" : "Agregar"}
            </Boton>
            {/* Se esconde, no se desmonta: lo escrito y los enlaces se quedan aunque se cierre. */}
            <div className={renglon.cuerpo} hidden={!masAbierto}>
              <Campo etiqueta="Descripción corta" name="descripcion" multilinea defaultValue={lugar?.descripcion ?? ""} maxLength={LIMITES_LUGAR.descripcion} placeholder="Qué es y qué pasa ahí" error={errores.descripcion} mostrarContador />
              <SelectorEnlaces inicial={normalizarRedes(lugar?.redes)} error={errores.enlaces} />
              {portada && (
                // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
                <img src={portada} alt="" className={styles.portada} />
              )}
              <label className={canon.subir}>
                <input type="file" accept="image/*" onChange={subirPortada} disabled={subiendo} />
                {subiendo ? "Subiendo…" : portada ? "Cambiar la foto" : "Poner una foto de portada"}
              </label>
              {(errorPortada || errores.portada) && (
                <p className={canon.error} role="alert">
                  {errorPortada ?? errores.portada}
                </p>
              )}
              {esAdmin && <CampoImagenUrl valor={portada} onCambio={setPortada} />}
              {esAdmin && (
                <label className={styles.interruptor}>
                  <input type="checkbox" checked={privado} onChange={(e) => setPrivado(e.target.checked)} />
                  <strong>Solo yo lo veo</strong>
                  <small>Mapeo privado: no sale en el mapa, la lista ni la búsqueda para nadie más.</small>
                </label>
              )}
            </div>
          </li>
        </ul>

        <input type="hidden" name="tipo" value={tipo} />
        <input type="hidden" name="direccion" value={direccion} />
        <input type="hidden" name="lat" value={punto?.lat ?? ""} />
        <input type="hidden" name="lng" value={punto?.lng ?? ""} />
        <input type="hidden" name="portada" value={portada ?? ""} />
        <input type="hidden" name="ciudad" value={ciudad} />
        <input type="hidden" name="privado" value={privado ? "1" : ""} />
        {!(tipoAbierto && tipo === "otro") && <input type="hidden" name="detalle" value={detalle} />}

        {parecidos && parecidos.length > 0 && !confirmado && (
          <div className={styles.parecidos} role="alert">
            <p>
              <strong>¿Es este?</strong> Ya hay un lugar con ese nombre muy cerca:
            </p>
            <ul>
              {parecidos.map((p) => (
                <li key={p.id}>
                  <Link href={hrefLugar(p)}>
                    {p.nombre} · {etiquetaTipo(p.tipo)}
                    {p.direccion ? ` · ${p.direccion}` : ""}
                  </Link>
                </li>
              ))}
            </ul>
            <Boton type="button" variante="secundario" onClick={() => setConfirmado(true)}>
              No, es otro: publicar de todos modos
            </Boton>
          </div>
        )}
        <input type="hidden" name="confirmado" value={confirmado ? "1" : ""} />

        {resultado && !resultado.ok && resultado.general && (
          <p className="aviso-error" role="alert">
            {resultado.general}
          </p>
        )}
        <BotonPublicar id="falta-lugar" falta={falta} ocupado={enviando || terminado || subiendo || recuperando}>
          {enviando || terminado ? "Guardando…" : lugar ? "Guardar cambios" : "Publicar lugar"}
        </BotonPublicar>
      </form>
      {hoja && (
        <HojaDonde
          para="lugar"
          lugares={lugaresParaMapa}
          nombreForm={nombre}
          conFoco={hoja.conFoco}
          punto={punto}
          direccion={direccion}
          ciudad={ciudad}
          ciudadContexto={ciudadContexto}
          yo={yo}
          ubicando={ubicando}
          avisoUbicacion={avisoUbicacion}
          onEstoyAqui={estoyAqui}
          onListo={({ punto: p, direccion: d, ciudad: c }) => {
            setPunto(p);
            setDireccion(d);
            if (c) setCiudad(c);
          }}
          onCerrar={() => setHoja(null)}
        />
      )}
    </>
  );
}
