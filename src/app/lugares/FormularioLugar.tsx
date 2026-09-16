"use client";

import Link from "next/link";
import { Fragment, useActionState, useCallback, useEffect, useRef, useState } from "react";
import CampoImagenUrl from "@/components/CampoImagenUrl";
import SelectorEnlaces from "@/components/SelectorEnlaces";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Limpiar from "@/components/ui/Limpiar";
import limpiar from "@/components/ui/Limpiar.module.css";
import { Chip } from "@/components/ui/Chip";
import { IconoBuscar, IconoEtiqueta, IconoMas, IconoOk, IconoPin, IconoUbicacion } from "@/components/ui/Iconos";
import { CIUDAD_INICIAL } from "@/lib/ciudad";
import { configPublica } from "@/lib/config";
import { deducirTipo, recuperarLugar, sugerirLugares, type LugarSugerido } from "@/lib/buscarLugares";
import { normalizarRedes } from "@/lib/enlaces";
import { direccionDesdePunto } from "@/lib/geocodificar";
import type { Punto } from "@/lib/geo";
import { etiquetaTipo, LIMITES_LUGAR, TIPOS, type Lugar, type LugarResumen, type Tipo } from "@/lib/lugares";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { subirFoto } from "@/lib/subirFoto";
import { leerUbicacion } from "@/lib/ubicacion";
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

const CLAVE_BORRADOR = "somosnosotros:borrador-lugar";
type Borrador = { nombre: string; tipo: Tipo | ""; direccion: string; punto: Punto | null; detalle: string };

function leerBorrador(): Borrador | null {
  try {
    const raw = localStorage.getItem(CLAVE_BORRADOR);
    return raw ? (JSON.parse(raw) as Borrador) : null;
  } catch {
    return null;
  }
}

/**
 * Alta de lugar, el canon de formulario (docs/rediseno/13, decisiones 8 a 12): un campo arriba (el nombre, que
 * resuelve lo demás con Mapbox) y debajo tres renglones resueltos: Dónde (con dos salidas cuando falta: Estoy aquí
 * y Buscar, que abre la hoja del mapa), Tipo (deducido; chips al abrir; con Otro, qué es) y Más (descripción,
 * redes, foto). El botón dice qué falta. Sin frases de ayuda.
 */
export default function FormularioLugar({ accion, lugar, usuarioId, siguiente, esAdmin = false }: Props) {
  const esAlta = !lugar;
  const [resultado, enviar, enviando] = useActionState<ResultadoLugar | null, FormData>(accion, null);
  const errores = resultado && !resultado.ok ? resultado.errores : {};
  const parecidos = resultado && !resultado.ok ? resultado.parecidos : undefined;

  const [nombre, setNombre] = useState(lugar?.nombre ?? "");
  const [tipo, setTipo] = useState<Tipo | "">(lugar?.tipo ?? "");
  const [tipoElegidoAMano, setTipoElegidoAMano] = useState(!!lugar);
  const [detalle, setDetalle] = useState(lugar?.detalle ?? "");
  const [direccion, setDireccion] = useState(lugar?.direccion ?? "");
  const [punto, setPunto] = useState<Punto | null>(lugar ? { lat: lugar.lat, lng: lugar.lng } : null);
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
  const guardarBorrador = useRef(false); // solo después de intentar restaurar; si no, el montaje pisa lo guardado

  // Sesión de búsqueda de Mapbox (una por formulario) y borrador guardado en el teléfono.
  useEffect(() => {
    sesionRef.current = crypto.randomUUID();
    if (!esAlta) return;
    // Se restaura tras el primer pintado (el servidor no conoce el borrador; evita desajustes de hidratación).
    // Sin guarda de "ya corrí": en desarrollo React monta dos veces y la limpieza cancela la primera.
    const id = requestAnimationFrame(() => {
      const b = leerBorrador();
      if (b && (b.nombre || b.punto)) {
        setNombre(b.nombre);
        setTipo(b.tipo);
        setDetalle(b.detalle ?? "");
        setDireccion(b.direccion);
        setPunto(b.punto);
        nombreElegido.current = b.nombre;
      }
      guardarBorrador.current = true;
    });
    return () => cancelAnimationFrame(id);
  }, [esAlta]);
  useEffect(() => {
    if (!esAlta || !guardarBorrador.current) return;
    try {
      if (!nombre && !punto) localStorage.removeItem(CLAVE_BORRADOR);
      else localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ nombre, tipo, direccion, punto, detalle } satisfies Borrador));
    } catch {}
  }, [esAlta, nombre, tipo, direccion, punto, detalle]);

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
          mapboxToken ? sugerirLugares(texto, mapboxToken, CIUDAD_INICIAL.centro, sesionRef.current) : Promise.resolve([]),
          buscarExistentes(texto),
        ]);
        setSugeridos(sug);
        setExistentes(ex);
      } finally {
        setBuscando(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [esAlta, nombre]);

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
    direccionDesdePunto(p, mapboxToken).then((d) => {
      if (d) setDireccion(d);
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
      setAvisoUbicacion(e === "sin-soporte" ? "Este teléfono no da su ubicación. Busca la dirección o toca el mapa." : "No se pudo leer tu ubicación. Busca la dirección o toca el mapa.");
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

  return (
    <>
      <form
        action={(fd) => {
          if (esAlta) {
            try {
              localStorage.removeItem(CLAVE_BORRADOR);
            } catch {}
          }
          enviar(fd);
        }}
        noValidate
        className={styles.formulario}
      >
        {/* 1. El nombre: el sistema encuentra el lugar. */}
        <label className={canon.campo}>
          <IconoBuscar width={20} height={20} />
          <input name="nombre" type="text" value={nombre} onChange={(e) => alEscribirNombre(e.target.value)} maxLength={LIMITES_LUGAR.nombre} placeholder="Nombre del lugar" aria-label="Nombre del lugar" aria-invalid={!!errores.nombre} autoComplete="off" autoFocus={esAlta} required />
          <Limpiar visible={!!nombre} />
        </label>
        {(buscando || recuperando) && <p className={canon.estado}>{recuperando ? "Trayendo la ubicación…" : "Buscando…"}</p>}
        {errores.nombre && (
          <p className={canon.error} role="alert">
            {errores.nombre}
          </p>
        )}
        {sugeridos.length > 0 && (
          <ul className={`${sug.lista} ${styles.flotante}`} role="listbox" aria-label="Lugares encontrados">
            {sugeridos.map((s) => (
              <li key={s.mapboxId}>
                <button type="button" className={`${sug.renglon} ${s.esDireccion ? sug.direccion : ""}`} onClick={() => elegirSugerido(s)} role="option" aria-selected={false}>
                  <IconoPin width={20} height={20} />
                  <b>{s.esDireccion ? nombre.trim() : s.nombre}</b>
                  <small>{s.esDireccion ? `Usar la dirección ${s.direccion || s.nombre}` : s.direccion}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
        {existentes.length > 0 && (
          <p className={canon.existe} role="status">
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
          </p>
        )}

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
            {(avisoUbicacion || errores.ubicacion || errores.direccion) && (
              <p className={canon.cuerpoNota} role={errores.ubicacion ? "alert" : undefined}>
                {errores.ubicacion ?? errores.direccion ?? avisoUbicacion}
              </p>
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
              <Campo etiqueta="Descripción corta" name="descripcion" multilinea defaultValue={lugar?.descripcion ?? ""} maxLength={LIMITES_LUGAR.descripcion} placeholder="Qué es y qué pasa ahí" error={errores.descripcion} />
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
        {/* El botón dice qué falta (decisión 11). */}
        <Boton type="submit" disabled={enviando || subiendo || recuperando || !listo}>
          {enviando ? "Guardando…" : lugar ? "Guardar cambios" : "Publicar lugar"}
          {!enviando && !listo && <small className={canon.faltaBoton}>{faltaNombre ? "falta el nombre" : "falta dónde está"}</small>}
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
          onEstoyAqui={estoyAqui}
          onCerrar={() => setHoja(null)}
        />
      )}
    </>
  );
}
