"use client";

import Link from "next/link";
import { Fragment, useActionState, useCallback, useEffect, useRef, useState } from "react";
import { recordarLugarNuevo } from "@/app/eventos/borrador";
import CampoImagenUrl from "@/components/CampoImagenUrl";
import { useAbrirConError } from "@/components/ui/abrirConError";
import { useTerminar } from "@/components/ui/Atras";
import SelectorEnlaces from "@/components/SelectorEnlaces";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import ContadorCaracteres from "@/components/ui/ContadorCaracteres";
import Limpiar from "@/components/ui/Limpiar";
import limpiar from "@/components/ui/Limpiar.module.css";
import { Chip } from "@/components/ui/Chip";
import { IconoBuscar, IconoEtiqueta, IconoMas, IconoOk, IconoPin, IconoUbicacion } from "@/components/ui/Iconos";
import ListaFlotante from "@/components/ui/ListaFlotante";
import { CIUDAD_INICIAL } from "@/lib/ciudad";
import { configPublica } from "@/lib/config";
import { deducirTipo, recuperarLugar, sugerirLugares, type LugarSugerido } from "@/lib/buscarLugares";
import { normalizarRedes } from "@/lib/enlaces";
import { lugarDesdePunto } from "@/lib/geocodificar";
import type { Punto } from "@/lib/geo";
import { etiquetaTipo, LIMITES_LUGAR, TIPOS, type Lugar, type LugarResumen, type Tipo } from "@/lib/lugares";
import { quitarGuardia } from "@/lib/guardiaSalida";
import { useSalirSinPublicar } from "@/components/SalirSinPublicar";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { subirFoto } from "@/lib/subirFoto";
import { leerUbicacion } from "@/lib/ubicacion";
import { esteAparatoInicial } from "@/lib/plataforma";
import { usePlataforma } from "@/lib/useAvisosTelefono";
import type { ResultadoLugar } from "./acciones";
import HojaDonde from "./HojaDonde";
import canon from "@/components/ui/FormularioCanon.module.css";
import sug from "@/components/ui/Sugerencia.module.css";
import styles from "./FormularioLugar.module.css";

type Props = {
  accion: (previo: ResultadoLugar | null, formData: FormData) => Promise<ResultadoLugar>;
  /** Sin lugar = alta. Con lugar = edición (todo resuelto de entrada). */
  lugar?: Lugar;
  usuarioId: string;
  /** Desde dónde se vino (el alta de evento): al publicar el lugar se vuelve ahí con el lugar ya elegido. */
  siguiente?: string;
  /** El administrador puede pegar la dirección de una imagen y marcar el lugar como privado (mapeo personal). */
  esAdmin?: boolean;
};

/**
 * Alta de lugar, el canon de formulario (docs/rediseno/13, decisiones 8 a 12): un campo arriba (el nombre, que
 * resuelve lo demás con Mapbox) y debajo tres renglones resueltos: Dónde (con dos salidas cuando falta: Estoy aquí
 * y Buscar, que abre la hoja del mapa), Tipo (deducido; chips al abrir; con Otro, qué es) y Más (descripción,
 * redes, foto). El botón dice solo su acción; la ayuda de qué falta va bajo el campo o el renglón que falta
 * (founder, 2026-09-21: canon ampliado para todos los formularios, docs/rediseno/26).
 */
export default function FormularioLugar({ accion, lugar, usuarioId, siguiente, esAdmin = false }: Props) {
  const plataforma = usePlataforma();
  const esAlta = !lugar;
  const [resultado, enviar, enviando] = useActionState<ResultadoLugar | null, FormData>(accion, null);
  // Guardado, o publicado desde el alta de evento («Regístralo»): la tarea termina sin quedarse en el historial.
  // Al alta de evento se vuelve con el historial (sin apilar otra) y el lugar llega por su borrador; si no se vino de
  // ella, se va con el lugar en la URL, como antes. Mientras vuelve, el botón sigue ocupado.
  const terminar = useTerminar();
  const terminado = resultado?.ok === true;
  useEffect(() => {
    if (!resultado?.ok) return;
    if (!siguiente) {
      terminar(resultado.volver);
      return;
    }
    recordarLugarNuevo(resultado.id);
    terminar(siguiente, { siNo: `${siguiente}${siguiente.includes("?") ? "&" : "?"}lugar=${resultado.id}` });
  }, [resultado, siguiente, terminar]);
  const errores = resultado && !resultado.ok ? resultado.errores : {};
  const parecidos = resultado && !resultado.ok ? resultado.parecidos : undefined;

  const [nombre, setNombre] = useState(lugar?.nombre ?? "");
  const [tipo, setTipo] = useState<Tipo | "">(lugar?.tipo ?? "");
  const [tipoElegidoAMano, setTipoElegidoAMano] = useState(!!lugar);
  const [detalle, setDetalle] = useState(lugar?.detalle ?? "");
  const [direccion, setDireccion] = useState(lugar?.direccion ?? "");
  const [punto, setPunto] = useState<Punto | null>(lugar ? { lat: lugar.lat, lng: lugar.lng } : null);
  const [ciudad, setCiudad] = useState(lugar?.ciudad ?? "");
  const [sugeridos, setSugeridos] = useState<LugarSugerido[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [recuperando, setRecuperando] = useState(false);
  const [existentes, setExistentes] = useState<LugarResumen[]>([]);
  const [tipoAbierto, setTipoAbierto] = useState(false);
  const [masAbierto, setMasAbierto] = useState(!esAlta);
  const [hoja, setHoja] = useState<null | { conFoco: boolean }>(null);
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
  // La lista de sugerencias y el aviso "Ya está registrado" flotan sobre el layout, anclados al campo del nombre
  // (ui/ListaFlotante), y solo viven mientras el campo tiene el foco: es un autocompletado, tapar lo de abajo con
  // el teclado abierto es natural, pero un panel que se queda tapando el siguiente paso (Dónde) sin poder cerrarlo
  // es peor que empujarlo (revisión del gestor, 2026-09-21). Al salir del campo se cierra solo; si sigue habiendo
  // coincidencia, queda una sola línea de ayuda bajo el campo (ver más abajo), que sí ocupa su sitio.
  const campoNombreRef = useRef<HTMLElement>(null);
  const [enfocadoNombre, setEnfocadoNombre] = useState(false);
  // Sin borrador en el teléfono: el alta empieza limpia y, con cambios, Atrás o la ✕ preguntan (guardia estándar, 2026-09-16).
  const formRef = useRef<HTMLFormElement>(null);
  // Los avisos de estos campos viven dentro de "Más": si llega uno con el renglón cerrado, se abre solo.
  useAbrirConError(formRef, setMasAbierto, errores.descripcion, errores.enlaces, errores.portada, errorPortada);
  const hojaSalir = useSalirSinPublicar(formRef, esAlta);

  // Sesión de búsqueda de Mapbox (una por formulario).
  useEffect(() => {
    sesionRef.current = crypto.randomUUID();
  }, []);

  // Nombre → lugares sugeridos por Mapbox (350 ms tras dejar de escribir) y lugares ya registrados. Solo en el alta:
  // al editar, el lugar ya está ubicado y con nombre (la lista salía debajo del título al abrir; founder, 2026-09-16).
  useEffect(() => {
    if (!esAlta) return;
    const texto = nombre.trim();
    if (texto.length < 3 || texto === ultimaBusqueda.current || texto === nombreElegido.current) return;
    const { mapboxToken } = configPublica();
    const t = setTimeout(async () => {
      ultimaBusqueda.current = texto;
      setBuscando(true);
      try {
        const [sug, ex] = await Promise.all([
          mapboxToken ? sugerirLugares(texto, mapboxToken, punto ?? yo ?? CIUDAD_INICIAL.centro, sesionRef.current) : Promise.resolve([]),
          buscarExistentes(texto),
        ]);
        setSugeridos(sug);
        setExistentes(ex);
      } finally {
        setBuscando(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [esAlta, nombre, punto, yo]);

  /** Al escribir el nombre: limpia listas si es corto y deduce el tipo si nadie lo eligió a mano (Otro si no hay pista). */
  function alEscribirNombre(valor: string) {
    setNombre(valor);
    if (valor.trim().length < 3) {
      setSugeridos([]);
      setExistentes([]);
    }
    if (!tipoElegidoAMano) setTipo(valor.trim() ? (deducirTipo(valor) ?? "otro") : "");
  }

  /** Lugares ya registrados cuyo nombre contiene lo escrito (RPC lugares_con_nombre, mínimo 4 letras). */
  async function buscarExistentes(texto: string): Promise<LugarResumen[]> {
    const supabase = clienteNavegador();
    if (!supabase) return [];
    const { data } = await supabase.rpc("lugares_con_nombre", { p_nombre: texto });
    return (data ?? []) as LugarResumen[];
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
      setExistentes(await buscarExistentes(nombreFinal));
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

  async function estoyAqui() {
    setUbicando(true);
    setAvisoUbicacion(null);
    try {
      const p = await leerUbicacion(true);
      setYo((y) => ({ ...p, vez: (y?.vez ?? 0) + 1 }));
      alMoverPin(p);
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

  const faltaNombre = nombre.trim().length === 0;
  const faltaDonde = !punto;
  const listo = !faltaNombre && !faltaDonde && !!tipo;
  const sugerenciasAbiertas = enfocadoNombre && (buscando || recuperando || sugeridos.length > 0 || existentes.length > 0);
  // Al salir del campo, si sigue habiendo coincidencia, una sola línea de ayuda (no el panel) — recortada a una
  // línea, con el nombre completo disponible al abrir el lugar (revisión del gestor, 2026-09-21).
  const primerExistente = existentes[0];

  return (
    <>
      <form
        ref={formRef}
        action={(fd) => {
          quitarGuardia();
          enviar(fd);
        }}
        noValidate
        className={styles.formulario}
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
            autoFocus={esAlta}
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
        ) : faltaNombre ? (
          // La ayuda va bajo el campo, no dentro del botón de publicar (founder, 2026-09-21: canon para todos los formularios).
          <p className={canon.cuerpoNota}>Falta el nombre.</p>
        ) : (
          // Con el campo sin foco, si sigue habiendo coincidencia queda esta línea (recortada a una) en vez del
          // panel flotante: el panel tapaba Dónde sin poder cerrarse (revisión del gestor, 2026-09-21).
          !enfocadoNombre &&
          primerExistente && (
            <p className={styles.notaExiste}>
              <span>Ya hay {existentes.length > 1 ? "varios" : "uno"} con este nombre: </span>
              <b className={styles.nombreRecortado}>{primerExistente.nombre}</b>
              <Link href={`/lugares/${primerExistente.id}`}>Ver</Link>
            </p>
          )
        )}
        {/* La lista de sugerencias y "Ya está registrado" flotan sobre el layout, sin empujar Dónde, Tipo, Más ni el
            botón, y solo viven mientras el campo del nombre tiene el foco (revisión del gestor, 2026-09-21: un
            autocompletado tapa lo de abajo con el teclado abierto, pero se cierra solo al salir del campo — la línea
            de arriba toma el relevo). Mismo patrón que HojaDondeEs: el estado ("Buscando…"), el aviso y las
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
                        <Link href={`/lugares/${e.id}`}>{e.nombre}</Link>
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
            </>
          )}
        </ListaFlotante>

        <ul className={canon.renglones}>
          {/* 2. Dónde: resuelto en cuanto algo lo resuelve; si falta, dos salidas por intención. */}
          <li className={`${canon.resuelto} ${punto ? "" : canon.pendiente}`}>
            <IconoPin width={20} height={20} />
            <span className={canon.clave}>Dónde</span>
            {punto ? (
              <>
                <span className={canon.valor}>{direccion || "Pin en el mapa"}</span>
                <button type="button" className={canon.cambiar} onClick={() => setHoja({ conFoco: false })}>
                  Cambiar
                </button>
              </>
            ) : (
              <>
                <span className={`${canon.valor} ${canon.falta}`}>Falta</span>
                <span className={canon.opciones}>
                  <button type="button" className={canon.accionIcono} onClick={estoyAqui} disabled={ubicando} aria-label="Estoy aquí" title="Estoy aquí">
                    <IconoUbicacion width={22} height={22} />
                  </button>
                  <button type="button" className={canon.accionIcono} onClick={() => setHoja({ conFoco: true })} aria-label="Buscar la dirección" title="Buscar la dirección">
                    <IconoBuscar width={22} height={22} />
                  </button>
                </span>
              </>
            )}
            {/* La ayuda va bajo el renglón, no dentro del botón de publicar (founder, 2026-09-21: canon para todos los formularios). */}
            {errores.ubicacion || errores.direccion ? (
              <p className={canon.cuerpoNota} role="alert">
                {errores.ubicacion ?? errores.direccion}
              </p>
            ) : avisoUbicacion ? (
              <p className={canon.cuerpoNota}>{avisoUbicacion}</p>
            ) : (
              faltaDonde && <p className={canon.cuerpoNota}>Falta dónde está.</p>
            )}
          </li>

          {/* 3. Tipo: deducido del nombre; chips al abrir; con Otro, qué es (opcional). */}
          <li className={`${canon.resuelto} ${tipoAbierto ? canon.abierta : ""}`}>
            <IconoEtiqueta width={20} height={20} />
            <span className={canon.clave}>Tipo</span>
            <span className={`${canon.valor} ${tipo ? "" : canon.falta}`}>{tipo ? `${etiquetaTipo(tipo)}${tipo === "otro" && detalle.trim() ? ` · ${detalle.trim()}` : ""}` : "Por el nombre"}</span>
            <button type="button" className={canon.cambiar} onClick={() => setTipoAbierto((a) => !a)} aria-expanded={tipoAbierto}>
              {tipoAbierto ? "Listo" : "Cambiar"}
            </button>
            {tipoAbierto && (
              <div className={canon.cuerpo}>
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
          <li className={`${canon.resuelto} ${masAbierto ? canon.abierta : canon.pendiente}`}>
            <IconoMas width={20} height={20} />
            <span className={canon.clave}>Más</span>
            <span className={`${canon.valor} ${canon.falta}`}>Descripción, redes, foto</span>
            <button type="button" className={canon.cambiar} onClick={() => setMasAbierto((a) => !a)} aria-expanded={masAbierto}>
              {masAbierto ? "Listo" : "Agregar"}
            </button>
            {/* Se esconde, no se desmonta: lo escrito y los enlaces se quedan aunque se cierre. */}
            <div className={canon.cuerpo} hidden={!masAbierto}>
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
        {siguiente && <input type="hidden" name="siguiente" value={siguiente} />}

        {parecidos && parecidos.length > 0 && !confirmado && (
          <div className={styles.parecidos} role="alert">
            <p>
              <strong>¿Es este?</strong> Ya hay un lugar con ese nombre muy cerca:
            </p>
            <ul>
              {parecidos.map((p) => (
                <li key={p.id}>
                  <Link href={`/lugares/${p.id}`}>
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
        {/* El botón dice solo su acción; la ayuda de qué falta va bajo el campo o el renglón (founder, 2026-09-21). */}
        <Boton type="submit" disabled={enviando || terminado || subiendo || recuperando || !listo}>
          {enviando || terminado ? "Guardando…" : lugar ? "Guardar cambios" : "Publicar lugar"}
        </Boton>
      </form>
      {hoja && (
        <HojaDonde
          conFoco={hoja.conFoco}
          punto={punto}
          direccion={direccion}
          yo={yo}
          ubicando={ubicando}
          onPunto={alMoverPin}
          onDireccion={setDireccion}
          onCiudad={setCiudad}
          onEstoyAqui={estoyAqui}
          onCerrar={() => setHoja(null)}
        />
      )}
      {hojaSalir}
    </>
  );
}
