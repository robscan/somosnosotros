"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import { Chip, Chips } from "@/components/ui/Chip";
import Seccion from "@/components/ui/Seccion";
import SelectorEnlaces from "@/components/SelectorEnlaces";
import { artistaIgual, deducirTipoArtista, DISCIPLINAS, etiquetaArtista, etiquetaDisciplina, etiquetaTipoArtista, LIMITES_ARTISTA, TIPOS_ARTISTA, type Artista, type ArtistaResumen, type Disciplina, type TipoArtista } from "@/lib/artistas";
import { normalizarRedes } from "@/lib/enlaces";
import { normalizarNombre } from "@/lib/lugares";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { subirFoto } from "@/lib/subirFoto";
import CampoImagenUrl from "@/components/CampoImagenUrl";
import type { ResultadoArtista } from "./acciones";
import styles from "./FormularioArtista.module.css";

type Props = {
  accion: (previo: ResultadoArtista | null, formData: FormData) => Promise<ResultadoArtista>;
  /** Sin artista = alta (una cosa a la vez). Con artista = edición (todo visible). */
  artista?: Artista;
  usuarioId: string;
  /** Viene de la búsqueda de la lista ("Registrar a «…»"). */
  nombreInicial?: string;
  /** El administrador puede pegar la dirección de una foto (fichas importadas). */
  esAdmin?: boolean;
};

type Abierta = "hace" | "es" | null;
const CLAVE_BORRADOR = "somosnosotros:borrador-artista";
type Borrador = { nombre: string; disciplina: Disciplina; detalle: string; tipo: TipoArtista | ""; soy: boolean };

function leerBorrador(): Borrador | null {
  try {
    const raw = localStorage.getItem(CLAVE_BORRADOR);
    return raw ? (JSON.parse(raw) as Borrador) : null;
  } catch {
    return null;
  }
}

/**
 * Alta de artista una cosa a la vez (decisión 4): el nombre, y dos renglones ya resueltos
 * ("Qué hace", "Es", deducido del nombre) que se abren solo para cambiarlos; foto opcional;
 * "Soy yo / es mi grupo"; redes y descripción bajo "Más detalles". Si el nombre ya existe, "¿Es este?" (decisión 5).
 */
export default function FormularioArtista({ accion, artista, usuarioId, nombreInicial, esAdmin = false }: Props) {
  const esAlta = !artista;
  const [resultado, enviar, enviando] = useActionState<ResultadoArtista | null, FormData>(accion, null);
  const errores = resultado && !resultado.ok ? resultado.errores : {};
  const existenteServidor = resultado && !resultado.ok ? resultado.existente : undefined;

  const [nombre, setNombre] = useState(artista?.nombre ?? nombreInicial ?? "");
  const [disciplina, setDisciplina] = useState<Disciplina>(artista?.disciplina && artista.disciplina !== "por_completar" ? artista.disciplina : "musica");
  // En el alta, "Música" es un valor puesto por defecto, no elegido: el renglón lo dice hasta que la persona lo toque.
  const [haceElegido, setHaceElegido] = useState(!esAlta);
  const [detalle, setDetalle] = useState(artista?.detalle ?? "");
  const [tipoElegido, setTipoElegido] = useState<TipoArtista | "">(artista?.tipo ?? "");
  const [soy, setSoy] = useState(false);
  const [foto, setFoto] = useState<string | null>(artista?.foto ?? null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<Abierta>(null);
  const [masDetalles, setMasDetalles] = useState(!esAlta);
  const [existente, setExistente] = useState<ArtistaResumen | null>(null);
  const [descartado, setDescartado] = useState(""); // "No, es otro": ese nombre ya no avisa
  const guardarBorrador = useRef(false);

  const deducido = deducirTipoArtista(nombre);
  const tipo: TipoArtista = tipoElegido || deducido || "solista";

  // Borrador en el teléfono (Zeigarnik: salir y volver no pierde lo escrito).
  useEffect(() => {
    if (!esAlta) return;
    const id = requestAnimationFrame(() => {
      const b = leerBorrador();
      if (b && b.nombre && !nombreInicial) {
        setNombre(b.nombre);
        setDisciplina(b.disciplina);
        setHaceElegido(true);
        setDetalle(b.detalle);
        setTipoElegido(b.tipo);
        setSoy(b.soy);
      }
      guardarBorrador.current = true;
    });
    return () => cancelAnimationFrame(id);
  }, [esAlta, nombreInicial]);
  useEffect(() => {
    if (!esAlta || !guardarBorrador.current) return;
    try {
      if (!nombre) localStorage.removeItem(CLAVE_BORRADOR);
      else localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ nombre, disciplina, detalle, tipo: tipoElegido, soy } satisfies Borrador));
    } catch {}
  }, [esAlta, nombre, disciplina, detalle, tipoElegido, soy]);

  // Un artista es un artista: mientras se escribe, ¿ya hay uno que se llama igual?
  useEffect(() => {
    const q = nombre.trim();
    if (q.length < 2) return; // lo encontrado antes se descarta en el render si ya no coincide con lo escrito
    const t = setTimeout(async () => {
      const supabase = clienteNavegador();
      if (!supabase) return;
      const { data } = await supabase.rpc("artistas_con_nombre", { p_nombre: q });
      const igual = artistaIgual((data ?? []) as ArtistaResumen[], q);
      setExistente(igual && igual.id !== artista?.id ? igual : null);
    }, 300);
    return () => clearTimeout(t);
  }, [nombre, artista?.id]);

  async function alElegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setSubiendo(true);
    setErrorFoto(null);
    const r = await subirFoto("artistas", usuarioId, "foto", archivo);
    if ("error" in r) setErrorFoto(r.error);
    else setFoto(r.url);
    setSubiendo(false);
  }

  const clave = normalizarNombre(nombre);
  const coincide = (a: ArtistaResumen | null | undefined) => !!a && clave.length > 0 && normalizarNombre(a.nombre) === clave && clave !== descartado;
  const repetido = coincide(existente) ? existente : coincide(existenteServidor) ? existenteServidor : null;
  const resumenHace = detalle.trim() ? `${etiquetaDisciplina(disciplina)} · ${detalle.trim()}` : haceElegido ? etiquetaDisciplina(disciplina) : `${etiquetaDisciplina(disciplina)} · cámbialo si no es`;

  return (
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
    >
      {/* 1. Nombre; si ya existe, "¿Es este?" */}
      <Campo etiqueta="Nombre" name="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={LIMITES_ARTISTA.nombre} placeholder="Ej. Los Vecinos" autoComplete="off" autoCapitalize="words" autoFocus={esAlta} error={errores.nombre} required />
      {repetido && (
        <div className={styles.repetido} role="status">
          <p>
            Ya está registrado: <b>{repetido.nombre}</b> · {etiquetaArtista(repetido)}. ¿Es este?
          </p>
          <div className={styles.repetidoAcciones}>
            <Link href={`/artistas/${repetido.id}`} className={styles.si}>
              Sí, es este
            </Link>
            <button type="button" className={styles.no} onClick={() => setDescartado(normalizarNombre(repetido.nombre))}>
              No, es otro
            </button>
          </div>
        </div>
      )}

      {/* 2. Qué hace: chips y "en una palabra" */}
      <Seccion titulo="Qué hace" resumen={resumenHace} abierta={abierta === "hace"} onAbrir={() => setAbierta(abierta === "hace" ? null : "hace")} error={!!errores.disciplina || !!errores.detalle}>
        <Chips ariaLabel="Qué hace">
          {DISCIPLINAS.map((d) => (
            <Chip
              key={d.valor}
              activo={disciplina === d.valor}
              onClick={() => {
                setDisciplina(d.valor);
                setHaceElegido(true);
              }}
            >
              {d.etiqueta}
            </Chip>
          ))}
        </Chips>
        <Campo etiqueta="En una palabra (opcional)" name="detalle" value={detalle} onChange={(e) => setDetalle(e.target.value)} maxLength={LIMITES_ARTISTA.detalle} placeholder="Ej. son huasteco, jazz, grabado" autoComplete="off" error={errores.detalle} />
      </Seccion>
      <input type="hidden" name="disciplina" value={disciplina} />

      {/* 3. Es: deducido del nombre; se cambia con un toque */}
      <Seccion
        titulo="Es"
        resumen={
          <>
            {etiquetaTipoArtista(tipo)}
            {!tipoElegido && deducido && <small className={styles.deducido}> · por el nombre</small>}
          </>
        }
        abierta={abierta === "es"}
        onAbrir={() => setAbierta(abierta === "es" ? null : "es")}
        error={!!errores.tipo}
      >
        <Chips ariaLabel="Es">
          {TIPOS_ARTISTA.map((t) => (
            <Chip key={t.valor} activo={tipo === t.valor} onClick={() => setTipoElegido(t.valor)}>
              {t.etiqueta}
            </Chip>
          ))}
        </Chips>
      </Seccion>
      <input type="hidden" name="tipo" value={tipo} />

      {/* 4. Foto (opcional) */}
      <div className={styles.foto}>
        <span className={styles.etiqueta}>Foto</span>
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
          <img src={foto} alt="" className={styles.miniatura} />
        ) : (
          <span className={styles.opcional}>Opcional</span>
        )}
        <label className={styles.subir}>
          <input type="file" accept="image/*" onChange={alElegirFoto} disabled={subiendo} />
          {subiendo ? "Subiendo…" : foto ? "Cambiar" : "Elegir una foto"}
        </label>
        {(errorFoto || errores.foto) && (
          <p className={styles.error} role="alert">
            {errorFoto ?? errores.foto}
          </p>
        )}
      </div>
      {esAdmin && <CampoImagenUrl valor={foto} onCambio={setFoto} />}
      <input type="hidden" name="foto" value={foto ?? ""} />

      {/* 5. Soy yo / es mi grupo (solo en el alta; después lo liga el administrador) */}
      {esAlta && (
        <label className={styles.interruptor}>
          <span>
            Soy yo / es mi grupo
            <small>Podrás editar la ficha y publicar sus fechas sin teclear el nombre.</small>
          </span>
          <input type="checkbox" name="soy" value="1" role="switch" checked={soy} onChange={(e) => setSoy(e.target.checked)} className={styles.palanca} />
        </label>
      )}

      {/* 6. Más detalles: redes y descripción */}
      {!masDetalles ? (
        <button type="button" className={styles.desplegar} onClick={() => setMasDetalles(true)}>
          + Más detalles: redes, descripción
        </button>
      ) : (
        <>
          <SelectorEnlaces inicial={normalizarRedes(artista?.redes)} error={errores.enlaces} />
          <Campo etiqueta="Descripción (opcional)" name="descripcion" multilinea defaultValue={artista?.descripcion ?? ""} maxLength={LIMITES_ARTISTA.descripcion} ayuda={`Qué hace y dónde suele estar. Hasta ${LIMITES_ARTISTA.descripcion} caracteres.`} error={errores.descripcion} />
        </>
      )}

      {resultado && !resultado.ok && resultado.general && !repetido && (
        <p className="aviso-error" role="alert">
          {resultado.general}
        </p>
      )}
      <Boton type="submit" disabled={enviando || subiendo}>
        {enviando ? "Guardando…" : artista ? "Guardar cambios" : "Publicar artista"}
      </Boton>
    </form>
  );
}
