"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import { Chip } from "@/components/ui/Chip";
import { IconoCamara, IconoEstrella, IconoMas, IconoNota, IconoOk, IconoPersona, IconoPersonas } from "@/components/ui/Iconos";
import SelectorEnlaces from "@/components/SelectorEnlaces";
import { artistaIgual, deducirDisciplina, deducirTipoArtista, DISCIPLINAS, etiquetaArtista, etiquetaDisciplina, etiquetaTipoArtista, LIMITES_ARTISTA, TIPOS_ARTISTA, type Artista, type ArtistaResumen, type Disciplina, type TipoArtista } from "@/lib/artistas";
import { normalizarRedes } from "@/lib/enlaces";
import { normalizarNombre } from "@/lib/lugares";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { subirFoto } from "@/lib/subirFoto";
import CampoImagenUrl from "@/components/CampoImagenUrl";
import type { ResultadoArtista } from "./acciones";
import canon from "@/components/ui/FormularioCanon.module.css";

type Props = {
  accion: (previo: ResultadoArtista | null, formData: FormData) => Promise<ResultadoArtista>;
  /** Sin artista = alta. Con artista = edición (todo resuelto de entrada). */
  artista?: Artista;
  usuarioId: string;
  /** Viene de la búsqueda de la lista ("Registrar a «…»"). */
  nombreInicial?: string;
  /** El administrador puede pegar la dirección de una foto (fichas importadas). */
  esAdmin?: boolean;
};

type Abierta = "hace" | "es" | null;
const CLAVE_BORRADOR = "somosnosotros:borrador-artista";
type Borrador = { nombre: string; disciplina: Disciplina | ""; detalle: string; tipo: TipoArtista | ""; soy: boolean };

function leerBorrador(): Borrador | null {
  try {
    const raw = localStorage.getItem(CLAVE_BORRADOR);
    return raw ? (JSON.parse(raw) as Borrador) : null;
  } catch {
    return null;
  }
}

/**
 * Alta de artista con el canon (docs/rediseno/15, decisiones 4 y 5): un campo arriba con la estrella y, debajo,
 * renglones resueltos: Qué hace y Es deducidos del nombre (chips al abrir), Foto con la cámara como acción,
 * Soy yo / es mi grupo con interruptor y Más (redes, descripción). Si el nombre ya existe, se dice con enlace.
 * El botón dice qué falta. Sin frases de ayuda.
 */
export default function FormularioArtista({ accion, artista, usuarioId, nombreInicial, esAdmin = false }: Props) {
  const esAlta = !artista;
  const [resultado, enviar, enviando] = useActionState<ResultadoArtista | null, FormData>(accion, null);
  const errores = resultado && !resultado.ok ? resultado.errores : {};
  const existenteServidor = resultado && !resultado.ok ? resultado.existente : undefined;

  const [nombre, setNombre] = useState(artista?.nombre ?? nombreInicial ?? "");
  const [disciplinaElegida, setDisciplinaElegida] = useState<Disciplina | "">(artista?.disciplina && artista.disciplina !== "por_completar" ? artista.disciplina : "");
  const [detalle, setDetalle] = useState(artista?.detalle ?? "");
  const [tipoElegido, setTipoElegido] = useState<TipoArtista | "">(artista?.tipo ?? "");
  const [soy, setSoy] = useState(false);
  const [foto, setFoto] = useState<string | null>(artista?.foto ?? null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<Abierta>(null);
  const [masAbierto, setMasAbierto] = useState(!esAlta);
  const [existente, setExistente] = useState<ArtistaResumen | null>(null);
  const guardarBorrador = useRef(false);

  // Lo deducido del nombre manda hasta que la persona lo cambie a mano (decisión 4).
  const hayNombre = nombre.trim().length > 0;
  const disciplina: Disciplina | "" = disciplinaElegida || (hayNombre ? deducirDisciplina(nombre) : "");
  const tipo: TipoArtista = tipoElegido || deducirTipoArtista(nombre) || "solista";

  // Borrador en el teléfono (Zeigarnik: salir y volver no pierde lo escrito).
  useEffect(() => {
    if (!esAlta) return;
    const id = requestAnimationFrame(() => {
      const b = leerBorrador();
      if (b && b.nombre && !nombreInicial) {
        setNombre(b.nombre);
        setDisciplinaElegida(b.disciplina);
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
      else localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ nombre, disciplina: disciplinaElegida, detalle, tipo: tipoElegido, soy } satisfies Borrador));
    } catch {}
  }, [esAlta, nombre, disciplinaElegida, detalle, tipoElegido, soy]);

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
  const coincide = (a: ArtistaResumen | null | undefined) => !!a && clave.length > 0 && normalizarNombre(a.nombre) === clave;
  const repetido = coincide(existente) ? existente : coincide(existenteServidor) ? existenteServidor : null;
  const faltaNombre = !hayNombre;
  const listo = !faltaNombre && !repetido;
  const valorHace = disciplina ? `${etiquetaDisciplina(disciplina)}${detalle.trim() ? ` · ${detalle.trim()}` : ""}` : "Por el nombre";

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
      {/* 1. El nombre: con él basta. */}
      <label className={canon.campo}>
        <IconoEstrella width={20} height={20} />
        <input name="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={LIMITES_ARTISTA.nombre} placeholder="Nombre del artista o grupo" aria-label="Nombre del artista o grupo" aria-invalid={!!errores.nombre} autoComplete="off" autoCapitalize="words" autoFocus={esAlta} required />
      </label>
      {errores.nombre && (
        <p className={canon.error} role="alert">
          {errores.nombre}
        </p>
      )}
      {/* Un artista es un artista (decisión 5 de 08): el mismo nombre no se registra dos veces; se abre el que ya está. */}
      {repetido && (
        <p className={canon.existe} role="status">
          <IconoOk width={20} height={20} />
          <span>
            <b>Ya está registrado:</b> <Link href={`/artistas/${repetido.id}`}>{repetido.nombre}</Link> · {etiquetaArtista(repetido)}. Ábrelo y, si es tuyo, dilo ahí.
          </span>
        </p>
      )}

      <ul className={canon.renglones}>
        {/* 2. Qué hace: deducido del nombre; chips y "en una palabra" al abrir. */}
        <li className={`${canon.resuelto} ${abierta === "hace" ? canon.abierta : ""}`}>
          <IconoNota width={20} height={20} />
          <span className={canon.clave}>Qué hace</span>
          <span className={`${canon.valor} ${disciplina ? "" : canon.falta}`}>{valorHace}</span>
          <button type="button" className={canon.cambiar} onClick={() => setAbierta(abierta === "hace" ? null : "hace")} aria-expanded={abierta === "hace"}>
            {abierta === "hace" ? "Listo" : "Cambiar"}
          </button>
          {abierta === "hace" && (
            <div className={canon.cuerpo}>
              <div className={canon.chips}>
                {DISCIPLINAS.map((d) => (
                  <Chip key={d.valor} activo={disciplina === d.valor} onClick={() => setDisciplinaElegida(d.valor)}>
                    {d.etiqueta}
                  </Chip>
                ))}
              </div>
              <input type="text" name="detalle" value={detalle} onChange={(e) => setDetalle(e.target.value)} maxLength={LIMITES_ARTISTA.detalle} placeholder="Ej. son huasteco, jazz (opcional)" aria-label="En una palabra" className={canon.entrada} autoComplete="off" />
              {(errores.disciplina || errores.detalle) && (
                <p className={canon.error} role="alert">
                  {errores.disciplina ?? errores.detalle}
                </p>
              )}
            </div>
          )}
        </li>

        {/* 3. Es: deducido del nombre ("Los", "Trío", "Colectivo"); chips al abrir. */}
        <li className={`${canon.resuelto} ${abierta === "es" ? canon.abierta : ""}`}>
          <IconoPersonas width={20} height={20} />
          <span className={canon.clave}>Es</span>
          <span className={canon.valor}>{etiquetaTipoArtista(tipo)}</span>
          <button type="button" className={canon.cambiar} onClick={() => setAbierta(abierta === "es" ? null : "es")} aria-expanded={abierta === "es"}>
            {abierta === "es" ? "Listo" : "Cambiar"}
          </button>
          {abierta === "es" && (
            <div className={canon.cuerpo}>
              <div className={canon.chips}>
                {TIPOS_ARTISTA.map((t) => (
                  <Chip
                    key={t.valor}
                    activo={tipo === t.valor}
                    onClick={() => {
                      setTipoElegido(t.valor);
                      setAbierta(null);
                    }}
                  >
                    {t.etiqueta}
                  </Chip>
                ))}
              </div>
              {errores.tipo && (
                <p className={canon.error} role="alert">
                  {errores.tipo}
                </p>
              )}
            </div>
          )}
        </li>

        {/* 4. Foto: la cámara como acción; la foto puesta ocupa el sitio del icono. */}
        <li className={`${canon.resuelto} ${foto ? "" : canon.pendiente}`}>
          {foto ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
            <img src={foto} alt="" className={canon.miniatura} />
          ) : (
            <IconoCamara width={20} height={20} />
          )}
          <span className={canon.clave}>Foto</span>
          <span className={`${canon.valor} ${foto ? "" : canon.falta}`}>{subiendo ? "Subiendo…" : foto ? "Lista" : "Sin foto"}</span>
          <label className={canon.accionIcono} title={foto ? "Cambiar la foto" : "Elegir una foto"}>
            <IconoCamara width={22} height={22} />
            <input type="file" accept="image/*" onChange={alElegirFoto} disabled={subiendo} aria-label={foto ? "Cambiar la foto" : "Elegir una foto"} />
          </label>
          {(errorFoto || errores.foto) && (
            <p className={canon.cuerpoNota} role="alert">
              {errorFoto ?? errores.foto}
            </p>
          )}
        </li>

        {/* 5. Soy yo / es mi grupo (solo en el alta; después lo liga el administrador). Al encender, el valor dice qué da. */}
        {esAlta && (
          <li className={canon.resuelto}>
            <IconoPersona width={20} height={20} />
            <span className={canon.clave}>Soy yo / es mi grupo</span>
            <span className={`${canon.valor} ${soy ? "" : canon.falta}`}>{soy ? "Sí: podrás editar la ficha y publicar sus fechas" : "No"}</span>
            <button type="button" role="switch" aria-checked={soy} aria-label="Soy yo / es mi grupo" className={canon.palanca} onClick={() => setSoy((s) => !s)} />
          </li>
        )}

        {/* 6. Más: redes y descripción. Se esconde, no se desmonta: lo escrito se queda aunque se cierre. */}
        <li className={`${canon.resuelto} ${masAbierto ? canon.abierta : canon.pendiente}`}>
          <IconoMas width={20} height={20} />
          <span className={canon.clave}>Más</span>
          <span className={`${canon.valor} ${canon.falta}`}>Redes, descripción</span>
          <button type="button" className={canon.cambiar} onClick={() => setMasAbierto((a) => !a)} aria-expanded={masAbierto}>
            {masAbierto ? "Listo" : "Agregar"}
          </button>
          <div className={canon.cuerpo} hidden={!masAbierto}>
            <SelectorEnlaces inicial={normalizarRedes(artista?.redes)} error={errores.enlaces} />
            <Campo etiqueta="Descripción" name="descripcion" multilinea defaultValue={artista?.descripcion ?? ""} maxLength={LIMITES_ARTISTA.descripcion} placeholder="Qué hace y dónde suele estar" error={errores.descripcion} />
            {esAdmin && <CampoImagenUrl valor={foto} onCambio={setFoto} />}
          </div>
        </li>
      </ul>

      <input type="hidden" name="disciplina" value={disciplina} />
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="foto" value={foto ?? ""} />
      <input type="hidden" name="soy" value={soy ? "1" : ""} />
      {abierta !== "hace" && <input type="hidden" name="detalle" value={detalle} />}

      {resultado && !resultado.ok && resultado.general && !repetido && (
        <p className="aviso-error" role="alert">
          {resultado.general}
        </p>
      )}
      {/* El botón dice qué falta. */}
      <Boton type="submit" disabled={enviando || subiendo || !listo}>
        {enviando ? "Guardando…" : artista ? "Guardar cambios" : "Publicar artista"}
        {!enviando && !listo && <small className={canon.faltaBoton}>{faltaNombre ? "falta el nombre" : "ya está registrado"}</small>}
      </Boton>
    </form>
  );
}
