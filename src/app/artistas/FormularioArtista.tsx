"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useAbrirConError } from "@/components/ui/abrirConError";
import { useTerminar } from "@/components/ui/Atras";
import Boton from "@/components/ui/Boton";
import BotonIcono, { claseBotonIcono } from "@/components/ui/BotonIcono";
import BotonPublicar from "@/components/ui/BotonPublicar";
import Campo from "@/components/ui/Campo";
import ContadorCaracteres from "@/components/ui/ContadorCaracteres";
import { Chip } from "@/components/ui/Chip";
import { IconoCamara, IconoEncuadrar, IconoLapiz, IconoMas, IconoNota, IconoOk, IconoPersonas, IconoPin, IconoCerrar } from "@/components/ui/Iconos";
import Limpiar from "@/components/ui/Limpiar";
import limpiar from "@/components/ui/Limpiar.module.css";
import ListaFlotante from "@/components/ui/ListaFlotante";
import SelectorEnlaces from "@/components/SelectorEnlaces";
import { alElegirDisciplina, alElegirSubcategoria, alQuitarDisciplina, artistaIgual, DISCIPLINAS, etiquetaArtista, etiquetaDisciplina, etiquetaTipoArtista, hrefArtista, LIMITES_ARTISTA, pasoQueHace, preguntaSubcategoria, subcategoriaParecida, TIPOS_ARTISTA, type Artista, type ArtistaResumen, type Disciplina, type Subcategoria, type TipoArtista } from "@/lib/artistas";
import type { CiudadConArtistas } from "@/lib/ciudad";
import { normalizarRedes } from "@/lib/enlaces";
import { faltaEnArtista } from "@/lib/formulario";
import { normalizarNombre } from "@/lib/lugares";
import { apartarGuardia, reponerGuardia } from "@/lib/guardiaSalida";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { subirFoto } from "@/lib/subirFoto";
import FotoSubida from "@/components/ui/FotoSubida";
import useSubidaDeFoto from "@/components/ui/useSubidaDeFoto";
import CampoImagenUrl from "@/components/CampoImagenUrl";
import type { ResultadoArtista } from "./acciones";
import HojaCiudad from "./HojaCiudad";
import canon from "@/components/ui/FormularioCanon.module.css";
import renglon from "@/components/ui/Renglon.module.css";
import estilos from "./FormularioArtista.module.css";

type Props = {
  accion: (previo: ResultadoArtista | null, formData: FormData) => Promise<ResultadoArtista>;
  /** El artista que se edita (todo resuelto de entrada). El alta es por pasos (`/nuevo/artista`, OL-316). */
  artista: Artista;
  usuarioId: string;
  /** El administrador puede pegar la dirección de una foto (fichas importadas). */
  esAdmin?: boolean;
  /** La ciudad del artista. */
  ciudadInicial: string;
  /** Las ciudades que ya tienen artistas: las primeras opciones de la hoja Ciudad. */
  ciudades: CiudadConArtistas[];
};
/** Lo que trae la búsqueda por nombre: el artista con su ciudad (el mismo nombre en otra ciudad es otro artista). */
type Candidato = ArtistaResumen & { ciudad: string };

type Abierta = "hace" | "es" | "ciudad" | null;
/**
 * Editar un artista con el canon (docs/rediseno/15, decisiones 4 y 5): un campo arriba con el lápiz y, debajo, renglones resueltos: Qué
 * hace (la disciplina y su subcategoría, chips al abrir), Es, Ciudad (se busca en una hoja, pedido del founder del 2026-09-16, noche), Foto
 * y Portada con la cámara como acción y Más (redes, descripción). Si el nombre nuevo ya es de otra ficha, se dice con enlace, en un aviso
 * que flota sobre el layout sin empujar los renglones de abajo (founder, producción, 2026-09-21). El botón dice solo su acción; la ayuda de
 * qué falta va bajo el campo o el renglón que falta (founder, 2026-09-21: canon ampliado para todos los formularios, docs/rediseno/26). El
 * alta es por pasos (`/nuevo/artista`, OL-316): este formulario solo edita, como `FormularioLugar` tras OL-315.
 */
export default function FormularioArtista({ accion, artista, usuarioId, esAdmin = false, ciudadInicial, ciudades }: Props) {
  const [resultado, enviar, enviando] = useActionState<ResultadoArtista | null, FormData>(accion, null);
  // Guardado (al editar): la tarea termina sin quedarse en el historial; mientras vuelve, el botón sigue ocupado.
  const terminar = useTerminar();
  const terminado = resultado?.ok === true;
  useEffect(() => {
    if (resultado?.ok) terminar(resultado.volver);
  }, [resultado, terminar]);
  // Si el servidor no publicó, lo escrito sigue en pantalla: la guardia que apartó «Publicar» vuelve (OL-296).
  useEffect(() => {
    if (resultado && !resultado.ok) reponerGuardia();
  }, [resultado]);
  const errores = resultado && !resultado.ok ? resultado.errores : {};
  const existenteServidor = resultado && !resultado.ok ? resultado.existente : undefined;

  const [nombre, setNombre] = useState(artista.nombre);
  const [disciplinaElegida, setDisciplinaElegida] = useState<Disciplina | "">(artista.disciplina !== "por_completar" ? artista.disciplina : "");
  const [detalle, setDetalle] = useState(artista.detalle ?? "");
  const [tipo, setTipo] = useState<TipoArtista>(artista.tipo);
  const [ciudad, setCiudad] = useState(ciudadInicial);
  const [foto, setFoto] = useState<string | null>(artista.foto);
  const [portada, setPortada] = useState<string | null>(artista.portada);
  const subida = useSubidaDeFoto<"foto" | "portada">();
  const subiendo = !!subida.subiendo;
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [errorPortada, setErrorPortada] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<Abierta>(null);
  const [masAbierto, setMasAbierto] = useState(true);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  // Subcategorías ya usadas por disciplina (OL-101): una caché por disciplina, para no repetir la consulta.
  const [subcategoriasPorDisciplina, setSubcategoriasPorDisciplina] = useState<Record<string, Subcategoria[]>>({});
  // "Otra…" abre el texto libre aunque ya haya chips de subcategoría; sin subcategorías conocidas, va directo al texto.
  // Al editar una ficha que ya trae detalle, empieza abierto: es lo que ya se ve al llegar, se elija o no un chip después.
  const [otraAbierta, setOtraAbierta] = useState(!!artista.detalle);
  const formRef = useRef<HTMLFormElement>(null);
  // Los avisos de estos campos viven dentro de "Más": si llega uno con el renglón cerrado, se abre solo.
  useAbrirConError(formRef, setMasAbierto, errores.descripcion, errores.enlaces);
  // "Ya tiene ficha" flota sobre el layout, anclado al campo del nombre (ui/ListaFlotante), y solo vive
  // mientras el campo tiene el foco: al salir se cierra solo y, si sigue habiendo coincidencia, queda una línea de
  // ayuda bajo el campo — un panel que tapa el siguiente renglón sin poder cerrarlo es peor que uno que empuja
  // (revisión del gestor, 2026-09-21).
  const campoNombreRef = useRef<HTMLElement>(null);
  const [enfocadoNombre, setEnfocadoNombre] = useState(false);

  // Lo de la ficha; una ficha por completar (creada con solo el nombre desde el alta de un evento) sigue así hasta que se elija.
  const disciplina: Disciplina | "" = disciplinaElegida;
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
      setCandidatos(((data ?? []) as Candidato[]).filter((a) => a.id !== artista.id));
    }, 300);
    return () => clearTimeout(t);
  }, [nombre, artista.id]);

  /** Foto (el avatar) y portada (la imagen ancha de la cabecera) se suben igual; solo cambia dónde se guarda. */
  /** La espera es la de toda la app (`useSubidaDeFoto`, OL-353): la imagen elegida late en su hueco del renglón hasta que la subida se ve. */
  function subirImagen(e: React.ChangeEvent<HTMLInputElement>, cual: "foto" | "portada") {
    const [poner, ponerError] = cual === "foto" ? [setFoto, setErrorFoto] : [setPortada, setErrorPortada];
    return subida.subir(
      e,
      async (archivo) => {
        ponerError(null);
        const r = await subirFoto("artistas", usuarioId, cual, archivo, cual);
        if ("error" in r) return ponerError(r.error);
        poner(r.url);
        return r.url;
      },
      cual,
    );
  }

  const clave = normalizarNombre(nombre);
  const coincide = (a: ArtistaResumen | null | undefined) => !!a && clave.length > 0 && normalizarNombre(a.nombre) === clave;
  // Un artista es un artista en su ciudad (decisión 5 de 08 y la base): con otra ciudad, el mismo nombre es otro artista.
  const existente = artistaIgual(candidatos.filter((a) => a.ciudad === ciudad), nombre);
  const repetido = existente ?? (coincide(existenteServidor) ? existenteServidor : null);
  // Lo único que dice qué falta es la nota bajo el botón (doc 50, H-29 y H-32).
  const falta = faltaEnArtista({ nombre, conDisciplina: true, repetido: !!repetido });
  const valorHace = disciplina ? `${etiquetaDisciplina(disciplina)}${detalle.trim() ? ` · ${detalle.trim()}` : ""}` : "Disciplina";
  const avisoRepetidoAbierto = enfocadoNombre && !!repetido;

  return (
    <>
    <form
      ref={formRef}
      action={(fd) => {
        if (falta) return;
        apartarGuardia();
        enviar(fd);
      }}
      noValidate
    >
      {/* 1. El nombre. */}
      <label className={canon.campo} ref={campoNombreRef as React.RefObject<HTMLLabelElement>}>
        <IconoLapiz width={20} height={20} />
        <input
          name="nombre"
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onFocus={() => setEnfocadoNombre(true)}
          onBlur={() => setEnfocadoNombre(false)}
          maxLength={LIMITES_ARTISTA.nombre}
          placeholder="Nombre de artista o grupo"
          aria-label="Nombre de artista o grupo"
          aria-invalid={!!errores.nombre}
          autoComplete="off"
          autoCapitalize="words"
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
      ) : (
        // Con el campo sin foco, si sigue habiendo un repetido queda esta línea en vez del panel flotante: el
        // panel tapaba Qué hace sin poder cerrarse (revisión del gestor, 2026-09-21).
        !enfocadoNombre &&
        repetido && (
          <p className={canon.notaExiste}>
            <span>Ya tiene ficha: </span>
            <b className={canon.nombreRecortado}>{repetido.nombre}</b>
            <Link href={hrefArtista(repetido)}>Ver</Link>
          </p>
        )
      )}
      {/* Un artista es un artista (decisión 5 de 08): el mismo nombre no se registra dos veces; se abre el que ya
          está. Flota sobre el layout, anclado al campo del nombre, y solo vive mientras el campo tiene el foco
          (founder, producción, 2026-09-21; revisión del gestor, 2026-09-21). */}
      <ListaFlotante abierta={avisoRepetidoAbierto} onCerrar={() => setEnfocadoNombre(false)} ancla={campoNombreRef} id="aviso-nombre-repetido" etiqueta="Nombre que ya tiene ficha">
        {repetido && (
          <li className={`${canon.existe} ${canon.existeFlotante}`} role="status">
            <IconoOk width={20} height={20} />
            <span>
              <b>Ya tiene ficha:</b> <Link href={hrefArtista(repetido)}>{repetido.nombre}</Link> · {etiquetaArtista(repetido)}. Ábrela y, si es tuya, dilo ahí.
            </span>
          </li>
        )}
      </ListaFlotante>

      <ul className={renglon.renglones}>
        {/* 2. Qué hace: la disciplina y su subcategoría; chips y "en una palabra" al abrir. */}
        <li className={`${renglon.resuelto} ${renglon.sinClave} ${abierta === "hace" ? renglon.abierto : ""}`}>
          <IconoNota width={20} height={20} />
          <small>Qué hace</small>
          <b className={disciplina ? undefined : renglon.falta}>{valorHace}</b>
          <Boton type="button" variante="texto" alto="control" ancho="contenido" onClick={() => setAbierta(abierta === "hace" ? null : "hace")} aria-expanded={abierta === "hace"}>
            {abierta === "hace" ? "Listo" : disciplina ? "Cambiar" : "Elegir"}
          </Boton>
          {abierta === "hace" && (
            <div className={renglon.cuerpo}>
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
                    <Chip
                      variante="quitar"
                      onClick={() => {
                        const vacio = alQuitarDisciplina();
                        setDisciplinaElegida(vacio.disciplinaElegida);
                        setDetalle(vacio.detalle);
                        setOtraAbierta(vacio.otraAbierta);
                      }}
                    >
                      {etiquetaDisciplina(disciplinaElegida)}
                    </Chip>
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
                              <Boton
                                type="button"
                                variante="texto"
                                alto="control"
                                ancho="contenido"
                                onClick={() => {
                                  const siguiente = alElegirSubcategoria(parecida.detalle);
                                  setDetalle(siguiente.detalle);
                                  setOtraAbierta(siguiente.otraAbierta);
                                  setAbierta(null);
                                }}
                              >
                                Usar esa
                              </Boton>
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

        {/* 3. Es: solista, grupo o colectivo; chips al abrir. */}
        <li className={`${renglon.resuelto} ${renglon.sinClave} ${abierta === "es" ? renglon.abierto : ""}`}>
          <IconoPersonas width={20} height={20} />
          <small>Es</small>
          <b>{etiquetaTipoArtista(tipo)}</b>
          <Boton type="button" variante="texto" alto="control" ancho="contenido" onClick={() => setAbierta(abierta === "es" ? null : "es")} aria-expanded={abierta === "es"}>
            {abierta === "es" ? "Listo" : "Cambiar"}
          </Boton>
          {abierta === "es" && (
            <div className={renglon.cuerpo}>
              <div className={canon.chips}>
                {TIPOS_ARTISTA.map((t) => (
                  <Chip
                    key={t.valor}
                    activo={tipo === t.valor}
                    onClick={() => {
                      setTipo(t.valor);
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
        <li className={`${renglon.resuelto} ${renglon.sinClave}`}>
          <IconoPin width={20} height={20} />
          <small>Ciudad</small>
          <b>{ciudad}</b>
          <Boton type="button" variante="texto" alto="control" ancho="contenido" onClick={() => setAbierta("ciudad")} aria-haspopup="dialog">
            Cambiar
          </Boton>
        </li>

        {/* 5. Foto: la cámara como acción; la foto puesta ocupa el sitio del icono. */}
        <li className={`${renglon.resuelto} ${renglon.sinClave} ${foto ? "" : renglon.opcional}`} aria-busy={subida.subiendo === "foto" || undefined}>
          {foto || subida.vistaDe("foto") ? <FotoSubida src={foto} vista={subida.vistaDe("foto")} /> : <IconoCamara width={20} height={20} />}
          <small>Foto</small>
          <b className={foto ? undefined : renglon.falta}>{subida.subiendo === "foto" ? "Subiendo la foto…" : foto ? "Foto de perfil lista" : "Sin foto de perfil"}</b>
          <div className={renglon.opciones}>
            <label className={`${claseBotonIcono({ relieve: "contorno" })} ${canon.salida}`} title={foto ? "Cambiar la foto" : "Elegir una foto"} aria-disabled={subiendo || undefined}>
              <IconoCamara width={22} height={22} />
              <input type="file" accept="image/*" onChange={(e) => subirImagen(e, "foto")} disabled={subiendo} aria-label={foto ? "Cambiar la foto" : "Elegir una foto"} />
            </label>
            {foto && (
              <BotonIcono relieve="contorno" onClick={() => setFoto(null)} title="Quitar la foto" aria-label="Quitar la foto">
                <IconoCerrar width={22} height={22} />
              </BotonIcono>
            )}
          </div>
          {(errorFoto || errores.foto) && (
            <p className={renglon.nota} role="alert">
              {errorFoto ?? errores.foto}
            </p>
          )}
        </li>

        {/* 6. Portada: opcional, la imagen ancha de la cabecera; sin ella la ficha lleva el símbolo SN. */}
        <li className={`${renglon.resuelto} ${renglon.sinClave} ${portada ? "" : renglon.opcional}`} aria-busy={subida.subiendo === "portada" || undefined}>
          {portada || subida.vistaDe("portada") ? <FotoSubida src={portada} vista={subida.vistaDe("portada")} /> : <IconoEncuadrar width={20} height={20} />}
          <small>Portada</small>
          <b className={portada ? undefined : renglon.falta}>{subida.subiendo === "portada" ? "Subiendo la portada…" : portada ? "Portada lista" : "Sin portada"}</b>
          <div className={renglon.opciones}>
            <label className={`${claseBotonIcono({ relieve: "contorno" })} ${canon.salida}`} title={portada ? "Cambiar la portada" : "Elegir una portada"} aria-disabled={subiendo || undefined}>
              <IconoCamara width={22} height={22} />
              <input type="file" accept="image/*" onChange={(e) => subirImagen(e, "portada")} disabled={subiendo} aria-label={portada ? "Cambiar la portada" : "Elegir una portada"} />
            </label>
            {portada && (
              <BotonIcono relieve="contorno" onClick={() => setPortada(null)} title="Quitar la portada" aria-label="Quitar la portada">
                <IconoCerrar width={22} height={22} />
              </BotonIcono>
            )}
          </div>
          {(errorPortada || errores.portada) && (
            <p className={renglon.nota} role="alert">
              {errorPortada ?? errores.portada}
            </p>
          )}
        </li>

        {/* 7. Más: redes y descripción. Se esconde, no se desmonta: lo escrito se queda aunque se cierre. */}
        <li className={`${renglon.resuelto} ${renglon.sinClave} ${masAbierto ? renglon.abierto : renglon.opcional}`}>
          <IconoMas width={20} height={20} />
          <small>Más</small>
          <b className={renglon.falta}>Redes, descripción</b>
          <Boton type="button" variante="texto" alto="control" ancho="contenido" onClick={() => setMasAbierto((a) => !a)} aria-expanded={masAbierto}>
            {masAbierto ? "Listo" : "Agregar"}
          </Boton>
          <div className={renglon.cuerpo} hidden={!masAbierto}>
            <SelectorEnlaces inicial={normalizarRedes(artista.redes)} error={errores.enlaces} />
            <Campo etiqueta="Descripción" name="descripcion" multilinea defaultValue={artista.descripcion ?? ""} maxLength={LIMITES_ARTISTA.descripcion} placeholder="Qué hace y dónde suele estar" error={errores.descripcion} mostrarContador />
            {esAdmin && <CampoImagenUrl etiqueta="O pega la dirección de la foto" valor={foto} onCambio={setFoto} />}
            {esAdmin && <CampoImagenUrl etiqueta="O pega la dirección de la portada" valor={portada} onCambio={setPortada} />}
          </div>
        </li>
      </ul>

      <input type="hidden" name="disciplina" value={disciplina} />
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="foto" value={foto ?? ""} />
      <input type="hidden" name="portada" value={portada ?? ""} />
      {/* El campo de texto de detalle solo está en el DOM cuando se ve (renglón abierto, sin subcategorías
          conocidas o en "Otra…"); en cualquier otro momento, este oculto lleva el valor al enviar. */}
      {!(abierta === "hace" && (subcategorias.length === 0 || otraAbierta)) && <input type="hidden" name="detalle" value={detalle} />}
      <input type="hidden" name="ciudad" value={ciudad} />

      {resultado && !resultado.ok && resultado.general && !repetido && (
        <p className="aviso-error" role="alert">
          {resultado.general}
        </p>
      )}
      <BotonPublicar id="falta-artista" falta={falta} ocupado={enviando || terminado || subiendo}>
        {enviando || terminado ? "Guardando…" : "Guardar cambios"}
      </BotonPublicar>
    </form>
    {abierta === "ciudad" && <HojaCiudad ciudad={ciudad} ciudades={ciudades} onElegir={setCiudad} onCerrar={() => setAbierta(null)} />}
    </>
  );
}
