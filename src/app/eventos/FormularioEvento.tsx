"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import Mapa from "@/components/Mapa";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import { LIMITES_EVENTO, REVELAR_OPCIONES, type Evento, type ModoSitio, type SitioPrivado } from "@/lib/eventos";
import { isoALocal, sugerirInicio } from "@/lib/fechas";
import type { LugarResumen } from "@/lib/lugares";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { leerCartelAccion, type ResultadoEvento } from "./acciones";
import SelectorCuando from "./SelectorCuando";
import styles from "./FormularioEvento.module.css";

type Punto = { lat: number; lng: number };
type Props = {
  accion: (previo: ResultadoEvento | null, formData: FormData) => Promise<ResultadoEvento>;
  lugares: LugarResumen[];
  lugarInicial?: string;
  evento?: Partial<Evento>;
  /** Dirección reservada existente (solo llega al autor o al admin al editar). */
  privado?: SitioPrivado | null;
  modo: "alta" | "editar" | "duplicar";
  usuarioId: string;
  /** Hay llave de API en el servidor: se ofrece leer el cartel. */
  cartelActivo?: boolean;
};

/**
 * Alta de evento con lo mínimo: dónde, qué y cuándo. Gratis por defecto.
 * Si hay cartel, se lee primero y el formulario aparece lleno para revisar.
 * Dónde: un lugar registrado, otro sitio (público) o un sitio reservado (dirección con condiciones).
 */
export default function FormularioEvento({ accion, lugares, lugarInicial, evento, privado, modo, usuarioId, cartelActivo = false }: Props) {
  const [resultado, enviar, enviando] = useActionState<ResultadoEvento | null, FormData>(accion, null);
  const errores = resultado && !resultado.ok ? resultado.errores : {};

  const modoInicial: ModoSitio = evento?.sitio_reservado ? "reservado" : evento?.sitio_texto ? "otro" : "lugar";
  const [modoSitio, setModoSitio] = useState<ModoSitio>(modoInicial);
  const [lugarId, setLugarId] = useState(evento?.lugar_id ?? lugarInicial ?? (lugares.length === 1 ? lugares[0].id : ""));
  const [sitioTexto, setSitioTexto] = useState(evento?.sitio_texto ?? "");
  const [sitioPunto, setSitioPunto] = useState<Punto | null>(evento?.sitio_lat != null && evento?.sitio_lng != null ? { lat: evento.sitio_lat, lng: evento.sitio_lng } : null);
  const [direccionPrivada, setDireccionPrivada] = useState(privado?.direccion ?? "");
  const [indicaciones, setIndicaciones] = useState(privado?.indicaciones ?? "");
  const [privadoPunto, setPrivadoPunto] = useState<Punto | null>(privado?.lat != null && privado?.lng != null ? { lat: privado.lat, lng: privado.lng } : null);
  const [revelarHoras, setRevelarHoras] = useState<number>(() => {
    if (evento?.sitio_revelar_desde && evento?.inicio) {
      const h = Math.round((new Date(evento.inicio).getTime() - new Date(evento.sitio_revelar_desde).getTime()) / 3600000);
      return REVELAR_OPCIONES.some((o) => o.horas === h) ? h : 24;
    }
    return 24;
  });
  const [titulo, setTitulo] = useState(evento?.titulo ?? "");
  const [inicio, setInicio] = useState(modo === "editar" ? isoALocal(evento?.inicio) : sugerirInicio());
  const [fin, setFin] = useState(modo === "editar" ? isoALocal(evento?.fin) : "");
  const [gratis, setGratis] = useState(!evento?.precio);
  const [precio, setPrecio] = useState(evento?.precio ?? "");
  const [descripcion, setDescripcion] = useState(evento?.descripcion ?? "");
  const [enlace, setEnlace] = useState(evento?.enlace ?? "");
  const [imagen, setImagen] = useState<string | null>(evento?.imagen ?? null);
  const [subiendo, setSubiendo] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const [avisoCartel, setAvisoCartel] = useState<string | null>(null);
  const [errorImagen, setErrorImagen] = useState<string | null>(null);
  const [masDetalles, setMasDetalles] = useState(modo !== "alta" || !!evento?.descripcion || !!evento?.enlace);
  const lugar = lugares.find((l) => l.id === lugarId);
  const ofrecerCartel = cartelActivo && modo === "alta";

  async function subir(archivo: File): Promise<string | null> {
    const supabase = clienteNavegador();
    if (!supabase) return null;
    if (archivo.size > 5 * 1024 * 1024) {
      setErrorImagen("La imagen pesa más de 5 MB. Elige otra.");
      return null;
    }
    setSubiendo(true);
    setErrorImagen(null);
    const extension = (archivo.name.split(".").pop() || "jpg").toLowerCase();
    const ruta = `lugares/${usuarioId}/evento-${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from("fotos").upload(ruta, archivo, { upsert: true, contentType: archivo.type || undefined });
    setSubiendo(false);
    if (error) {
      setErrorImagen("No se pudo subir la imagen. Intenta con otra.");
      return null;
    }
    const url = supabase.storage.from("fotos").getPublicUrl(ruta).data.publicUrl;
    setImagen(url);
    return url;
  }

  async function subirImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (archivo) await subir(archivo);
  }

  /** Cartel → se sube, se lee y el formulario se llena. La persona revisa y publica. */
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
      if (v.descripcion) {
        setDescripcion(v.descripcion);
        setMasDetalles(true);
      }
      if (v.enlace) {
        setEnlace(v.enlace);
        setMasDetalles(true);
      }
      if (r.lugarId) {
        setModoSitio("lugar");
        setLugarId(r.lugarId);
      } else if (v.lugar || v.direccion) {
        setModoSitio("otro");
        setSitioTexto([v.lugar, v.direccion].filter(Boolean).join(" · ").slice(0, LIMITES_EVENTO.sitio));
      }
      const faltan = [!v.titulo && "el título", !v.inicio && "la fecha", !r.lugarId && !v.lugar && "el lugar"].filter(Boolean);
      setAvisoCartel(faltan.length ? `Leí el cartel. Revisa ${faltan.join(", ")} y publica.` : "Leí el cartel. Revisa que todo esté bien y publica.");
    } finally {
      setLeyendo(false);
    }
  }

  return (
    <form action={enviar} noValidate>
      {ofrecerCartel && (
        <div className={styles.cartel}>
          <label className={`${styles.subir} ${styles.subirCartel}`}>
            <input type="file" accept="image/*" onChange={leerCartel} disabled={subiendo || leyendo} />
            {leyendo ? "Leyendo el cartel…" : subiendo ? "Subiendo…" : "¿Tienes el cartel? Súbelo y llenamos el evento"}
          </label>
          {avisoCartel && (
            <p className={styles.nota} role="status">
              {avisoCartel}
            </p>
          )}
        </div>
      )}

      {/* Dónde */}
      <fieldset className={styles.campo}>
        <legend className={styles.etiqueta}>Dónde</legend>
        <div className={styles.opciones}>
          {(
            [
              ["lugar", "Un lugar registrado"],
              ["otro", "Otro sitio"],
              ["reservado", "Sitio reservado"],
            ] as [ModoSitio, string][]
          ).map(([valor, etiqueta]) => (
            <label key={valor} className={`${styles.opcion} ${modoSitio === valor ? styles.opcionActiva : ""}`}>
              <input type="radio" name="modo_sitio" value={valor} checked={modoSitio === valor} onChange={() => setModoSitio(valor)} /> {etiqueta}
            </label>
          ))}
        </div>

        {modoSitio === "lugar" && (
          <>
            {lugares.length === 0 ? (
              <p className={styles.nota}>
                Todavía no hay lugares registrados. <Link href="/lugares/nuevo">Registra el lugar</Link>, o elige “Otro sitio”.
              </p>
            ) : (
              <select name="lugar_id" className={styles.select} value={lugarId} onChange={(e) => setLugarId(e.target.value)} aria-label="Lugar" aria-invalid={!!errores.lugar_id}>
                <option value="" disabled>
                  Elige el lugar
                </option>
                {lugares.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}
                  </option>
                ))}
              </select>
            )}
            {lugar?.direccion && <p className={styles.nota}>{lugar.direccion}</p>}
            {lugares.length > 0 && (
              <p className={styles.nota}>
                ¿No está en la lista? <Link href="/lugares/nuevo">Registra el lugar</Link> o elige “Otro sitio”.
              </p>
            )}
            {errores.lugar_id && (
              <p className={styles.error} role="alert">
                {errores.lugar_id}
              </p>
            )}
          </>
        )}

        {modoSitio === "otro" && (
          <>
            <Campo etiqueta="Sitio" name="sitio_texto" value={sitioTexto} onChange={(e) => setSitioTexto(e.target.value)} maxLength={LIMITES_EVENTO.sitio} placeholder="Ej. Plaza de Armas, Calle Zaragoza 20" autoComplete="off" ayuda="Se muestra a todo el mundo." error={errores.sitio_texto} />
            <p className={styles.etiquetaChica}>Pin en el mapa (opcional)</p>
            <Mapa modo="elegir" valor={sitioPunto} onCambio={setSitioPunto} />
            <input type="hidden" name="sitio_lat" value={sitioPunto?.lat ?? ""} />
            <input type="hidden" name="sitio_lng" value={sitioPunto?.lng ?? ""} />
          </>
        )}

        {modoSitio === "reservado" && (
          <>
            <p className={styles.nota}>El evento se anuncia; la dirección exacta se guarda aparte y solo la ven las personas registradas cuando tú digas. Tú y el administrador la ven siempre.</p>
            <Campo etiqueta="Cómo se anuncia" name="sitio_texto" value={sitioTexto} onChange={(e) => setSitioTexto(e.target.value)} maxLength={LIMITES_EVENTO.sitio} placeholder="Ej. Casa en Tequis, Centro histórico" autoComplete="off" ayuda="Esto sí lo ve todo el mundo." error={errores.sitio_texto} />
            <Campo etiqueta="Dirección exacta (reservada)" name="direccion_privada" value={direccionPrivada} onChange={(e) => setDireccionPrivada(e.target.value)} maxLength={LIMITES_EVENTO.direccion} placeholder="Calle y número, colonia" autoComplete="off" error={errores.direccion_privada} />
            <Campo etiqueta="Indicaciones (opcional, reservadas)" name="indicaciones" value={indicaciones} onChange={(e) => setIndicaciones(e.target.value)} maxLength={LIMITES_EVENTO.indicaciones} placeholder="Ej. Tocar el timbre azul, portón verde" autoComplete="off" />
            <p className={styles.etiquetaChica}>Pin exacto (opcional, reservado)</p>
            <Mapa modo="elegir" valor={privadoPunto} onCambio={setPrivadoPunto} />
            <input type="hidden" name="privado_lat" value={privadoPunto?.lat ?? ""} />
            <input type="hidden" name="privado_lng" value={privadoPunto?.lng ?? ""} />
            <label htmlFor="campo-revelar" className={styles.etiquetaChica}>
              Se revela a las personas registradas
            </label>
            <select id="campo-revelar" name="revelar_horas" className={styles.select} value={revelarHoras} onChange={(e) => setRevelarHoras(Number(e.target.value))}>
              {REVELAR_OPCIONES.map((o) => (
                <option key={o.horas} value={o.horas}>
                  {o.etiqueta}
                </option>
              ))}
            </select>
          </>
        )}
      </fieldset>

      {/* Qué */}
      <Campo etiqueta="Qué" name="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={LIMITES_EVENTO.titulo} placeholder="Ej. Noche de jazz" autoComplete="off" autoFocus={modo === "alta" && !ofrecerCartel} error={errores.titulo} required />

      {/* Cuándo */}
      <SelectorCuando inicio={inicio} fin={fin} onCambio={(i, f) => { setInicio(i); setFin(f); }} errorInicio={errores.inicio} errorFin={errores.fin} />

      {/* Cuánto */}
      <fieldset className={styles.campo}>
        <legend className={styles.etiqueta}>Cuánto</legend>
        <div className={styles.opciones}>
          <label className={`${styles.opcion} ${gratis ? styles.opcionActiva : ""}`}>
            <input type="radio" name="gratis" value="si" checked={gratis} onChange={() => setGratis(true)} /> Gratis
          </label>
          <label className={`${styles.opcion} ${!gratis ? styles.opcionActiva : ""}`}>
            <input type="radio" name="gratis" value="no" checked={!gratis} onChange={() => setGratis(false)} /> Con costo
          </label>
        </div>
        {!gratis && <Campo etiqueta="Precio" name="precio" value={precio} onChange={(e) => setPrecio(e.target.value)} maxLength={LIMITES_EVENTO.precio} placeholder="Ej. $150, o $100 estudiantes" inputMode="text" error={errores.precio} />}
      </fieldset>

      {/* Imagen */}
      <div className={styles.campo}>
        <p className={styles.etiqueta}>Cartel o foto (opcional)</p>
        {imagen && (
          // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
          <img src={imagen} alt="" className={styles.imagen} />
        )}
        <label className={styles.subir}>
          <input type="file" accept="image/*" onChange={subirImagen} disabled={subiendo || leyendo} />
          {subiendo ? "Subiendo…" : imagen ? "Cambiar imagen" : "Elegir una imagen"}
        </label>
        <input type="hidden" name="imagen" value={imagen ?? ""} />
        {(errorImagen || errores.imagen) && (
          <p className={styles.error} role="alert">
            {errorImagen ?? errores.imagen}
          </p>
        )}
      </div>

      {!masDetalles ? (
        <button type="button" className={styles.desplegar} onClick={() => setMasDetalles(true)}>
          + Agregar descripción o enlace (opcional)
        </button>
      ) : (
        <>
          <Campo etiqueta="Descripción (opcional)" name="descripcion" multilinea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={LIMITES_EVENTO.descripcion} ayuda={`Hasta ${LIMITES_EVENTO.descripcion} caracteres.`} error={errores.descripcion} />
          <Campo etiqueta="Enlace (opcional)" name="enlace" value={enlace} onChange={(e) => setEnlace(e.target.value)} placeholder="Boletos, más información…" inputMode="url" autoCapitalize="none" autoComplete="off" error={errores.enlace} />
        </>
      )}

      {resultado && !resultado.ok && resultado.general && (
        <p className="aviso-error" role="alert">
          {resultado.general}
        </p>
      )}
      <Boton type="submit" disabled={enviando || subiendo || leyendo}>
        {enviando ? "Guardando…" : modo === "editar" ? "Guardar cambios" : "Publicar evento"}
      </Boton>
    </form>
  );
}
