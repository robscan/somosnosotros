"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import Mapa from "@/components/Mapa";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import { CIUDAD_INICIAL } from "@/lib/ciudad";
import { configPublica } from "@/lib/config";
import { deducirTipo, recuperarLugar, sugerirLugares, type LugarSugerido } from "@/lib/buscarLugares";
import { direccionDesdePunto } from "@/lib/geocodificar";
import SelectorEnlaces from "@/components/SelectorEnlaces";
import { normalizarRedes } from "@/lib/enlaces";
import { LIMITES_LUGAR, TIPOS, etiquetaTipo, type Lugar, type LugarResumen, type Tipo } from "@/lib/lugares";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { reducirImagen } from "@/lib/imagen";
import type { ResultadoLugar } from "./acciones";
import styles from "./FormularioLugar.module.css";

type Punto = { lat: number; lng: number };
type Props = {
  accion: (previo: ResultadoLugar | null, formData: FormData) => Promise<ResultadoLugar>;
  /** Sin lugar = alta (corta, con ayuda). Con lugar = edición (todos los campos). */
  lugar?: Lugar;
  usuarioId: string;
};

const CLAVE_BORRADOR = "somosnosotros:borrador-lugar";
type Borrador = { nombre: string; tipo: Tipo | ""; direccion: string; punto: Punto | null };

function leerBorrador(): Borrador | null {
  try {
    const raw = localStorage.getItem(CLAVE_BORRADOR);
    return raw ? (JSON.parse(raw) as Borrador) : null;
  } catch {
    return null;
  }
}

/**
 * Alta de lugar pensada para no teclear: escribes el nombre y el sistema encuentra el lugar
 * (dirección + punto + tipo); o tocas "Estoy aquí" y deduce la dirección del pin. Lo demás
 * (descripción, redes, foto) es opcional y puede esperar a después de publicar.
 */
export default function FormularioLugar({ accion, lugar, usuarioId }: Props) {
  const esAlta = !lugar;
  const [resultado, enviar, enviando] = useActionState<ResultadoLugar | null, FormData>(accion, null);
  const errores = resultado && !resultado.ok ? resultado.errores : {};
  const parecidos = resultado && !resultado.ok ? resultado.parecidos : undefined;

  const [nombre, setNombre] = useState(lugar?.nombre ?? "");
  const [tipo, setTipo] = useState<Tipo | "">(lugar?.tipo ?? "");
  const [tipoElegidoAMano, setTipoElegidoAMano] = useState(!!lugar);
  const [direccion, setDireccion] = useState(lugar?.direccion ?? "");
  const [punto, setPunto] = useState<Punto | null>(lugar ? { lat: lugar.lat, lng: lugar.lng } : null);
  const [sugeridos, setSugeridos] = useState<LugarSugerido[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [recuperando, setRecuperando] = useState(false);
  const [ubicando, setUbicando] = useState(false);
  const [avisoUbicacion, setAvisoUbicacion] = useState<string | null>(null);
  const [existentes, setExistentes] = useState<LugarResumen[]>([]);
  const [mostrarDetalles, setMostrarDetalles] = useState(!esAlta);
  const [portada, setPortada] = useState<string | null>(lugar?.portada ?? null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorPortada, setErrorPortada] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);
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
      else localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ nombre, tipo, direccion, punto } satisfies Borrador));
    } catch {}
  }, [esAlta, nombre, tipo, direccion, punto]);

  // Nombre → lugares sugeridos por Mapbox (350 ms tras dejar de escribir) y lugares ya registrados.
  useEffect(() => {
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
        setExistentes(ex.filter((e) => e.id !== lugar?.id));
      } finally {
        setBuscando(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [nombre, lugar?.id]);

  /** Al escribir el nombre: limpia listas si es corto y deduce el tipo si nadie lo eligió a mano. */
  function alEscribirNombre(valor: string) {
    setNombre(valor);
    if (valor.trim().length < 3) {
      setSugeridos([]);
      setExistentes([]);
    }
    if (!tipoElegidoAMano) {
      const deducido = deducirTipo(valor);
      if (deducido) setTipo(deducido);
    }
  }

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
      const nombreFinal = s.nombre || r?.nombre || nombre;
      nombreElegido.current = nombreFinal;
      ultimaBusqueda.current = nombreFinal;
      setNombre(nombreFinal);
      if (r) {
        setPunto({ lat: r.lat, lng: r.lng });
        setDireccion(r.direccion || s.direccion);
      } else {
        setDireccion(s.direccion);
      }
      if (!tipoElegidoAMano) {
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

  function estoyAqui() {
    if (!("geolocation" in navigator)) {
      setAvisoUbicacion("Este teléfono no da su ubicación. Toca el mapa donde está el lugar.");
      return;
    }
    setUbicando(true);
    setAvisoUbicacion(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicando(false);
        alMoverPin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setUbicando(false);
        setAvisoUbicacion("No se pudo leer tu ubicación. Toca el mapa donde está el lugar.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }

  async function subirPortada(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const supabase = clienteNavegador();
    if (!supabase) return;
    if (archivo.size > 5 * 1024 * 1024) {
      setErrorPortada("La foto pesa más de 5 MB. Elige otra.");
      return;
    }
    setSubiendo(true);
    setErrorPortada(null);
    const listo = await reducirImagen(archivo); // menos peso y menos espera: se reduce en el teléfono antes de subir
    const extension = (listo.name.split(".").pop() || "jpg").toLowerCase();
    const ruta = `lugares/${usuarioId}/portada-${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from("fotos").upload(ruta, listo, { upsert: true, contentType: listo.type || undefined });
    if (error) setErrorPortada("No se pudo subir la foto. Intenta con otra.");
    else setPortada(supabase.storage.from("fotos").getPublicUrl(ruta).data.publicUrl);
    setSubiendo(false);
  }

  function alEnviar() {
    // El borrador se limpia cuando el servidor responde con éxito (redirige), no antes.
  }

  const listo = nombre.trim().length > 0 && !!punto && !!tipo;

  return (
    <form
      action={(fd) => {
        alEnviar();
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
      {/* 1. Nombre: el sistema encuentra el lugar. */}
      <div className={styles.campo}>
        <Campo
          etiqueta="Nombre del lugar"
          name="nombre"
          value={nombre}
          onChange={(e) => alEscribirNombre(e.target.value)}
          maxLength={LIMITES_LUGAR.nombre}
          placeholder="Ej. Casa de la Cultura"
          autoComplete="off"
          autoFocus={esAlta}
          ayuda={recuperando ? "Trayendo la ubicación…" : buscando ? "Buscando…" : esAlta ? "Escríbelo y elige el lugar si aparece: llenamos lo demás." : undefined}
          error={errores.nombre}
          required
        />
        {sugeridos.length > 0 && (
          <ul className={styles.sugerencias} role="listbox" aria-label="Lugares encontrados">
            {sugeridos.map((s) => (
              <li key={s.mapboxId}>
                <button type="button" className={styles.sugerencia} onClick={() => elegirSugerido(s)} role="option" aria-selected={false}>
                  <strong>{s.nombre}</strong>
                  {s.direccion && <span className={styles.sugerenciaDetalle}>{s.direccion}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {existentes.length > 0 && (
          <div className={styles.existentes} role="status">
            <p>
              <strong>Ya está registrado:</strong>
            </p>
            <ul>
              {existentes.map((e) => (
                <li key={e.id}>
                  <Link href={`/lugares/${e.id}`}>
                    {e.nombre} · {etiquetaTipo(e.tipo)}
                    {e.direccion ? ` · ${e.direccion}` : ""}
                  </Link>
                </li>
              ))}
            </ul>
            <p className={styles.nota}>Si es otro con el mismo nombre, sigue adelante.</p>
          </div>
        )}
      </div>

      {/* 2. Ubicación: elegida arriba, "Estoy aquí", o el dedo en el mapa. */}
      <div className={styles.campo}>
        <div className={styles.filaEtiqueta}>
          <p className={styles.etiqueta}>Ubicación</p>
          <button type="button" className={styles.botonChico} onClick={estoyAqui} disabled={ubicando}>
            {ubicando ? "Ubicando…" : "Estoy aquí"}
          </button>
        </div>
        <Mapa modo="elegir" valor={punto} onCambio={alMoverPin} />
        <input type="hidden" name="lat" value={punto?.lat ?? ""} />
        <input type="hidden" name="lng" value={punto?.lng ?? ""} />
        {avisoUbicacion && <p className={styles.nota}>{avisoUbicacion}</p>}
        {errores.ubicacion && (
          <p className={styles.error} role="alert">
            {errores.ubicacion}
          </p>
        )}
        <Campo
          etiqueta="Dirección"
          name="direccion"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          maxLength={LIMITES_LUGAR.direccion}
          placeholder="Se llena sola con el pin; corrígela si hace falta"
          autoComplete="off"
          error={errores.direccion}
        />
      </div>

      {/* 3. Tipo: deducido; se puede cambiar. */}
      <div className={styles.campo}>
        <label htmlFor="campo-tipo" className={styles.etiqueta}>
          Tipo
        </label>
        <select
          id="campo-tipo"
          name="tipo"
          className={styles.select}
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value as Tipo);
            setTipoElegidoAMano(true);
          }}
          aria-invalid={!!errores.tipo}
          required
        >
          <option value="" disabled>
            Elige uno
          </option>
          {TIPOS.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.etiqueta}
            </option>
          ))}
        </select>
        {errores.tipo && (
          <p className={styles.error} role="alert">
            {errores.tipo}
          </p>
        )}
      </div>

      {/* 4. Detalles: opcionales; en el alta van plegados. */}
      {esAlta && !mostrarDetalles && (
        <button type="button" className={styles.desplegar} onClick={() => setMostrarDetalles(true)}>
          + Agregar descripción, redes o foto (puedes hacerlo después)
        </button>
      )}
      {mostrarDetalles && (
        <>
          <Campo etiqueta="Descripción corta (opcional)" name="descripcion" multilinea defaultValue={lugar?.descripcion ?? ""} maxLength={LIMITES_LUGAR.descripcion} ayuda={`Qué es y qué pasa ahí. Hasta ${LIMITES_LUGAR.descripcion} caracteres.`} error={errores.descripcion} />
          <SelectorEnlaces inicial={normalizarRedes(lugar?.redes)} error={errores.enlaces} />
          <div className={styles.campo}>
            <p className={styles.etiqueta}>Foto de portada (opcional)</p>
            {portada && (
              // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
              <img src={portada} alt="" className={styles.portada} />
            )}
            <label className={styles.subir}>
              <input type="file" accept="image/*" onChange={subirPortada} disabled={subiendo} />
              {subiendo ? "Subiendo…" : portada ? "Cambiar foto" : "Elegir una foto"}
            </label>
            {(errorPortada || errores.portada) && (
              <p className={styles.error} role="alert">
                {errorPortada ?? errores.portada}
              </p>
            )}
          </div>
        </>
      )}
      <input type="hidden" name="portada" value={portada ?? ""} />

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
      <Boton type="submit" disabled={enviando || subiendo || recuperando}>
        {enviando ? "Guardando…" : lugar ? "Guardar cambios" : "Publicar lugar"}
      </Boton>
      {esAlta && !listo && <p className={styles.nota}>Con el nombre y la ubicación basta para publicar.</p>}
    </form>
  );
}
