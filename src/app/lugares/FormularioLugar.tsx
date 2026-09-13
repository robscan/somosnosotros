"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import Mapa from "@/components/Mapa";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import { CIUDAD_INICIAL } from "@/lib/ciudad";
import { configPublica } from "@/lib/config";
import { buscarDirecciones, type Sugerencia } from "@/lib/geocodificar";
import { LIMITES_LUGAR, REDES, TIPOS, etiquetaTipo, type Lugar } from "@/lib/lugares";
import { clienteNavegador } from "@/lib/supabase/navegador";
import type { ResultadoLugar } from "./acciones";
import styles from "./FormularioLugar.module.css";

type Props = {
  accion: (previo: ResultadoLugar | null, formData: FormData) => Promise<ResultadoLugar>;
  lugar?: Lugar;
  usuarioId: string;
};

export default function FormularioLugar({ accion, lugar, usuarioId }: Props) {
  const [resultado, enviar, enviando] = useActionState<ResultadoLugar | null, FormData>(accion, null);
  const errores = resultado && !resultado.ok ? resultado.errores : {};
  const parecidos = resultado && !resultado.ok ? resultado.parecidos : undefined;

  const [direccion, setDireccion] = useState(lugar?.direccion ?? "");
  const [punto, setPunto] = useState<{ lat: number; lng: number } | null>(lugar ? { lat: lugar.lat, lng: lugar.lng } : null);
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [buscando, setBuscando] = useState(false);
  const ultimaBusqueda = useRef("");
  const [portada, setPortada] = useState<string | null>(lugar?.portada ?? null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorPortada, setErrorPortada] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);

  // Autocompletado: espera 350 ms tras dejar de escribir; una sola búsqueda por texto.
  useEffect(() => {
    const texto = direccion.trim();
    if (texto.length < 3 || texto === ultimaBusqueda.current) return;
    const { mapboxToken } = configPublica();
    if (!mapboxToken) return;
    const t = setTimeout(async () => {
      ultimaBusqueda.current = texto;
      setBuscando(true);
      try {
        setSugerencias(await buscarDirecciones(texto, mapboxToken, CIUDAD_INICIAL.centro));
      } finally {
        setBuscando(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [direccion]);

  function elegir(s: Sugerencia) {
    ultimaBusqueda.current = s.direccion;
    setDireccion(s.direccion);
    setPunto({ lat: s.lat, lng: s.lng });
    setSugerencias([]);
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
    const extension = (archivo.name.split(".").pop() || "jpg").toLowerCase();
    const ruta = `lugares/${usuarioId}/portada-${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from("fotos").upload(ruta, archivo, { upsert: true, contentType: archivo.type || undefined });
    if (error) setErrorPortada("No se pudo subir la foto. Intenta con otra.");
    else setPortada(supabase.storage.from("fotos").getPublicUrl(ruta).data.publicUrl);
    setSubiendo(false);
  }

  return (
    <form action={enviar} noValidate className={styles.formulario}>
      <Campo etiqueta="Nombre del lugar" name="nombre" defaultValue={lugar?.nombre ?? ""} maxLength={LIMITES_LUGAR.nombre} error={errores.nombre} required autoComplete="off" />

      <div className={styles.campo}>
        <label htmlFor="campo-tipo" className={styles.etiqueta}>
          Tipo
        </label>
        <select id="campo-tipo" name="tipo" className={styles.select} defaultValue={lugar?.tipo ?? ""} aria-invalid={!!errores.tipo} required>
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

      <div className={styles.campo}>
        <Campo
          etiqueta="Dirección"
          name="direccion"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          maxLength={LIMITES_LUGAR.direccion}
          placeholder="Calle y número, colonia"
          autoComplete="off"
          ayuda={buscando ? "Buscando…" : "Escribe y elige una opción; luego ajusta el pin."}
          error={errores.direccion}
        />
        {sugerencias.length > 0 && (
          <ul className={styles.sugerencias} role="listbox" aria-label="Direcciones encontradas">
            {sugerencias.map((s) => (
              <li key={`${s.lat},${s.lng},${s.direccion}`}>
                <button type="button" className={styles.sugerencia} onClick={() => elegir(s)} role="option" aria-selected={false}>
                  {s.direccion}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.campo}>
        <p className={styles.etiqueta}>Ubicación en el mapa</p>
        <Mapa modo="elegir" valor={punto} onCambio={setPunto} />
        <input type="hidden" name="lat" value={punto?.lat ?? ""} />
        <input type="hidden" name="lng" value={punto?.lng ?? ""} />
        {errores.ubicacion && (
          <p className={styles.error} role="alert">
            {errores.ubicacion}
          </p>
        )}
      </div>

      <Campo etiqueta="Descripción corta (opcional)" name="descripcion" multilinea defaultValue={lugar?.descripcion ?? ""} maxLength={LIMITES_LUGAR.descripcion} ayuda={`Qué es y qué pasa ahí. Hasta ${LIMITES_LUGAR.descripcion} caracteres.`} error={errores.descripcion} />

      <fieldset className={styles.grupo}>
        <legend className={styles.etiqueta}>Redes y contacto (opcional)</legend>
        {REDES.map((r) => (
          <Campo key={r.clave} etiqueta={r.etiqueta} name={r.clave} defaultValue={lugar?.redes?.[r.clave] ?? ""} ayuda={r.ayuda} error={errores[r.clave]} autoComplete="off" autoCapitalize="none" inputMode={r.clave === "whatsapp" ? "tel" : "url"} />
        ))}
      </fieldset>

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
        <input type="hidden" name="portada" value={portada ?? ""} />
        {(errorPortada || errores.portada) && (
          <p className={styles.error} role="alert">
            {errorPortada ?? errores.portada}
          </p>
        )}
      </div>

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
      <Boton type="submit" disabled={enviando || subiendo}>
        {enviando ? "Guardando…" : lugar ? "Guardar cambios" : "Publicar lugar"}
      </Boton>
    </form>
  );
}
