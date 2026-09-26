"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useAbrirConError } from "@/components/ui/abrirConError";
import { useTerminar } from "@/components/ui/Atras";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import ContadorCaracteres from "@/components/ui/ContadorCaracteres";
import { Chip } from "@/components/ui/Chip";
import chip from "@/components/ui/Chip.module.css";
import { IconoCamara, IconoEstrella, IconoMas, IconoNota, IconoOk, IconoPersona, IconoPersonas, IconoPin, IconoCerrar } from "@/components/ui/Iconos";
import Limpiar from "@/components/ui/Limpiar";
import limpiar from "@/components/ui/Limpiar.module.css";
import ListaFlotante from "@/components/ui/ListaFlotante";
import SelectorEnlaces from "@/components/SelectorEnlaces";
import { alElegirDisciplina, alElegirSubcategoria, alQuitarDisciplina, artistaIgual, deducirDisciplina, deducirTipoArtista, DISCIPLINAS, etiquetaArtista, etiquetaDisciplina, etiquetaTipoArtista, hrefArtista, LIMITES_ARTISTA, pasoQueHace, preguntaSubcategoria, subcategoriaParecida, TIPOS_ARTISTA, type Artista, type ArtistaResumen, type Disciplina, type Subcategoria, type TipoArtista } from "@/lib/artistas";
import type { CiudadConArtistas } from "@/lib/ciudad";
import { normalizarRedes } from "@/lib/enlaces";
import { normalizarNombre } from "@/lib/lugares";
import { quitarGuardia } from "@/lib/guardiaSalida";
import { useSalirSinPublicar } from "@/components/SalirSinPublicar";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { subirFoto } from "@/lib/subirFoto";
import CampoImagenUrl from "@/components/CampoImagenUrl";
import type { ResultadoArtista } from "./acciones";
import HojaCiudad from "./HojaCiudad";
import canon from "@/components/ui/FormularioCanon.module.css";
import estilos from "./FormularioArtista.module.css";

type Props = {
  accion: (previo: ResultadoArtista | null, formData: FormData) => Promise<ResultadoArtista>;
  /** Sin artista = alta. Con artista = edición (todo resuelto de entrada). */
  artista?: Artista;
  usuarioId: string;
  /** Viene de la búsqueda de la lista ("Registrar a «…»"). */
  nombreInicial?: string;
  /** El administrador puede pegar la dirección de una foto (fichas importadas). */
  esAdmin?: boolean;
  /** De entrada: en el alta, la que la persona tenía elegida en Artistas; al editar, la del artista. */
  ciudadInicial: string;
  /** Las ciudades que ya tienen artistas: las primeras opciones de la hoja Ciudad. */
  ciudades: CiudadConArtistas[];
};
/** Lo que trae la búsqueda por nombre: el artista con su ciudad (el mismo nombre en otra ciudad es otro artista). */
type Candidato = ArtistaResumen & { ciudad: string };

type Abierta = "hace" | "es" | "ciudad" | null;
/**
 * Alta de artista con el canon (docs/rediseno/15, decisiones 4 y 5): un campo arriba con la estrella y, debajo,
 * renglones resueltos: Qué hace y Es deducidos del nombre (chips al abrir), Ciudad (la elegida en Artistas; se busca
 * en una hoja, pedido del founder del 2026-09-16, noche), Foto con la cámara como acción,
 * Soy yo / es mi grupo con interruptor y Más (redes, descripción). Si el nombre ya existe, se dice con enlace, en un
 * aviso que flota sobre el layout sin empujar los renglones de abajo (founder, producción, 2026-09-21). El botón
 * dice solo su acción; la ayuda de qué falta va bajo el campo o el renglón que falta (founder, 2026-09-21: canon
 * ampliado para todos los formularios, docs/rediseno/26).
 */
export default function FormularioArtista({ accion, artista, usuarioId, nombreInicial, esAdmin = false, ciudadInicial, ciudades }: Props) {
  const esAlta = !artista;
  const [resultado, enviar, enviando] = useActionState<ResultadoArtista | null, FormData>(accion, null);
  // Guardado (al editar): la tarea termina sin quedarse en el historial; mientras vuelve, el botón sigue ocupado.
  const terminar = useTerminar();
  const terminado = resultado?.ok === true;
  useEffect(() => {
    if (resultado?.ok) terminar(resultado.volver);
  }, [resultado, terminar]);
  const errores = resultado && !resultado.ok ? resultado.errores : {};
  const existenteServidor = resultado && !resultado.ok ? resultado.existente : undefined;

  const [nombre, setNombre] = useState(artista?.nombre ?? nombreInicial ?? "");
  const [disciplinaElegida, setDisciplinaElegida] = useState<Disciplina | "">(artista?.disciplina && artista.disciplina !== "por_completar" ? artista.disciplina : "");
  const [detalle, setDetalle] = useState(artista?.detalle ?? "");
  const [tipoElegido, setTipoElegido] = useState<TipoArtista | "">(artista?.tipo ?? "");
  const [ciudad, setCiudad] = useState(ciudadInicial);
  const [soy, setSoy] = useState(false);
  const [foto, setFoto] = useState<string | null>(artista?.foto ?? null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<Abierta>(null);
  const [masAbierto, setMasAbierto] = useState(!esAlta);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  // Subcategorías ya usadas por disciplina (OL-101): una caché por disciplina, para no repetir la consulta.
  const [subcategoriasPorDisciplina, setSubcategoriasPorDisciplina] = useState<Record<string, Subcategoria[]>>({});
  // "Otra…" abre el texto libre aunque ya haya chips de subcategoría; sin subcategorías conocidas, va directo al texto.
  // Al editar una ficha que ya trae detalle, empieza abierto: es lo que ya se ve al llegar, se elija o no un chip después.
  const [otraAbierta, setOtraAbierta] = useState(!esAlta && !!artista?.detalle);
  // Sin borrador en el teléfono: el alta empieza limpia y, con cambios, Atrás o la ✕ preguntan (guardia estándar, 2026-09-16).
  const formRef = useRef<HTMLFormElement>(null);
  // Los avisos de estos campos viven dentro de "Más": si llega uno con el renglón cerrado, se abre solo.
  useAbrirConError(formRef, setMasAbierto, errores.descripcion, errores.enlaces);
  const hojaSalir = useSalirSinPublicar(formRef, esAlta);
  // "Ya está registrado" flota sobre el layout, anclado al campo del nombre (ui/ListaFlotante), y solo vive
  // mientras el campo tiene el foco: al salir se cierra solo y, si sigue habiendo coincidencia, queda una línea de
  // ayuda bajo el campo — un panel que tapa el siguiente renglón sin poder cerrarlo es peor que uno que empuja
  // (revisión del gestor, 2026-09-21).
  const campoNombreRef = useRef<HTMLElement>(null);
  const [enfocadoNombre, setEnfocadoNombre] = useState(false);

  // Lo deducido del nombre manda hasta que la persona lo cambie a mano (decisión 4).
  const hayNombre = nombre.trim().length > 0;
  const disciplina: Disciplina | "" = disciplinaElegida || (hayNombre ? deducirDisciplina(nombre) : "");
  const tipo: TipoArtista = tipoElegido || deducirTipoArtista(nombre) || "solista";
  const subcategorias = disciplina ? (subcategoriasPorDisciplina[disciplina] ?? []) : [];

  // Subcategorías ya usadas en la disciplina elegida (OL-101): para sugerir en vez de duplicar
  // ("foto", "Fotografia", "fotografía"). Es de solo lectura y global (no por ciudad, doc 27).
  useEffect(() => {
    if (!disciplina || disciplina === "por_completar" || subcategoriasPorDisciplina[disciplina]) return;
    let cancelado = false;
    (async () => {
      const supabase = clienteNavegador();
      if (!supabase) return;
      const { data } = await supabase.rpc("subcategorias_de", { p_disciplina: disciplina });
      if (!cancelado) setSubcategoriasPorDisciplina((prev) => (prev[disciplina] ? prev : { ...prev, [disciplina]: (data ?? []) as Subcategoria[] }));
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la caché se consulta, no se declara como dependencia: evitar refetch en bucle.
  }, [disciplina]);

  // Un artista es un artista: mientras se escribe, ¿ya hay uno que se llama igual?
  useEffect(() => {
    const q = nombre.trim();
    if (q.length < 2) return; // lo encontrado antes se descarta en el render si ya no coincide con lo escrito
    const t = setTimeout(async () => {
      const supabase = clienteNavegador();
      if (!supabase) return;
      const { data } = await supabase.rpc("artistas_con_nombre", { p_nombre: q });
      setCandidatos(((data ?? []) as Candidato[]).filter((a) => a.id !== artista?.id));
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
  // Un artista es un artista en su ciudad (decisión 5 de 08 y la base): con otra ciudad, el mismo nombre es otro artista.
  const existente = artistaIgual(candidatos.filter((a) => a.ciudad === ciudad), nombre);
  const repetido = existente ?? (coincide(existenteServidor) ? existenteServidor : null);
  const faltaNombre = !hayNombre;
  const listo = !faltaNombre && !repetido;
  const valorHace = disciplina ? `${etiquetaDisciplina(disciplina)}${detalle.trim() ? ` · ${detalle.trim()}` : ""}` : "Por el nombre";
  const avisoRepetidoAbierto = enfocadoNombre && !!repetido;

  return (
    <>
    <form
      ref={formRef}
      action={(fd) => {
        quitarGuardia();
        enviar(fd);
      }}
      noValidate
    >
      {/* 1. El nombre: con él basta. */}
      <label className={canon.campo} ref={campoNombreRef as React.RefObject<HTMLLabelElement>}>
        <IconoEstrella width={20} height={20} />
        <input
          name="nombre"
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onFocus={() => setEnfocadoNombre(true)}
          onBlur={() => setEnfocadoNombre(false)}
          maxLength={LIMITES_ARTISTA.nombre}
          placeholder="Nombre del artista o grupo"
          aria-label="Nombre del artista o grupo"
          aria-invalid={!!errores.nombre}
          autoComplete="off"
          autoCapitalize="words"
          autoFocus={esAlta}
          required
          role="combobox"
          aria-expanded={avisoRepetidoAbierto}
          aria-controls="aviso-nombre-repetido"
          aria-autocomplete="none"
        />
        <Limpiar visible={!!nombre} />
        <ContadorCaracteres valor={nombre} tope={LIMITES_ARTISTA.nombre} error={errores.nombre} />
      </label>
      {errores.nombre ? (
        <p className={canon.error} role="alert">
          {errores.nombre}
        </p>
      ) : faltaNombre ? (
        // La ayuda va bajo el campo, no dentro del botón de publicar (founder, 2026-09-21: canon para todos los formularios).
        <p className={canon.cuerpoNota}>Falta el nombre.</p>
      ) : (
        // Con el campo sin foco, si sigue habiendo un repetido queda esta línea en vez del panel flotante: el
        // panel tapaba Qué hace sin poder cerrarse (revisión del gestor, 2026-09-21).
        !enfocadoNombre &&
        repetido && (
          <p className={estilos.notaExiste}>
            <span>Ya hay uno con este nombre: </span>
            <b className={estilos.nombreRecortado}>{repetido.nombre}</b>
            <Link href={hrefArtista(repetido)}>Ver</Link>
          </p>
        )
      )}
      {/* Un artista es un artista (decisión 5 de 08): el mismo nombre no se registra dos veces; se abre el que ya
          está. Flota sobre el layout, anclado al campo del nombre, y solo vive mientras el campo tiene el foco
          (founder, producción, 2026-09-21; revisión del gestor, 2026-09-21). */}
      <ListaFlotante abierta={avisoRepetidoAbierto} onCerrar={() => setEnfocadoNombre(false)} ancla={campoNombreRef} id="aviso-nombre-repetido" etiqueta="Nombre ya registrado">
        {repetido && (
          <li className={`${canon.existe} ${estilos.existeFlotante}`} role="status">
            <IconoOk width={20} height={20} />
            <span>
              <b>Ya está registrado:</b> <Link href={hrefArtista(repetido)}>{repetido.nombre}</Link> · {etiquetaArtista(repetido)}. Ábrelo y, si es tuyo, dilo ahí.
            </span>
          </li>
        )}
      </ListaFlotante>

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
              {/* "Qué hace" en dos pasos (OL-206, docs/rediseno/15 decisión 11): paso 1, elegir entre todas las
                  disciplinas; paso 2, con una elegida (a mano, o ya la de la ficha al editar), se oculta el
                  resto y queda su ✕ — deshace los dos pasos a la vez. */}
              {pasoQueHace(disciplinaElegida) === 1 ? (
                <div className={canon.chips}>
                  {DISCIPLINAS.map((d) => (
                    <Chip
                      key={d.valor}
                      activo={disciplina === d.valor}
                      onClick={() => {
                        const siguiente = alElegirDisciplina(d.valor);
                        setDisciplinaElegida(siguiente.disciplinaElegida);
                        setDetalle(siguiente.detalle);
                        setOtraAbierta(siguiente.otraAbierta);
                      }}
                    >
                      {d.etiqueta}
                    </Chip>
                  ))}
                </div>
              ) : disciplinaElegida ? (
                <>
                  <div className={canon.chips}>
                    <span className={`${chip.chip} ${estilos.chipElegido}`}>
                      {etiquetaDisciplina(disciplinaElegida)}
                      <button
                        type="button"
                        className={estilos.quitarChip}
                        aria-label="Quitar la disciplina elegida"
                        onClick={() => {
                          const vacio = alQuitarDisciplina();
                          setDisciplinaElegida(vacio.disciplinaElegida);
                          setDetalle(vacio.detalle);
                          setOtraAbierta(vacio.otraAbierta);
                        }}
                      >
                        <IconoCerrar width={18} height={18} />
                      </button>
                    </span>
                  </div>
                  <hr className={estilos.divisorPasos} />
                  {/* Subcategorías ya usadas en esta disciplina (OL-101): elegir una cierra el renglón con el
                      resumen ("Artes visuales · Grabado"), o "Otra…" para escribir. Sin ninguna conocida
                      todavía, se va directo al texto, como hoy. */}
                  {subcategorias.length > 0 && (
                    <>
                      <p className={estilos.preguntaSubcategoria}>{preguntaSubcategoria(disciplinaElegida)}</p>
                      <div className={canon.chips}>
                        {subcategorias.map((s) => (
                          <Chip
                            key={s.detalle}
                            activo={!otraAbierta && normalizarNombre(detalle) === normalizarNombre(s.detalle)}
                            onClick={() => {
                              const siguiente = alElegirSubcategoria(s.detalle);
                              setDetalle(siguiente.detalle);
                              setOtraAbierta(siguiente.otraAbierta);
                              setAbierta(null);
                            }}
                          >
                            {s.detalle}
                          </Chip>
                        ))}
                        <Chip activo={otraAbierta} onClick={() => setOtraAbierta(true)}>
                          Otra…
                        </Chip>
                      </div>
                    </>
                  )}
                  {(subcategorias.length === 0 || otraAbierta) && (
                    <>
                      <span className={limpiar.caja}>
                        <input type="text" name="detalle" value={detalle} onChange={(e) => setDetalle(e.target.value)} maxLength={LIMITES_ARTISTA.detalle} placeholder="Ej. son huasteco, jazz (opcional)" aria-label="En una palabra" className={canon.entrada} autoComplete="off" />
                        <Limpiar visible={!!detalle} />
                        <ContadorCaracteres valor={detalle} tope={LIMITES_ARTISTA.detalle} error={errores.detalle} />
                      </span>
                      {/* Antes de crear una subcategoría nueva, ¿ya existe una parecida? (docs/rediseno/27). */}
                      {(() => {
                        const parecida = subcategoriaParecida(subcategorias, detalle);
                        if (!parecida) return null;
                        return (
                          <p className={canon.existe} role="status">
                            <IconoOk width={20} height={20} />
                            <span>
                              Ya hay <b>{parecida.artistas}</b> {parecida.artistas === 1 ? "artista" : "artistas"} con &ldquo;<b>{parecida.detalle}</b>&rdquo;.{" "}
                              <button
                                type="button"
                                className={canon.cambiar}
                                onClick={() => {
                                  const siguiente = alElegirSubcategoria(parecida.detalle);
                                  setDetalle(siguiente.detalle);
                                  setOtraAbierta(siguiente.otraAbierta);
                                  setAbierta(null);
                                }}
                              >
                                Usar esa
                              </button>
                            </span>
                          </p>
                        );
                      })()}
                    </>
                  )}
                </>
              ) : null}
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

        {/* 4. Ciudad: la de entrada casi siempre es la buena; si no, se busca en una hoja (el teclado no tapa los resultados). */}
        <li className={canon.resuelto}>
          <IconoPin width={20} height={20} />
          <span className={canon.clave}>Ciudad</span>
          <span className={canon.valor}>{ciudad}</span>
          <button type="button" className={canon.cambiar} onClick={() => setAbierta("ciudad")} aria-haspopup="dialog">
            Cambiar
          </button>
        </li>

        {/* 5. Foto: la cámara como acción; la foto puesta ocupa el sitio del icono. */}
        <li className={`${canon.resuelto} ${foto ? "" : canon.pendiente}`}>
          {foto ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
            <img src={foto} alt="" className={canon.miniatura} />
          ) : (
            <IconoCamara width={20} height={20} />
          )}
          <span className={canon.clave}>Foto</span>
          <span className={`${canon.valor} ${foto ? "" : canon.falta}`}>{subiendo ? "Subiendo…" : foto ? "Lista" : "Sin foto"}</span>
          <div className={canon.opciones}>
            <label className={canon.accionIcono} title={foto ? "Cambiar la foto" : "Elegir una foto"}>
              <IconoCamara width={22} height={22} />
              <input type="file" accept="image/*" onChange={alElegirFoto} disabled={subiendo} aria-label={foto ? "Cambiar la foto" : "Elegir una foto"} />
            </label>
            {foto && (
              <button
                type="button"
                className={canon.accionIcono}
                onClick={() => setFoto(null)}
                title="Quitar la foto"
                aria-label="Quitar la foto"
              >
                <IconoCerrar width={22} height={22} />
              </button>
            )}
          </div>
          {(errorFoto || errores.foto) && (
            <p className={canon.cuerpoNota} role="alert">
              {errorFoto ?? errores.foto}
            </p>
          )}
        </li>

        {/* 6. Soy yo / es mi grupo (solo en el alta; después lo liga el administrador). Al encender, el valor dice qué da. */}
        {esAlta && (
          <li className={canon.resuelto}>
            <IconoPersona width={20} height={20} />
            <span className={canon.clave}>Soy yo / es mi grupo</span>
            <span className={`${canon.valor} ${soy ? "" : canon.falta}`}>{soy ? "Sí: podrás editar la ficha y publicar sus fechas" : "No"}</span>
            <button type="button" role="switch" aria-checked={soy} aria-label="Soy yo / es mi grupo" className={canon.palanca} onClick={() => setSoy((s) => !s)} />
          </li>
        )}

        {/* 7. Más: redes y descripción. Se esconde, no se desmonta: lo escrito se queda aunque se cierre. */}
        <li className={`${canon.resuelto} ${masAbierto ? canon.abierta : canon.pendiente}`}>
          <IconoMas width={20} height={20} />
          <span className={canon.clave}>Más</span>
          <span className={`${canon.valor} ${canon.falta}`}>Redes, descripción</span>
          <button type="button" className={canon.cambiar} onClick={() => setMasAbierto((a) => !a)} aria-expanded={masAbierto}>
            {masAbierto ? "Listo" : "Agregar"}
          </button>
          <div className={canon.cuerpo} hidden={!masAbierto}>
            <SelectorEnlaces inicial={normalizarRedes(artista?.redes)} error={errores.enlaces} />
            <Campo etiqueta="Descripción" name="descripcion" multilinea defaultValue={artista?.descripcion ?? ""} maxLength={LIMITES_ARTISTA.descripcion} placeholder="Qué hace y dónde suele estar" error={errores.descripcion} mostrarContador />
            {esAdmin && <CampoImagenUrl valor={foto} onCambio={setFoto} />}
          </div>
        </li>
      </ul>

      <input type="hidden" name="disciplina" value={disciplina} />
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="foto" value={foto ?? ""} />
      <input type="hidden" name="soy" value={soy ? "1" : ""} />
      {/* El campo de texto de detalle solo está en el DOM cuando se ve (renglón abierto, sin subcategorías
          conocidas o en "Otra…"); en cualquier otro momento, este oculto lleva el valor al enviar. */}
      {!(abierta === "hace" && (subcategorias.length === 0 || otraAbierta)) && <input type="hidden" name="detalle" value={detalle} />}
      <input type="hidden" name="ciudad" value={ciudad} />

      {resultado && !resultado.ok && resultado.general && !repetido && (
        <p className="aviso-error" role="alert">
          {resultado.general}
        </p>
      )}
      {/* El botón dice solo su acción; la ayuda de qué falta va bajo el campo o el renglón (founder, 2026-09-21). */}
      <Boton type="submit" disabled={enviando || terminado || subiendo || !listo}>
        {enviando || terminado ? "Guardando…" : artista ? "Guardar cambios" : "Publicar artista"}
      </Boton>
    </form>
    {abierta === "ciudad" && <HojaCiudad ciudad={ciudad} ciudades={ciudades} onElegir={setCiudad} onCerrar={() => setAbierta(null)} />}
    {hojaSalir}
    </>
  );
}
