"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import Mapa from "@/components/Mapa";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Seccion from "@/components/ui/Seccion";
import type { ArtistaResumen, QuienItem } from "@/lib/artistas";
import { unirNombres } from "@/lib/artistas";
import { LIMITES_EVENTO, REVELAR_OPCIONES, type Evento, type ModoSitio, type SitioPrivado } from "@/lib/eventos";
import { formatearCuando, isoALocal, localAIso, sugerirInicio } from "@/lib/fechas";
import type { LugarResumen } from "@/lib/lugares";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { reducirImagen } from "@/lib/imagen";
import { leerCartelAccion, type ResultadoEvento } from "./acciones";
import SelectorCuando from "./SelectorCuando";
import SelectorQuien from "./SelectorQuien";
import seccion from "@/components/ui/Seccion.module.css";
import styles from "./FormularioEvento.module.css";

type Punto = { lat: number; lng: number };
type Seccion = "donde" | "cuando" | "quien" | "cuanto" | null;
type Props = {
  accion: (previo: ResultadoEvento | null, formData: FormData) => Promise<ResultadoEvento>;
  lugares: LugarResumen[];
  lugarInicial?: string;
  evento?: Partial<Evento>;
  privado?: SitioPrivado | null;
  modo: "alta" | "editar" | "duplicar";
  usuarioId: string;
  cartelActivo?: boolean;
  /** Quién se presenta, ya resuelto: al editar o duplicar, o al venir de la ficha de un artista. */
  quienInicial?: QuienItem[];
  /** Artistas ligados a mi cuenta: si es uno solo, Quién ya viene resuelto con él (decisión 12). */
  mios?: ArtistaResumen[];
};

/**
 * Alta de evento con una cosa a la vez: el título, y tres renglones ya resueltos (cuándo, dónde, cuánto)
 * que se abren solo para cambiarlos. Cartel, foto, descripción y enlace van en "Más detalles".
 * Si al publicar falta algo, se abre solo el renglón que lo necesita.
 */
export default function FormularioEvento({ accion, lugares, lugarInicial, evento, privado, modo, usuarioId, cartelActivo = false, quienInicial, mios = [] }: Props) {
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
  const [quien, setQuien] = useState<QuienItem[]>(quienInicial ?? (modo === "alta" && mios.length === 1 ? [{ id: mios[0].id, nombre: mios[0].nombre }] : []));
  const [masDetalles, setMasDetalles] = useState(modo === "editar" && !!(evento?.descripcion || evento?.enlace || evento?.imagen));
  const [seccionElegida, setSeccionElegida] = useState<Seccion | undefined>(undefined);

  const lugar = lugares.find((l) => l.id === lugarId);
  const ofrecerCartel = cartelActivo && modo === "alta";
  const dondeResuelto = modoSitio === "lugar" ? !!lugar : !!sitioTexto && (modoSitio !== "reservado" || !!direccionPrivada);
  const errorDonde = !!(errores.lugar_id || errores.sitio_texto || errores.direccion_privada);
  const errorCuando = !!(errores.inicio || errores.fin);
  const errorCuanto = !!errores.precio;

  // Qué renglón está abierto: el que la persona tocó; si no, el que tiene error; si no, "dónde" si falta.
  const abierta: Seccion = seccionElegida !== undefined ? seccionElegida : errorDonde ? "donde" : errorCuando ? "cuando" : errorCuanto ? "cuanto" : dondeResuelto ? null : "donde";
  const abrir = (s: Seccion) => setSeccionElegida(abierta === s ? null : s);

  const resumenDonde = modoSitio === "lugar" ? (lugar?.nombre ?? "Elige el lugar") : modoSitio === "otro" ? sitioTexto || "Otro sitio" : `${sitioTexto || "Sitio reservado"} · reservado`;
  const inicioIso = localAIso(inicio);
  const resumenCuando = inicioIso ? formatearCuando(inicioIso, fin ? localAIso(fin) : null) : "Elige cuándo";
  const resumenCuanto = gratis ? "Gratis" : precio || "Con costo";
  const resumenQuien = quien.length ? unirNombres(quien.map((q) => (q.id && mios.some((m) => m.id === q.id) ? `${q.nombre} · tú` : q.nombre))) : <span className={seccion.pendiente}>Añadir quién se presenta</span>;

  async function subir(archivo: File): Promise<string | null> {
    const supabase = clienteNavegador();
    if (!supabase) return null;
    if (archivo.size > 5 * 1024 * 1024) {
      setErrorImagen("La imagen pesa más de 5 MB. Elige otra.");
      return null;
    }
    setSubiendo(true);
    setErrorImagen(null);
    const listo = await reducirImagen(archivo); // menos peso y menos espera: se reduce en el teléfono antes de subir
    const extension = (listo.name.split(".").pop() || "jpg").toLowerCase();
    const ruta = `lugares/${usuarioId}/evento-${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from("fotos").upload(ruta, listo, { upsert: true, contentType: listo.type || undefined });
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
      if (v.descripcion) setDescripcion(v.descripcion);
      if (v.enlace) setEnlace(v.enlace);
      if (r.quien.length) setQuien(r.quien);
      if (r.lugarId) {
        setModoSitio("lugar");
        setLugarId(r.lugarId);
      } else if (v.lugar || v.direccion) {
        setModoSitio("otro");
        setSitioTexto([v.lugar, v.direccion].filter(Boolean).join(" · ").slice(0, LIMITES_EVENTO.sitio));
      }
      setSeccionElegida(undefined);
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
          <label className={styles.enlaceCartel}>
            <input type="file" accept="image/*" onChange={leerCartel} disabled={subiendo || leyendo} />
            {leyendo ? "Leyendo el cartel…" : subiendo ? "Subiendo…" : "¿Tienes el cartel? Súbelo y llenamos todo"}
          </label>
          {avisoCartel && (
            <p className={styles.nota} role="status">
              {avisoCartel}
            </p>
          )}
        </div>
      )}

      <Campo etiqueta="Qué" name="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={LIMITES_EVENTO.titulo} placeholder="Ej. Noche de jazz" autoComplete="off" autoFocus={modo === "alta"} error={errores.titulo} required />

      {/* Cuándo */}
      <Seccion titulo="Cuándo" resumen={resumenCuando} abierta={abierta === "cuando"} onAbrir={() => abrir("cuando")} error={errorCuando}>
        <SelectorCuando inicio={inicio} fin={fin} onCambio={(i, f) => { setInicio(i); setFin(f); }} errorInicio={errores.inicio} errorFin={errores.fin} />
      </Seccion>

      {/* Dónde */}
      <Seccion titulo="Dónde" resumen={resumenDonde} abierta={abierta === "donde"} onAbrir={() => abrir("donde")} error={errorDonde}>
        <input type="hidden" name="modo_sitio" value={modoSitio} />
        {modoSitio === "lugar" && (
          <>
            {lugares.length === 0 ? (
              <p className={styles.nota}>
                Todavía no hay lugares registrados. <Link href="/lugares/nuevo">Registra el lugar</Link>, o elige otro sitio abajo.
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
            {errores.lugar_id && (
              <p className={styles.error} role="alert">
                {errores.lugar_id}
              </p>
            )}
            <p className={styles.nota}>
              ¿No está en la lista? <Link href="/lugares/nuevo">Regístralo</Link>.
            </p>
            <div className={styles.pildoras}>
              <button type="button" className={styles.pildora} onClick={() => setModoSitio("otro")}>
                Es en otro sitio
              </button>
              <button type="button" className={styles.pildora} onClick={() => setModoSitio("reservado")}>
                Sitio reservado
              </button>
            </div>
          </>
        )}

        {modoSitio === "otro" && (
          <>
            <Campo etiqueta="Sitio" name="sitio_texto" value={sitioTexto} onChange={(e) => setSitioTexto(e.target.value)} maxLength={LIMITES_EVENTO.sitio} placeholder="Ej. Plaza de Armas" autoComplete="off" error={errores.sitio_texto} autoFocus />
            <p className={styles.etiquetaChica}>Pin en el mapa (opcional)</p>
            <Mapa modo="elegir" valor={sitioPunto} onCambio={setSitioPunto} />
            <input type="hidden" name="sitio_lat" value={sitioPunto?.lat ?? ""} />
            <input type="hidden" name="sitio_lng" value={sitioPunto?.lng ?? ""} />
            <div className={styles.pildoras}>
              <button type="button" className={styles.pildora} onClick={() => setModoSitio("lugar")}>
                Mejor un lugar registrado
              </button>
              <button type="button" className={styles.pildora} onClick={() => setModoSitio("reservado")}>
                Sitio reservado
              </button>
            </div>
          </>
        )}

        {modoSitio === "reservado" && (
          <>
            <Campo etiqueta="Cómo se anuncia" name="sitio_texto" value={sitioTexto} onChange={(e) => setSitioTexto(e.target.value)} maxLength={LIMITES_EVENTO.sitio} placeholder="Ej. Casa en Tequis" autoComplete="off" ayuda="Esto lo ve todo el mundo." error={errores.sitio_texto} autoFocus />
            <Campo etiqueta="Dirección exacta" name="direccion_privada" value={direccionPrivada} onChange={(e) => setDireccionPrivada(e.target.value)} maxLength={LIMITES_EVENTO.direccion} placeholder="Calle y número, colonia" autoComplete="off" ayuda="Solo la ven las personas registradas cuando toque; tú y el administrador, siempre." error={errores.direccion_privada} />
            <label htmlFor="campo-revelar" className={styles.etiquetaChica}>
              Se revela
            </label>
            <select id="campo-revelar" name="revelar_horas" className={styles.select} value={revelarHoras} onChange={(e) => setRevelarHoras(Number(e.target.value))}>
              {REVELAR_OPCIONES.map((o) => (
                <option key={o.horas} value={o.horas}>
                  {o.etiqueta}
                </option>
              ))}
            </select>
            <Campo etiqueta="Indicaciones (opcional)" name="indicaciones" value={indicaciones} onChange={(e) => setIndicaciones(e.target.value)} maxLength={LIMITES_EVENTO.indicaciones} placeholder="Ej. Portón verde, tocar dos veces" autoComplete="off" />
            <p className={styles.etiquetaChica}>Pin exacto (opcional)</p>
            <Mapa modo="elegir" valor={privadoPunto} onCambio={setPrivadoPunto} />
            <input type="hidden" name="privado_lat" value={privadoPunto?.lat ?? ""} />
            <input type="hidden" name="privado_lng" value={privadoPunto?.lng ?? ""} />
            <div className={styles.pildoras}>
              <button type="button" className={styles.pildora} onClick={() => setModoSitio("lugar")}>
                Mejor un lugar registrado
              </button>
              <button type="button" className={styles.pildora} onClick={() => setModoSitio("otro")}>
                Otro sitio, público
              </button>
            </div>
          </>
        )}
      </Seccion>

      {/* Quién: opcional, no detiene la publicación (Artistas, decisión 12) */}
      <Seccion titulo="Quién" resumen={resumenQuien} abierta={abierta === "quien"} onAbrir={() => abrir("quien")} accion={quien.length ? "Cambiar" : "Añadir"}>
        <SelectorQuien valor={quien} onCambio={setQuien} mios={mios} />
      </Seccion>
      <input type="hidden" name="quien" value={JSON.stringify(quien)} />

      {/* Cuánto */}
      <Seccion titulo="Cuánto" resumen={resumenCuanto} abierta={abierta === "cuanto"} onAbrir={() => abrir("cuanto")} error={errorCuanto}>
        <div className={styles.opciones}>
          <label className={`${styles.opcion} ${gratis ? styles.opcionActiva : ""}`}>
            <input type="radio" name="gratis" value="si" checked={gratis} onChange={() => setGratis(true)} /> Gratis
          </label>
          <label className={`${styles.opcion} ${!gratis ? styles.opcionActiva : ""}`}>
            <input type="radio" name="gratis" value="no" checked={!gratis} onChange={() => setGratis(false)} /> Con costo
          </label>
        </div>
        {!gratis && <Campo etiqueta="Precio" name="precio" value={precio} onChange={(e) => setPrecio(e.target.value)} maxLength={LIMITES_EVENTO.precio} placeholder="Ej. $150, o $100 estudiantes" inputMode="text" error={errores.precio} autoFocus />}
      </Seccion>

      {/* Más detalles */}
      {!masDetalles ? (
        <button type="button" className={styles.desplegar} onClick={() => setMasDetalles(true)}>
          + Más detalles: {imagen ? "imagen" : "cartel o foto"}, descripción, enlace
        </button>
      ) : (
        <div className={styles.detalles}>
          <div className={styles.campo}>
            <p className={styles.etiqueta}>Cartel o foto</p>
            {imagen && (
              // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
              <img src={imagen} alt="" className={styles.imagen} />
            )}
            <label className={styles.subir}>
              <input type="file" accept="image/*" onChange={subirImagen} disabled={subiendo || leyendo} />
              {subiendo ? "Subiendo…" : imagen ? "Cambiar imagen" : "Elegir una imagen"}
            </label>
            {(errorImagen || errores.imagen) && (
              <p className={styles.error} role="alert">
                {errorImagen ?? errores.imagen}
              </p>
            )}
          </div>
          <Campo etiqueta="Descripción" name="descripcion" multilinea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={LIMITES_EVENTO.descripcion} error={errores.descripcion} />
          <Campo etiqueta="Enlace" name="enlace" value={enlace} onChange={(e) => setEnlace(e.target.value)} placeholder="Boletos, más información…" inputMode="url" autoCapitalize="none" autoComplete="off" error={errores.enlace} />
        </div>
      )}
      <input type="hidden" name="imagen" value={imagen ?? ""} />
      {!masDetalles && (
        <>
          <input type="hidden" name="descripcion" value={descripcion} />
          <input type="hidden" name="enlace" value={enlace} />
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
