"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import { LIMITES_EVENTO, type Evento } from "@/lib/eventos";
import { isoALocal, sugerirInicio } from "@/lib/fechas";
import SelectorCuando from "./SelectorCuando";
import type { LugarResumen } from "@/lib/lugares";
import { clienteNavegador } from "@/lib/supabase/navegador";
import type { ResultadoEvento } from "./acciones";
import styles from "./FormularioEvento.module.css";

type Props = {
  accion: (previo: ResultadoEvento | null, formData: FormData) => Promise<ResultadoEvento>;
  /** Lugares donde se puede publicar (todos los visibles); el elegido viene del enlace "+ Evento aquí". */
  lugares: LugarResumen[];
  lugarInicial?: string;
  /** Edición o duplicado: valores previos. */
  evento?: Partial<Evento>;
  modo: "alta" | "editar" | "duplicar";
  usuarioId: string;
};

/**
 * Alta de evento con lo mínimo: dónde (ya viene puesto), qué y cuándo. Gratis por defecto.
 * Fecha con el selector nativo del teléfono y un valor sugerido (hoy o mañana a las 19:00).
 */
export default function FormularioEvento({ accion, lugares, lugarInicial, evento, modo, usuarioId }: Props) {
  const [resultado, enviar, enviando] = useActionState<ResultadoEvento | null, FormData>(accion, null);
  const errores = resultado && !resultado.ok ? resultado.errores : {};
  const [lugarId, setLugarId] = useState(evento?.lugar_id ?? lugarInicial ?? (lugares.length === 1 ? lugares[0].id : ""));
  const [inicio, setInicio] = useState(modo === "editar" ? isoALocal(evento?.inicio) : sugerirInicio());
  const [fin, setFin] = useState(modo === "editar" ? isoALocal(evento?.fin) : "");
  const [gratis, setGratis] = useState(!evento?.precio);
  const [imagen, setImagen] = useState<string | null>(evento?.imagen ?? null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorImagen, setErrorImagen] = useState<string | null>(null);
  const [masDetalles, setMasDetalles] = useState(modo !== "alta" || !!evento?.descripcion || !!evento?.enlace);
  const lugar = lugares.find((l) => l.id === lugarId);

  async function subirImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const supabase = clienteNavegador();
    if (!supabase) return;
    if (archivo.size > 5 * 1024 * 1024) {
      setErrorImagen("La imagen pesa más de 5 MB. Elige otra.");
      return;
    }
    setSubiendo(true);
    setErrorImagen(null);
    const extension = (archivo.name.split(".").pop() || "jpg").toLowerCase();
    const ruta = `lugares/${usuarioId}/evento-${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from("fotos").upload(ruta, archivo, { upsert: true, contentType: archivo.type || undefined });
    if (error) setErrorImagen("No se pudo subir la imagen. Intenta con otra.");
    else setImagen(supabase.storage.from("fotos").getPublicUrl(ruta).data.publicUrl);
    setSubiendo(false);
  }

  return (
    <form action={enviar} noValidate>
      {/* Dónde */}
      <div className={styles.campo}>
        <label htmlFor="campo-lugar" className={styles.etiqueta}>
          Dónde
        </label>
        {lugares.length === 0 ? (
          <p className={styles.nota}>
            Todavía no hay lugares registrados. <Link href="/lugares/nuevo">Registra el lugar primero</Link> y luego publica el evento.
          </p>
        ) : (
          <select id="campo-lugar" name="lugar_id" className={styles.select} value={lugarId} onChange={(e) => setLugarId(e.target.value)} aria-invalid={!!errores.lugar_id} required>
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
            ¿No está en la lista? <Link href="/lugares/nuevo">Registra el lugar</Link>.
          </p>
        )}
        {errores.lugar_id && (
          <p className={styles.error} role="alert">
            {errores.lugar_id}
          </p>
        )}
      </div>

      {/* Qué */}
      <Campo etiqueta="Qué" name="titulo" defaultValue={evento?.titulo ?? ""} maxLength={LIMITES_EVENTO.titulo} placeholder="Ej. Noche de jazz" autoComplete="off" autoFocus={modo === "alta"} error={errores.titulo} required />

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
        {!gratis && <Campo etiqueta="Precio" name="precio" defaultValue={evento?.precio ?? ""} maxLength={LIMITES_EVENTO.precio} placeholder="Ej. $150, o $100 estudiantes" inputMode="text" error={errores.precio} />}
      </fieldset>

      {/* Imagen */}
      <div className={styles.campo}>
        <p className={styles.etiqueta}>Cartel o foto (opcional)</p>
        {imagen && (
          // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
          <img src={imagen} alt="" className={styles.imagen} />
        )}
        <label className={styles.subir}>
          <input type="file" accept="image/*" onChange={subirImagen} disabled={subiendo} />
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
          <Campo etiqueta="Descripción (opcional)" name="descripcion" multilinea defaultValue={evento?.descripcion ?? ""} maxLength={LIMITES_EVENTO.descripcion} ayuda={`Hasta ${LIMITES_EVENTO.descripcion} caracteres.`} error={errores.descripcion} />
          <Campo etiqueta="Enlace (opcional)" name="enlace" defaultValue={evento?.enlace ?? ""} placeholder="Boletos, más información…" inputMode="url" autoCapitalize="none" autoComplete="off" error={errores.enlace} />
        </>
      )}

      {resultado && !resultado.ok && resultado.general && (
        <p className="aviso-error" role="alert">
          {resultado.general}
        </p>
      )}
      <Boton type="submit" disabled={enviando || subiendo || lugares.length === 0}>
        {enviando ? "Guardando…" : modo === "editar" ? "Guardar cambios" : "Publicar evento"}
      </Boton>
    </form>
  );
}
