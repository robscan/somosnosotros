"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { buscarUnificado } from "@/app/accionesBuscar";
import ChipCiudad from "@/components/Ciudad";
import { useMemoriaPantalla } from "@/components/MemoriaPantalla";
import { prestarALaBarra } from "@/components/prestamoBarra";
import Boton from "@/components/ui/Boton";
import { CampoBuscar } from "@/components/ui/Buscador";
import { Chip, Chips } from "@/components/ui/Chip";
import Cerrar from "@/components/ui/Cerrar";
import Grupo from "@/components/ui/Grupo";
import Renglon from "@/components/ui/Renglon";
import { enlaceDeAlta, enlaceDeBusqueda } from "@/lib/armazon";
import { armarVista, atajosDeLaSemana, hrefEnMapa, metaConTipo, metaDe, POR_GRUPO, ROTULO, type Encontrado, type GrupoBuscador, type ResultadoBusqueda } from "@/lib/buscarUnificado";
import { CIUDAD_INICIAL, ciudadesPorCercania, raizConCiudad, type Ciudad, type CiudadConDatos } from "@/lib/ciudad";
import { normalizarNombre } from "@/lib/lugares";
import { crudoDeRecientes, guardarReciente, leerRecientes, type Reciente } from "@/lib/recientesBusqueda";
import plantilla from "@/components/ui/Plantilla.module.css";
import styles from "./buscar.module.css";

/** Cuánto se espera, tras la última letra, antes de buscar (ms). */
const ESPERA_MS = 250;
/** A dónde vuelve la ✕ si no hay pantalla de la que se viniera: la raíz de la sección desde la que se abrió Buscar. */
const SALIDA: Record<GrupoBuscador, { raiz: string; texto: string }> = {
  eventos: { raiz: "/", texto: "Inicio" },
  lugares: { raiz: "/lugares", texto: "Lugares" },
  artistas: { raiz: "/artistas", texto: "Artistas" },
};

type Respuesta = { texto: string; resultado: ResultadoBusqueda };
/** Lo que Buscar recuerda al salir a una ficha y repone al volver (Atrás): lo escrito, el chip, lo desplegado y lo encontrado. */
type Recordado = { texto: string; tipo: GrupoBuscador | null; abiertos: GrupoBuscador[]; respuesta: Respuesta | null };

type Props = {
  ciudad: Ciudad;
  ciudades: CiudadConDatos[];
  /** El tipo de la sección desde la que se abrió Buscar: su grupo sale primero. */
  desde: GrupoBuscador;
  /** Hoy en la ciudad, YYYY-MM-DD (lo decide el servidor para que cliente y servidor coincidan): los atajos de la semana se cuentan desde ahí. */
  hoy: string;
  /** Con sesión, lo que no se encuentra se ofrece registrar (publicar pide cuenta, como todo lo que publica). */
  conSesion: boolean;
};

/** Un dato por línea bajo el nombre del renglón; cada uno se corta con puntos suspensivos al llegar al borde. */
function Meta({ lineas }: { lineas: string[] }) {
  return lineas.map((linea) => (
    <span key={linea}>
      <span>{linea}</span>
    </span>
  ));
}

const sinCambios = () => () => {};
/** Los recientes de este aparato: en el servidor no hay ninguno y el teléfono los completa al hidratar (sin desajuste). */
function useRecientes(): Reciente[] {
  const crudo = useSyncExternalStore(sinCambios, crudoDeRecientes, () => null);
  return useMemo(() => leerRecientes(crudo), [crudo]);
}

/**
 * Buscar (docs/rediseno/50, OL-237; prototipo firmado, «Buscar»): la pantalla de la lupa de la barra, desde cualquier sección y en
 * los tres tamaños. Una barra de tarea con el campo y la ✕. Antes de escribir: la ciudad, lo último que se abrió desde aquí y tres
 * atajos de la semana (Hoy, Fin de semana, Gratis) que llevan a Agenda con ese filtro puesto. Con texto (desde dos letras, sin
 * acentos, tras una espera corta): el mejor resultado solo si lo escrito es el nombre entero de algo o solo encaja al inicio de un
 * único nombre, y una lista en grupos por tipo, el de la sección de origen primero; tres por grupo y «Ver N más» que despliega ahí
 * mismo. Con más de un tipo en lo encontrado, chips para dejar solo uno. La persona nunca elige dónde buscar: las tres cosas se
 * buscan a la vez. Elegir un resultado abre su ficha (desde Lugares, un lugar vuelve al mapa con su ficha en la hoja) y Atrás repone
 * esta pantalla como estaba. Si no hay nada con lo escrito y hay sesión, se ofrece registrarlo: como lugar si se abrió desde Lugares, como
 * artista desde cualquier otra sección (a una persona o a un grupo se le da de alta por su nombre; un evento pide más que eso).
 */
export default function BuscarPantalla({ ciudad, ciudades, desde, hoy, conSesion }: Props) {
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState<GrupoBuscador | null>(null);
  const [abiertos, setAbiertos] = useState<GrupoBuscador[]>([]);
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
  const campo = useRef<HTMLInputElement>(null);
  const orden = useMemo(() => ciudadesPorCercania(ciudad, ciudades), [ciudad, ciudades]);
  const recientes = useRecientes();

  const slugEnUrl = ciudad.slug === CIUDAD_INICIAL.slug ? null : ciudad.slug;
  const consulta = texto.trim();
  const buscable = normalizarNombre(consulta).length >= 2;
  const cargando = buscable && respuesta?.texto !== consulta;
  const vista = buscable && respuesta ? armarVista(respuesta.resultado, respuesta.texto, desde, tipo) : null;
  const buscado = respuesta?.texto ?? "";

  // Buscar no se apila sobre Buscar: su lupa, en la barra de la app, enfoca el campo.
  useEffect(() => prestarALaBarra({ buscar: () => campo.current?.focus() }), []);

  // Al volver de una ficha, sin robar el foco: lo escrito, lo elegido y lo que se encontró, tal como estaba.
  useMemoriaPantalla<Recordado>(null, { texto, tipo, abiertos, respuesta }, (r) => {
    setTexto(r.texto);
    setTipo(r.tipo);
    setAbiertos(r.abiertos);
    setRespuesta(r.respuesta);
    campo.current?.blur();
  });

  // Poco después de la última letra se busca; lo que llega tarde, de un texto que ya cambió, se descarta.
  useEffect(() => {
    if (!buscable || respuesta?.texto === consulta) return;
    let vigente = true;
    const espera = window.setTimeout(() => {
      void buscarUnificado(consulta, orden).then((resultado) => {
        if (!vigente) return;
        setRespuesta({ texto: consulta, resultado });
        setAbiertos([]);
      });
    }, ESPERA_MS);
    return () => {
      vigente = false;
      window.clearTimeout(espera);
    };
  }, [consulta, buscable, orden, respuesta]);

  /** Un lugar, desde Lugares, vuelve al mapa con su ficha en la hoja; lo demás abre su ficha. */
  const hrefDe = (grupo: GrupoBuscador, e: Encontrado) => (grupo === "lugares" && desde === "lugares" ? hrefEnMapa(e) : e.href);

  function renglon(grupo: GrupoBuscador, e: Encontrado, conTipo = false) {
    const meta = metaDe(e, ciudad.nombre);
    const href = hrefDe(grupo, e);
    return (
      <Renglon key={`${grupo}-${e.id}`} href={href} foto={e.foto} redonda={grupo === "artistas"} titulo={e.titulo} onClick={() => guardarReciente({ grupo, id: e.id, href, foto: e.foto, titulo: e.titulo, meta })}>
        <Meta lineas={conTipo ? metaConTipo(grupo, meta) : meta} />
      </Renglon>
    );
  }

  /** La tecla de buscar del teléfono: los resultados ya están a la vista, así que solo cierra el teclado. */
  function alEnviar(e: FormEvent) {
    e.preventDefault();
    campo.current?.blur();
  }

  const salida = SALIDA[desde];
  return (
    <main className={`${plantilla.raizSinNav} ${styles.buscar}`}>
      <form role="search" className={styles.barra} onSubmit={alEnviar}>
        <CampoBuscar inputRef={campo} valor={texto} onCambiar={setTexto} placeholder="Buscar evento, lugar o artista" ariaLabel="Buscar evento, lugar o artista" autoFocus borrar={false} />
        <Cerrar href={raizConCiudad(salida.raiz, slugEnUrl ? `ciudad=${slugEnUrl}` : "")} texto={salida.texto} relieve="plano" />
      </form>

      {!buscable && (
        <>
          <div className={styles.contexto}>
            <ChipCiudad ciudad={ciudad} ciudades={ciudades} hrefDe={(c) => enlaceDeBusqueda(c.slug === CIUDAD_INICIAL.slug ? null : c.slug, desde)} />
          </div>
          {recientes.length > 0 && (
            <Grupo titulo="Recientes">
              {recientes.map((r) => (
                <Renglon key={`${r.grupo}-${r.id}`} href={r.href} foto={r.foto} redonda={r.grupo === "artistas"} titulo={r.titulo} onClick={() => guardarReciente(r)}>
                  <Meta lineas={metaConTipo(r.grupo, r.meta)} />
                </Renglon>
              ))}
            </Grupo>
          )}
          {/* Cada atajo reemplaza a Buscar por Agenda (filtrar no es navegar): Atrás desde Agenda no vuelve aquí. */}
          <Grupo titulo="Esta semana">
            <li className={styles.atajos}>
              <Chips ariaLabel="Esta semana" envuelve>
                {atajosDeLaSemana(hoy, slugEnUrl).map((a) => (
                  <Chip key={a.etiqueta} href={a.href}>
                    {a.etiqueta}
                  </Chip>
                ))}
              </Chips>
            </li>
          </Grupo>
        </>
      )}

      {buscable && (
        <div aria-busy={cargando}>
          {!vista && <p className={styles.aviso} role="status">Buscando…</p>}
          {vista && vista.tipos.length === 0 && (
            <div className={styles.vacio}>
              <p>{`Nada con «${buscado}».`}</p>
              {conSesion && (
                <Boton href={enlaceDeAlta(desde === "lugares" ? "lugar" : "artista", slugEnUrl, buscado).href} variante="secundario" ancho="contenido">
                  {desde === "lugares" ? `Registrar «${buscado}» como lugar` : `Registrar a «${buscado}» como artista`}
                </Boton>
              )}
            </div>
          )}
          {vista && vista.tipos.length > 1 && (
            <div className={styles.tipos}>
              <Chips ariaLabel="Tipo de resultado">
                <Chip activo={!vista.elegido} onClick={() => setTipo(null)}>
                  Todo
                </Chip>
                {vista.tipos.map((g) => (
                  <Chip key={g} activo={vista.elegido === g} onClick={() => setTipo(g)}>
                    {ROTULO[g].grupo}
                  </Chip>
                ))}
              </Chips>
            </div>
          )}
          {vista?.mejor && <Grupo titulo="Mejor resultado">{renglon(vista.mejor.grupo, vista.mejor.encontrado, true)}</Grupo>}
          {vista?.grupos.map(({ grupo, encontrados }) => {
            const completo = !!vista.elegido || abiertos.includes(grupo);
            return (
              <Grupo key={grupo} titulo={ROTULO[grupo].grupo}>
                {(completo ? encontrados : encontrados.slice(0, POR_GRUPO)).map((e) => renglon(grupo, e))}
                {!completo && encontrados.length > POR_GRUPO && (
                  <li className={styles.mas}>
                    <Boton variante="texto" ancho="completo" onClick={() => setAbiertos([...abiertos, grupo])}>
                      {`Ver ${encontrados.length - POR_GRUPO} más`}
                    </Boton>
                  </li>
                )}
              </Grupo>
            );
          })}
        </div>
      )}
    </main>
  );
}
