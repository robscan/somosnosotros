"use client";

import { useId, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import { Chip, Chips } from "@/components/ui/Chip";
import Hoja from "@/components/ui/Hoja";
import { IconoDocumento, IconoMas } from "@/components/ui/Iconos";
import { COLUMNAS_CSV_REDES, REDES, validarLectura, type DatosLectura, type Red } from "@/lib/showcase";
import { anadirLectura, importarLecturas, type ResultadoImportar } from "../acciones";
import { IconoRed } from "../Piezas";
import admin from "../../admin.module.css";
import hojaCss from "@/components/ui/Hoja.module.css";
import renglon from "@/components/ui/Renglon.module.css";
import s from "../showcase.module.css";

export type LecturaVista = { red: Red; etiqueta: string; texto: string; hace: string };

/**
 * Las redes en la ficha de showcase (OL-426): la última lectura de cada red con «leída hace N días», «Añadir lectura» (hoja: red, seguidores,
 * publicaciones y la última publicación) e «Importar CSV» (hoja con un archivo: `artista_slug, red, seguidores, publicaciones,
 * ultima_publicacion, leido_en`, lo que deja la rutina desde el Chrome de administración: el servidor no lee Instagram).
 */
export default function RedesFicha({ artistaId, slug, lecturas, hoy }: { artistaId: string; slug: string; lecturas: LecturaVista[]; hoy: string }) {
  const [hoja, setHoja] = useState<"lectura" | "csv" | null>(null);
  return (
    <>
      <ul className={renglon.tarjeta} data-ayuda="redes">
        {lecturas.map((l) => (
          <li key={l.red} className={admin.dato}>
            <IconoRed red={l.red} width={20} height={20} />
            <small>
              {l.etiqueta} · leída {l.hace}
            </small>
            <b>{l.texto || "Sin cifras"}</b>
          </li>
        ))}
        {!lecturas.length && (
          <li>
            <p className={s.sin}>Todavía nadie leyó sus redes.</p>
          </li>
        )}
        <li>
          <button type="button" className={`${admin.fila} ${s.boton}`} aria-haspopup="dialog" onClick={() => setHoja("lectura")}>
            <IconoMas width={20} height={20} />
            <b>Añadir lectura</b>
            <small>Las cifras de una red, leídas hoy</small>
          </button>
        </li>
        <li>
          <button type="button" className={`${admin.fila} ${s.boton}`} aria-haspopup="dialog" onClick={() => setHoja("csv")}>
            <IconoDocumento width={20} height={20} />
            <b>Importar CSV</b>
            <small>El archivo de la rutina, con varios artistas a la vez</small>
          </button>
        </li>
      </ul>
      {hoja === "lectura" && <HojaLectura artistaId={artistaId} slug={slug} hoy={hoy} onCerrar={() => setHoja(null)} />}
      {hoja === "csv" && <HojaCsv slug={slug} onCerrar={() => setHoja(null)} />}
    </>
  );
}

function HojaLectura({ artistaId, slug, hoy, onCerrar }: { artistaId: string; slug: string; hoy: string; onCerrar: () => void }) {
  const [datos, setDatos] = useState<DatosLectura>({ red: "instagram", seguidores: "", publicaciones: "", ultima: "" });
  const [errores, setErrores] = useState<Partial<Record<keyof DatosLectura, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [enCamino, iniciar] = useTransition();
  const formulario = useId();
  const falta = !datos.seguidores.trim() && !datos.publicaciones.trim() && !datos.ultima.trim() ? "Falta una cifra" : null;
  const poner = (campo: keyof DatosLectura) => (e: ChangeEvent<HTMLInputElement>) => {
    setDatos((d) => ({ ...d, [campo]: e.target.value }));
    setErrores((x) => ({ ...x, [campo]: undefined }));
  };
  function enviar(e: FormEvent) {
    e.preventDefault();
    if (falta || enCamino) return;
    const v = validarLectura(datos, hoy);
    if (!v.ok) return setErrores(v.errores);
    setError(null);
    iniciar(async () => {
      const r = await anadirLectura(artistaId, datos, slug);
      if (!r.ok) {
        setError(r.error);
        if (r.errores) setErrores(r.errores);
        return;
      }
      onCerrar();
    });
  }
  return (
    <Hoja
      etiqueta="Añadir lectura"
      titulo="Añadir lectura"
      onCerrar={onCerrar}
      pie={
        <>
          <Boton type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form={formulario} disabled={!!falta || enCamino} aria-busy={enCamino || undefined}>
            {falta ?? (enCamino ? "Guardando…" : "Guardar")}
          </Boton>
        </>
      }
    >
      <form id={formulario} onSubmit={enviar} noValidate>
        <fieldset className={s.grupoChips}>
          <legend className={s.etiquetaCampo}>Red</legend>
          <Chips ariaLabel="Red" envuelve>
            {REDES.map((r) => (
              <Chip key={r.valor} activo={datos.red === r.valor} onClick={() => setDatos((d) => ({ ...d, red: r.valor }))}>
                {r.etiqueta}
              </Chip>
            ))}
          </Chips>
        </fieldset>
        <Campo etiqueta="Seguidores" name="seguidores" inputMode="numeric" value={datos.seguidores} onChange={poner("seguidores")} placeholder="3200" error={errores.seguidores} autoComplete="off" />
        <Campo etiqueta="Publicaciones" name="publicaciones" inputMode="numeric" value={datos.publicaciones} onChange={poner("publicaciones")} placeholder="412" error={errores.publicaciones} autoComplete="off" />
        <Campo etiqueta="Última publicación" name="ultima" type="date" max={hoy} value={datos.ultima} onChange={poner("ultima")} error={errores.ultima} />
        {error && (
          <p className="aviso-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Hoja>
  );
}

function HojaCsv({ slug, onCerrar }: { slug: string; onCerrar: () => void }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportar | null>(null);
  const [enCamino, iniciar] = useTransition();
  const campo = useId();
  function importar() {
    if (!archivo || enCamino) return;
    iniciar(async () => {
      try {
        setResultado(await importarLecturas(await archivo.text(), slug));
      } catch {
        setResultado({ ok: false, error: "No se pudo leer el archivo." });
      }
    });
  }
  const errores = resultado?.errores ?? [];
  return (
    <Hoja
      etiqueta="Importar CSV de redes"
      titulo="Importar CSV de redes"
      onCerrar={onCerrar}
      pie={
        resultado?.ok ? (
          <Boton type="button" onClick={onCerrar}>
            Listo
          </Boton>
        ) : (
          <>
            <Boton type="button" variante="secundario" onClick={onCerrar}>
              Cancelar
            </Boton>
            <Boton type="button" disabled={!archivo || enCamino} aria-busy={enCamino || undefined} onClick={importar}>
              {!archivo ? "Elige el archivo" : enCamino ? "Importando…" : "Importar"}
            </Boton>
          </>
        )
      }
    >
      <p className={hojaCss.nota}>
        Columnas: {COLUMNAS_CSV_REDES.join(", ")}. Una fila por lectura; puede traer varios artistas. Las fechas, AAAA-MM-DD.
      </p>
      <label htmlFor={campo} className={s.etiquetaCampo}>
        Archivo
      </label>
      <input
        id={campo}
        className={s.archivo}
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => {
          setArchivo(e.target.files?.[0] ?? null);
          setResultado(null);
        }}
      />
      {resultado?.ok && (
        <p className={admin.hecho} role="status">
          <IconoDocumento width={20} height={20} />
          <span>
            {resultado.importadas === 1 ? "Se importó 1 lectura" : `Se importaron ${resultado.importadas} lecturas`}
            {errores.length ? `; ${errores.length === 1 ? "1 fila no entró" : `${errores.length} filas no entraron`}` : ""}.
          </span>
        </p>
      )}
      {resultado && !resultado.ok && (
        <p className="aviso-error" role="alert">
          {resultado.error}
        </p>
      )}
      {errores.length > 0 && (
        <ul className={s.errores}>
          {errores.slice(0, 10).map((e) => (
            <li key={`${e.linea}-${e.motivo}`}>
              Línea {e.linea}: {e.motivo}
            </li>
          ))}
          {errores.length > 10 && <li>Y {errores.length - 10} más.</li>}
        </ul>
      )}
    </Hoja>
  );
}
