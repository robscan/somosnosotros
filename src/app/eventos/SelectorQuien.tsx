"use client";

import { useEffect, useRef, useState } from "react";
import { IconoCerrar, IconoMas } from "@/components/ui/Iconos";
import { artistaIgual, etiquetaArtista, type ArtistaResumen, type QuienItem } from "@/lib/artistas";
import { SIN_FOTO } from "@/lib/imagen";
import { normalizarNombre } from "@/lib/lugares";
import { clienteNavegador } from "@/lib/supabase/navegador";
import Limpiar from "@/components/ui/Limpiar";
import limpiar from "@/components/ui/Limpiar.module.css";
import sug from "@/components/ui/Sugerencia.module.css";
import styles from "./SelectorQuien.module.css";

type Props = {
  valor: QuienItem[];
  onCambio: (v: QuienItem[]) => void;
  /** Artistas ligados a mi cuenta: salen primero en las sugerencias y se marcan "· tú". */
  mios: ArtistaResumen[];
};

const MIN_LETRAS = 2;

/**
 * Quién se presenta (Artistas, decisión 12): los elegidos como fichas con ✕, un campo que sugiere
 * a partir de dos letras (los míos primero, luego por nombre) y, si no coincide exacto, "Crear a «…»".
 * El artista nuevo no se crea aquí: viaja con el nombre y se crea al publicar (sin huérfanos si se abandona).
 */
export default function SelectorQuien({ valor, onCambio, mios }: Props) {
  const [texto, setTexto] = useState("");
  const [encontrados, setEncontrados] = useState<ArtistaResumen[]>([]);
  const [buscando, setBuscando] = useState(false);
  const ultima = useRef("");

  useEffect(() => {
    const q = texto.trim();
    if (q.length < MIN_LETRAS) return; // lo encontrado antes se ignora en el render mientras el texto sea corto
    const t = setTimeout(async () => {
      const supabase = clienteNavegador();
      if (!supabase) return;
      ultima.current = q;
      setBuscando(true);
      try {
        const { data } = await supabase.rpc("artistas_con_nombre", { p_nombre: q });
        if (ultima.current === q) setEncontrados((data ?? []) as ArtistaResumen[]);
      } finally {
        setBuscando(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [texto]);

  const q = normalizarNombre(texto);
  const elegidosIds = new Set(valor.map((v) => v.id).filter(Boolean));
  const elegidosNombres = new Set(valor.map((v) => normalizarNombre(v.nombre)));
  const miosQueCoinciden = q.length >= MIN_LETRAS ? mios.filter((m) => normalizarNombre(m.nombre).includes(q)) : [];
  const encontradosVigentes = q.length >= MIN_LETRAS ? encontrados.filter((a) => normalizarNombre(a.nombre).includes(q)) : [];
  const sugerencias = [...miosQueCoinciden, ...encontradosVigentes.filter((a) => !miosQueCoinciden.some((m) => m.id === a.id))]
    .filter((a) => !elegidosIds.has(a.id) && !elegidosNombres.has(normalizarNombre(a.nombre)))
    .slice(0, 5);
  const exacto = q.length >= MIN_LETRAS && (artistaIgual(sugerencias, texto) || artistaIgual(mios, texto) || elegidosNombres.has(q));
  const ofrecerCrear = q.length >= MIN_LETRAS && !buscando && !exacto;
  const esMio = (id?: string) => !!id && mios.some((m) => m.id === id);

  function elegir(a: ArtistaResumen) {
    onCambio([...valor, { id: a.id, nombre: a.nombre }]);
    setTexto("");
  }
  function crear() {
    const nombre = texto.trim().replace(/\s+/g, " ");
    if (!nombre) return;
    onCambio([...valor, { nombre }]);
    setTexto("");
  }
  function quitar(item: QuienItem) {
    onCambio(valor.filter((v) => v !== item));
  }

  return (
    <div className={styles.selector}>
      {valor.length > 0 && (
        <div className={styles.elegidos} role="list" aria-label="Quién se presenta">
          {valor.map((item) => (
            <button key={item.id ?? item.nombre} type="button" role="listitem" className={styles.elegido} onClick={() => quitar(item)} aria-label={`Quitar a ${item.nombre}`}>
              {item.nombre}
              {esMio(item.id) && <small> · tú</small>}
              {!item.id && <small> · nuevo</small>}
              <IconoCerrar width={18} height={18} />
            </button>
          ))}
        </div>
      )}
      <label htmlFor="campo-quien" className={styles.etiqueta}>
        {valor.length ? "Otro artista o grupo" : "Nombre del artista o grupo"}
      </label>
      <span className={limpiar.caja}>
        <input
          id="campo-quien"
          type="text"
          className={styles.campo}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (sugerencias[0] && artistaIgual(sugerencias, texto)) elegir(artistaIgual(sugerencias, texto)!);
              else if (ofrecerCrear) crear();
            }
          }}
          placeholder="Ej. Trío Xochitl"
          maxLength={80}
          autoComplete="off"
          autoCapitalize="words"
          aria-autocomplete="list"
        />
        <Limpiar visible={!!texto} />
      </span>
      {(sugerencias.length > 0 || ofrecerCrear) && (
        <ul className={sug.lista} role="listbox" aria-label="Artistas encontrados">
          {sugerencias.map((a) => (
            <li key={a.id}>
              <button type="button" role="option" aria-selected={false} className={`${sug.renglon} ${sug.conMini}`} onClick={() => elegir(a)}>
                {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage */}
                <img src={a.foto ?? SIN_FOTO} alt="" className={sug.mini} />
                <b>{a.nombre}</b>
                <small>
                  {etiquetaArtista(a)}
                  {esMio(a.id) ? " · tú" : ""}
                </small>
              </button>
            </li>
          ))}
          {ofrecerCrear && (
            <li>
              <button type="button" role="option" aria-selected={false} className={`${sug.renglon} ${sug.conMini}`} onClick={crear}>
                <span className={`${sug.mini} ${styles.miniCrear}`} aria-hidden="true">
                  <IconoMas width={16} height={16} />
                </span>
                <b>Crear a «{texto.trim()}»</b>
                <small>solo con el nombre; se completa después</small>
              </button>
            </li>
          )}
        </ul>
      )}
      {valor.length === 0 && q.length < MIN_LETRAS && <p className={styles.nota}>Escribe dos letras y te sugerimos los que ya están registrados. Si no está, lo creamos con el nombre.</p>}
    </div>
  );
}
