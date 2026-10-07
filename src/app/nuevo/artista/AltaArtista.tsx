"use client";

import { useActionState, useCallback, useEffect, useReducer, useState } from "react";
import PorPasos from "@/components/PorPasos";
import Hoja from "@/components/ui/Hoja";
import { IconoPersona, IconoPersonas } from "@/components/ui/Iconos";
import Opcion from "@/components/ui/Opcion";
import HojaCiudad from "@/app/artistas/HojaCiudad";
import type { ResultadoArtista } from "@/app/artistas/acciones";
import { enlaceAltaEvento, enlaceAltaLugar } from "@/lib/armazon";
import { artistaIgual, TIPOS_ARTISTA, type ArtistaResumen, type Disciplina, type Subcategoria } from "@/lib/artistas";
import type { CiudadConArtistas } from "@/lib/ciudad";
import { apartarGuardia, reponerGuardia } from "@/lib/guardiaSalida";
import { medirCliente } from "@/lib/medir";
import { subirFoto } from "@/lib/subirFoto";
import TiraTipos from "../TiraTipos";
import { avance, estadoInicial, faltaParaPublicar, flujo, pasoActual, type Arranque, type Paso, type Respuestas } from "./pasos";
import { PasoHace, PasoMas, PasoNombre, PasoSub, preguntaSub } from "./PasosArtista";
import Publicado from "./Publicado";
import Revisa from "./Revisa";
import useArtistasConNombre from "./useArtistasConNombre";
import evento from "../evento/AltaEvento.module.css";

type Accion = (previo: ResultadoArtista | null, formData: FormData) => Promise<ResultadoArtista>;

type Props = {
  /** La acción del alta de artista (`crearArtista`): con `quedarse`, devuelve lo creado sin salir de la pantalla. */
  accion: Accion;
  /** La de editar (`actualizarArtista`): guarda la foto que se agrega en «Publicado». */
  actualizar: (id: string, previo: ResultadoArtista | null, formData: FormData) => Promise<ResultadoArtista>;
  /** Las subcategorías ya usadas en cada disciplina, las más usadas primero (`subcategorias_de`). */
  subcategorias: Partial<Record<Disciplina, Subcategoria[]>>;
  /** Las ciudades con artistas, para cambiar la del artista en «Revisa». */
  ciudades: CiudadConArtistas[];
  /** La ciudad que venía en la dirección (`?ciudad=`), tal cual: la llevan los enlaces de la tira. */
  conCiudad: string | null;
  /** A dónde sale la ✕ del primer paso: Artistas, en la ciudad que se veía. */
  salida: { href: string; texto: string };
  /** Quien registra: la carpeta de Storage de la foto y la portada. */
  usuarioId: string;
  /** La administración ve también la dirección de una imagen. */
  esAdmin: boolean;
  /** Con qué se abre: el nombre que se buscó (Buscar) y la ciudad del artista de entrada. */
  arranque: Arranque;
};

const FORMULARIO = "registrar-artista";
const PREGUNTA: Partial<Record<Paso, string>> = { nombre: "¿Cómo se llama?", hace: "¿Qué hace?", mas: "¿Quieres agregar algo?" };

/** Lo que el servidor devolvió al publicar, y la foto si se agregó en «Publicado». */
type Creado = { id: string; slug: string | null; foto: string | null };

/** Lo que viaja al servidor: los campos del alta de siempre (`crearArtista`) y, para guardar la foto de «Publicado», los de editar. */
function campos(r: Respuestas, foto = r.foto): Record<string, string> {
  return {
    nombre: r.nombre,
    disciplina: r.disciplina ?? "",
    detalle: r.detalle,
    tipo: r.tipo ?? "",
    ciudad: r.ciudad,
    foto: foto ?? "",
    portada: r.portada ?? "",
    descripcion: r.descripcion,
    enlaces: JSON.stringify(r.redes),
  };
}

/**
 * El alta de artista por pasos (OL-316; prototipo firmado `lugar-artista-por-pasos.html`, casos 5 a 7, y su acta, bitácora 342): ¿Cómo se
 * llama? (con «Ya tiene ficha» y la tira al pie) → ¿Qué hace? (solo si el nombre no lo dijo) → ¿Qué tipo de …? (solo tras elegirla) →
 * Revisa → Publicado. El mismo armazón que el alta de evento y la de lugar (`PorPasos`): una pregunta por pantalla, Atrás que conserva lo
 * contestado, pie que dice qué falta y se queda sobre el teclado, guardia de salida. Las respuestas viven en el reductor de `pasos.ts`; lo que
 * se publica viaja en un formulario escondido con los campos del alta de siempre (`crearArtista`) más `soy` y `quedarse`, y es lo que mira la
 * guardia. Nada se publica sin leerse: ni la disciplina ni solista o grupo salen por omisión. Publicar aparta la guardia; si el servidor
 * devuelve un error, vuelve y el error sale en «Revisa». «Publicar otro» vuelve a montar el alta con otra `key`: todo vacío y la guardia de
 * nuevo.
 */
export default function AltaArtista(props: Props) {
  const [vuelta, setVuelta] = useState(0);
  return <AltaPorPasos key={vuelta} {...props} arranque={vuelta === 0 ? props.arranque : { ciudad: props.arranque.ciudad }} onOtro={() => setVuelta((v) => v + 1)} />;
}

function AltaPorPasos({ accion, actualizar, subcategorias, ciudades, conCiudad, salida, usuarioId, esAdmin, arranque, onOtro }: Props & { onOtro: () => void }) {
  const [estado, despachar] = useReducer(flujo, { arranque, subcategorias }, estadoInicial);
  const { r } = estado;
  const paso = pasoActual(estado);
  const cambiar = useCallback((cambios: Partial<Respuestas>) => despachar({ tipo: "cambiar", cambios }), []);
  const atras = useCallback(() => despachar({ tipo: "atras", desde: paso }), [paso]);
  const abrir = (p: Paso) => despachar({ tipo: "abrir", paso: p });
  const [hoja, setHoja] = useState<"es" | "ciudad" | null>(null);
  const [creado, setCreado] = useState<Creado | null>(null);
  const [foto, setFoto] = useState<{ subiendo: boolean; error: string | null }>({ subiendo: false, error: null });
  // La ciudad con que se publicó por última vez: «Ya hay una ficha con ese nombre» del servidor vale para esa ciudad, no para otra.
  const [ciudadEnviada, setCiudadEnviada] = useState<string | null>(null);
  const [resultado, enviar, enviando] = useActionState<ResultadoArtista | null, FormData>(async (previo, datos) => {
    setCiudadEnviada(String(datos.get("ciudad") ?? ""));
    const hecho = await accion(previo, datos);
    if (hecho.ok) {
      setCreado({ id: hecho.id, slug: hecho.slug ?? null, foto: String(datos.get("foto") ?? "") || null });
      medirCliente("artista_creado", { soy: datos.get("soy") === "1" ? "si" : "no" });
      despachar({ tipo: "publicado" });
    }
    return hecho;
  }, null);
  useEffect(() => {
    if (resultado && !resultado.ok) reponerGuardia();
  }, [resultado]);
  const errores = resultado && !resultado.ok ? resultado.errores : {};

  // Un artista es un artista en su ciudad (decisión 5 de 08 y la base): el que ya se llama igual ahí no se publica dos veces.
  const candidatos = useArtistasConNombre(r.nombre);
  const existenteServidor = resultado && !resultado.ok && ciudadEnviada === r.ciudad ? resultado.existente : undefined;
  const repetido: ArtistaResumen | null = artistaIgual(candidatos.filter((a) => a.ciudad === r.ciudad), r.nombre) ?? (existenteServidor && artistaIgual([existenteServidor], r.nombre)) ?? null;
  const falta = faltaParaPublicar(r, !!repetido);

  function publicar(fd: FormData) {
    if (falta) return;
    apartarGuardia();
    enviar(fd);
  }

  /** «Agrega una foto» en «Publicado»: se sube y se guarda en la ficha recién publicada con la acción de editar (todo lo demás, igual). */
  async function agregarFoto(archivo: File) {
    if (!creado || foto.subiendo) return;
    setFoto({ subiendo: true, error: null });
    const subida = await subirFoto("artistas", usuarioId, "foto", archivo, "foto");
    if ("error" in subida) return setFoto({ subiendo: false, error: subida.error });
    const fd = new FormData();
    for (const [clave, valor] of Object.entries(campos(r, subida.url))) fd.set(clave, valor);
    const hecho = await actualizar(creado.id, null, fd).catch(() => null);
    if (!hecho?.ok) return setFoto({ subiendo: false, error: "No se pudo guardar la foto. Intenta de nuevo." });
    setCreado({ ...creado, foto: subida.url });
    setFoto({ subiendo: false, error: null });
  }

  return (
    <PorPasos
      titulo={paso === "revisa" ? "Revisa" : "Registrar artista"}
      paso={paso}
      direccion={estado.direccion}
      avance={avance(paso)}
      salida={salida}
      onAtras={estado.pila.length > 1 ? atras : undefined}
      pregunta={paso === "sub" && r.disciplina ? preguntaSub(r.disciplina) : PREGUNTA[paso]}
      fijo={
        <form id={FORMULARIO} action={publicar} hidden>
          {Object.entries(campos(r)).map(([clave, valor]) => (
            <input key={clave} type="hidden" name={clave} value={valor} />
          ))}
          <input type="hidden" name="soy" value={r.soy ? "1" : ""} />
          <input type="hidden" name="quedarse" value="1" />
        </form>
      }
    >
      {paso === "nombre" && (
        <PasoNombre
          nombre={r.nombre}
          ciudad={r.ciudad}
          candidatos={candidatos}
          tira={<TiraTipos actual="artista" enPie destinos={{ evento: enlaceAltaEvento({ ciudad: conCiudad }), lugar: enlaceAltaLugar({ ciudad: conCiudad }) }} />}
          onNombre={(nombre) => despachar({ tipo: "nombrar", nombre })}
          onSeguir={() => despachar({ tipo: "seguir" })}
        />
      )}
      {paso === "hace" && <PasoHace onElegir={(valor) => despachar({ tipo: "hace", valor })} />}
      {paso === "sub" && r.disciplina && <PasoSub disciplina={r.disciplina} detalle={r.detalle} subcategorias={subcategorias[r.disciplina] ?? []} error={errores.detalle} onElegir={(detalle) => despachar({ tipo: "sub", detalle })} />}
      {paso === "revisa" && (
        <Revisa
          r={r}
          errores={errores}
          general={resultado && !resultado.ok ? resultado.general : undefined}
          repetido={repetido}
          enviando={enviando}
          falta={falta}
          formulario={FORMULARIO}
          onAbrir={abrir}
          onEs={() => setHoja("es")}
          onCiudad={() => setHoja("ciudad")}
          onSoy={(soy) => cambiar({ soy })}
        />
      )}
      {paso === "mas" && <PasoMas r={r} usuarioId={usuarioId} esAdmin={esAdmin} errores={errores} onCambio={cambiar} onListo={() => despachar({ tipo: "seguir" })} />}
      {paso === "publicado" && creado && r.disciplina && r.tipo && (
        <Publicado
          artista={{ id: creado.id, slug: creado.slug ?? "", nombre: r.nombre.trim(), disciplina: r.disciplina, detalle: r.detalle || null, tipo: r.tipo, foto: creado.foto }}
          subiendo={foto.subiendo}
          errorFoto={foto.error}
          onFoto={(archivo) => void agregarFoto(archivo)}
          onOtro={onOtro}
        />
      )}
      {hoja === "es" && (
        <Hoja etiqueta="Solista, grupo o colectivo" titulo="¿Es solista, grupo o colectivo?" onCerrar={() => setHoja(null)}>
          <div className={evento.opciones} role="group" aria-label="Solista, grupo o colectivo">
            {TIPOS_ARTISTA.map((t) => (
              <Opcion
                key={t.valor}
                compacta
                icono={t.valor === "solista" ? <IconoPersona width={20} height={20} /> : <IconoPersonas width={20} height={20} />}
                titulo={t.etiqueta}
                onClick={() => {
                  despachar({ tipo: "es", valor: t.valor });
                  setHoja(null);
                }}
              />
            ))}
          </div>
        </Hoja>
      )}
      {hoja === "ciudad" && <HojaCiudad ciudad={r.ciudad} ciudades={ciudades} onElegir={(ciudad) => cambiar({ ciudad })} onCerrar={() => setHoja(null)} />}
    </PorPasos>
  );
}
