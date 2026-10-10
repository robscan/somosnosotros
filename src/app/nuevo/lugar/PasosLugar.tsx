"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import CampoImagenUrl from "@/components/CampoImagenUrl";
import MapaDondeEs from "@/components/MapaDondeEs";
import { PiePaso } from "@/components/PorPasos";
import SelectorEnlaces from "@/components/SelectorEnlaces";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Casilla from "@/components/ui/Casilla";
import ContadorCaracteres from "@/components/ui/ContadorCaracteres";
import { IconoBuscar, IconoEtiqueta, IconoOk, IconoPin, IconoUbicacion } from "@/components/ui/Iconos";
import Limpiar from "@/components/ui/Limpiar";
import ListaFlotante from "@/components/ui/ListaFlotante";
import Opcion from "@/components/ui/Opcion";
import useAlto from "@/components/ui/useAlto";
import canon from "@/components/ui/FormularioCanon.module.css";
import sug from "@/components/ui/Sugerencia.module.css";
import { lugaresPorTexto, type LugarSugerido } from "@/lib/buscarLugares";
import type { Ciudad } from "@/lib/ciudad";
import { configPublica } from "@/lib/config";
import type { ContextoDireccion } from "@/lib/direccionContexto";
import type { Enlace } from "@/lib/enlaces";
import type { Punto } from "@/lib/geo";
import { lugarDesdePunto } from "@/lib/geocodificar";
import { hrefLugar, LIMITES_LUGAR, TIPOS, type ErroresLugar, type LugarResumen, type Tipo } from "@/lib/lugares";
import { subirFoto } from "@/lib/subirFoto";
import FotoSubida from "@/components/ui/FotoSubida";
import useSubidaDeFoto from "@/components/ui/useSubidaDeFoto";
import { lugarAlLado, type Candidato } from "../evento/pasos";
import { useBusquedaSitio } from "../evento/useBusquedaSitio";
import { RADIO_ES_ESTE_M, type Respuestas, type Sitio } from "./pasos";
import evento from "../evento/AltaEvento.module.css";
import formulario from "@/app/lugares/FormularioLugar.module.css";
import styles from "./AltaLugar.module.css";

/**
 * Los pasos del alta de lugar (OL-315; prototipo firmado `lugar-artista-por-pasos.html`, casos 1 a 4): cada uno pinta lo suyo dentro de
 * `PorPasos`, que pone la barra y la pregunta. Cuando la respuesta es un toque (una sugerencia, un tipo) elegir avanza; cuando hay que
 * escribir o mover el pin, el botón del pie dice qué falta.
 */

/** Intro en el teclado del teléfono hace lo mismo que el botón del pie. */
const conIntro = (seguir: (() => void) | null) => (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter" && seguir) seguir();
};

/** Tocar el enlace a la ficha de un lugar que ya existe, viniendo de un sitio (OL-366): `AltaLugar` le liga sus eventos antes de abrirla. */
export type AlElegir = (e: MouseEvent<HTMLAnchorElement>, lugar: LugarResumen) => void;

/**
 * ¿Cómo se llama? El campo con lupa, ✕ y contador; con 3 letras o más, una lista flotante bajo él: primero los lugares del directorio que
 * coinciden («Ya tiene ficha · Ir a su ficha»: la salida es ir a esa ficha, no publicar otra) y debajo lo que trae el mapa (tocar uno trae
 * dirección, punto, ciudad y, si lo dice, el tipo, y lleva a confirmarlo en el mapa). «Siguiente» sigue sin sugerencia: el mapa preguntará
 * «¿Dónde está?». Al pie, bajo «Siguiente», la tira Evento · Lugar · Artista (`tira`), solo en este paso.
 */
export function PasoNombre({ nombre, lugares, contexto, tira, onNombre, onSugerencia, onSeguir, alElegir }: { nombre: string; lugares: LugarResumen[]; contexto: ContextoDireccion; tira: ReactNode; onNombre: (nombre: string) => void; onSugerencia: (c: Candidato) => void; onSeguir: () => void; alElegir?: AlElegir }) {
  const ancla = useRef<HTMLLabelElement>(null);
  const pie = useRef<HTMLElement>(null);
  const altoPie = useAlto(pie);
  // La lista se cierra con un toque fuera y se abre sola en cuanto el texto cambia: se guarda PARA QUÉ texto se cerró.
  const [cerradaPara, setCerradaPara] = useState<string | null>(null);
  const [eligiendo, setEligiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const texto = nombre.trim();
  const listo = !!texto;
  const busqueda = useBusquedaSitio(nombre, contexto);
  const conFicha = texto.length >= 3 ? lugaresPorTexto(lugares, nombre) : [];
  const delMapa = busqueda.opciones;
  const buscando = texto.length >= 3 && !busqueda.lista;
  const hay = conFicha.length > 0 || delMapa.length > 0 || buscando || busqueda.falla || eligiendo;
  const abierta = texto.length >= 3 && cerradaPara !== nombre && hay;

  async function elegirDelMapa(item: LugarSugerido) {
    if (eligiendo) return;
    setEligiendo(true);
    setError(null);
    const candidato = await busqueda.elegir(item);
    setEligiendo(false);
    if (candidato) onSugerencia(candidato);
    else setError("No pude ubicar esa opción. Sigue y búscalo en el mapa.");
  }

  return (
    <>
      <label className={`${canon.campo} ${listo ? "" : canon.campoFalta}`} ref={ancla}>
        <IconoBuscar width={20} height={20} />
        <input
          type="text"
          value={nombre}
          onChange={(e) => {
            setError(null);
            onNombre(e.target.value);
          }}
          onKeyDown={conIntro(listo ? onSeguir : null)}
          maxLength={LIMITES_LUGAR.nombre}
          placeholder="Nombre del lugar"
          aria-label="Nombre del lugar"
          autoComplete="off"
          enterKeyHint="next"
          role="combobox"
          aria-expanded={abierta}
          aria-controls="lista-lugar"
          aria-autocomplete="list"
          autoFocus
        />
        <Limpiar visible={!!nombre} />
        <ContadorCaracteres valor={nombre} tope={LIMITES_LUGAR.nombre} />
      </label>
      {error && (
        <p className={evento.aviso} role="alert">
          {error}
        </p>
      )}
      <ListaFlotante abierta={abierta} onCerrar={() => setCerradaPara(nombre)} ancla={ancla} id="lista-lugar" etiqueta="Lugares con ese nombre" reservaAbajo={altoPie}>
        {conFicha.map((l) => (
          <li key={`l-${l.id}`}>
            <Link href={hrefLugar(l)} replace role="option" aria-selected={false} className={`${sug.renglon} ${sug.conFicha}`} onClick={alElegir && ((e) => alElegir(e, l))}>
              <IconoPin width={20} height={20} />
              <b>{l.nombre}</b>
              <small>{l.privado ? "Ya lo tienes guardado · Ir a su ficha" : "Ya tiene ficha · Ir a su ficha"}</small>
            </Link>
          </li>
        ))}
        {delMapa.map((item) => (
          <li key={`m-${item.mapboxId}`}>
            <button type="button" role="option" aria-selected={false} className={`${sug.renglon} ${item.esDireccion ? sug.direccion : ""}`} onClick={() => void elegirDelMapa(item)}>
              <IconoPin width={20} height={20} />
              {/* Una dirección ubica, no nombra: el nombre escrito se queda. */}
              <b>{item.esDireccion ? texto : item.nombre}</b>
              <small>{item.esDireccion ? `Usar la dirección ${item.direccion || item.nombre}` : item.direccion}</small>
            </button>
          </li>
        ))}
        {(buscando || eligiendo) && (
          <li className={evento.avisoLista} role="status">
            {eligiendo ? "Ubicando…" : "Buscando…"}
          </li>
        )}
        {busqueda.falla && (
          <li className={evento.avisoLista} role="alert">
            No pude buscar en el mapa. Sigue y búscalo ahí.
          </li>
        )}
      </ListaFlotante>
      <PiePaso ref={pie}>
        <Boton type="button" aria-disabled={listo ? undefined : true} onClick={listo ? onSeguir : undefined}>
          {listo ? "Siguiente" : "Falta el nombre"}
        </Boton>
        {tira}
      </PiePaso>
    </>
  );
}

/** El punto que se confirma en el mapa: dónde está y lo que el mapa dice de él. */
type Ubicado = Sitio;

/**
 * Confirmar en el mapa, siempre: el punto se queda en el directorio y lo usarán todos sus eventos. Con una sugerencia (o el punto donde se
 * sostuvo el dedo en Lugares) es «¿Es aquí?»: el mapa con el pin arrastrable, la tarjeta con el nombre y la dirección, «Sí, es aquí» y «Buscar
 * otro». Sin ella es «¿Dónde está?»: el campo de dirección (con su lista del mapa), «Estoy aquí» (hasta que hay un punto) y tocar el mapa o
 * arrastrar el pin; «Listo» dice qué falta. Al mover el pin se pide la dirección del punto y, mientras llega, el botón dice «Ubicando…». Si un lugar del directorio cae a
 * menos de 150 m, «¿Es este?» con el enlace a su ficha. Un negocio entra como cualquier lugar: aquí no se dice nada de eso.
 */
export function PasoUbicar({
  nombre,
  esAqui,
  inicial,
  lugares,
  ciudad,
  contexto,
  yo,
  ubicando,
  avisoUbicacion,
  onEstoyAqui,
  onListo,
  onOtro,
  alElegir,
}: {
  nombre: string;
  /** «¿Es aquí?» (hay sugerencia o punto de entrada) o «¿Dónde está?». */
  esAqui: boolean;
  inicial: Ubicado | null;
  lugares: LugarResumen[];
  ciudad: Ciudad;
  contexto: ContextoDireccion;
  yo: (Punto & { vez: number }) | null;
  ubicando: boolean;
  avisoUbicacion: string | null;
  onEstoyAqui: (poner: (p: Punto) => void) => void;
  onListo: (sitio: Sitio) => void;
  onOtro: () => void;
  alElegir?: AlElegir;
}) {
  const [c, setC] = useState<Ubicado | null>(inicial);
  // El punto de entrada (el dedo sostenido en Lugares) llega sin dirección: se pide al llegar, como si se hubiera movido el pin.
  const sinDireccion = !!inicial && !inicial.direccion && !!configPublica().mapboxToken;
  const [pidiendo, setPidiendo] = useState(sinDireccion);
  const version = useRef(0);
  const ancla = useRef<HTMLLabelElement>(null);
  const [q, setQ] = useState("");
  const [cerradaPara, setCerradaPara] = useState<string | null>(null);
  const [eligiendo, setEligiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busqueda = useBusquedaSitio(esAqui ? "" : q, contexto);
  const texto = q.trim();
  const buscando = texto.length >= 3 && !busqueda.lista;
  const abierta = !esAqui && texto.length >= 3 && cerradaPara !== q && (busqueda.opciones.length > 0 || buscando || busqueda.falla || eligiendo);

  // La dirección del punto que se mueve: si otro pin llegó mientras tanto (`version`), la respuesta vieja se descarta.
  function pedirDireccion(punto: Punto, mapboxToken: string) {
    const esta = ++version.current;
    const vigente = () => esta === version.current;
    lugarDesdePunto(punto, mapboxToken)
      .then((r) => vigente() && setC((a) => a && { ...a, direccion: r?.direccion ?? "", ciudad: r?.ciudad ?? null }))
      .catch(() => vigente() && setC((a) => a && { ...a, direccion: "", ciudad: null }))
      .finally(() => vigente() && setPidiendo(false));
  }
  function mover(punto: Punto) {
    const { mapboxToken } = configPublica();
    setError(null);
    setC({ punto, direccion: "", ciudad: null });
    setPidiendo(!!mapboxToken);
    if (mapboxToken) pedirDireccion(punto, mapboxToken);
    else version.current++;
  }
  useEffect(() => {
    const { mapboxToken } = configPublica();
    if (sinDireccion && inicial && mapboxToken) pedirDireccion(inicial.punto, mapboxToken);
    // Solo al llegar: después, la dirección la pide cada movimiento del pin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function elegirDireccion(item: LugarSugerido) {
    if (eligiendo) return;
    setEligiendo(true);
    setError(null);
    const r = await busqueda.elegir(item);
    setEligiendo(false);
    if (!r) return setError("No pude ubicar esa dirección. Toca el mapa donde está.");
    version.current++;
    setPidiendo(false);
    setC({ punto: r.punto, direccion: r.direccion, ciudad: r.ciudad });
    setCerradaPara(q);
  }

  const alLado = c ? lugarAlLado(lugares, c.punto, RADIO_ES_ESTE_M) : null;
  const bloqueo = pidiendo ? "Ubicando…" : c ? null : "Falta la ubicación";
  return (
    <>
      {!esAqui && (
        <>
          <label className={canon.campo} ref={ancla}>
            <IconoBuscar width={20} height={20} />
            <input
              type="text"
              value={q}
              onChange={(e) => {
                setError(null);
                setQ(e.target.value);
              }}
              placeholder="Dirección o referencia"
              aria-label="Buscar la dirección"
              autoComplete="off"
              enterKeyHint="search"
              role="combobox"
              aria-expanded={abierta}
              aria-controls="lista-direccion"
              aria-autocomplete="list"
            />
            <Limpiar visible={!!q} />
          </label>
          {/* Con el punto ya puesto se mueve el pin o se busca otra dirección: «Estoy aquí» ya hizo su trabajo y deja sitio al mapa. */}
          {!c && texto.length < 3 && <Opcion icono={<IconoUbicacion />} titulo="Estoy aquí" detalle={ubicando ? "Buscando tu ubicación…" : "Usa la ubicación del teléfono"} onClick={() => !ubicando && onEstoyAqui(mover)} />}
          {avisoUbicacion && (
            <p className={evento.aviso} role="status">
              {avisoUbicacion}
            </p>
          )}
          <ListaFlotante abierta={abierta} onCerrar={() => setCerradaPara(q)} ancla={ancla} id="lista-direccion" etiqueta="Direcciones">
            {busqueda.opciones.map((item) => (
              <li key={item.mapboxId}>
                <button type="button" role="option" aria-selected={false} className={sug.renglon} onClick={() => void elegirDireccion(item)}>
                  <IconoPin width={20} height={20} />
                  <b>{item.nombre}</b>
                  <small>{item.direccion}</small>
                </button>
              </li>
            ))}
            {(buscando || eligiendo) && (
              <li className={evento.avisoLista} role="status">
                {eligiendo ? "Ubicando…" : "Buscando…"}
              </li>
            )}
            {busqueda.falla && (
              <li className={evento.avisoLista} role="alert">
                No pude buscar. Toca el mapa donde está.
              </li>
            )}
          </ListaFlotante>
        </>
      )}
      <div className={evento.mapaPaso}>
        <MapaDondeEs lugares={[]} seleccion={c?.punto ?? null} centrarEn={c?.punto ?? ciudad.centro} ciudad={ciudad} yo={yo} onLugar={() => {}} onPoi={(_, punto) => mover(punto)} onPunto={mover} onArrastre={mover} />
      </div>
      {c && (
        <div className={evento.confirma} role="status">
          <IconoOk width={20} height={20} />
          <b>{nombre}</b>
          <small>{c.direccion || (pidiendo ? "Ubicando…" : "Pin en el mapa")}</small>
        </div>
      )}
      {alLado && (
        <div className={evento.confirma} role="status">
          <IconoOk width={20} height={20} />
          <b>¿Es este?</b>
          <small>
            A {alLado.metros} m hay un lugar con ficha: {alLado.lugar.nombre}.{" "}
            <Link href={hrefLugar(alLado.lugar)} replace className={styles.irFicha} onClick={alElegir && ((e) => alElegir(e, alLado.lugar))}>
              Ir a su ficha
            </Link>
          </small>
        </div>
      )}
      {error && (
        <p className={evento.aviso} role="alert">
          {error}
        </p>
      )}
      <small className={evento.aviso}>{c ? "Si el pin no está en su sitio, arrástralo." : "Toca el mapa o arrastra el pin hasta la entrada del lugar."}</small>
      <PiePaso>
        <Boton type="button" aria-disabled={bloqueo ? true : undefined} onClick={bloqueo || !c ? undefined : () => onListo(c)}>
          {bloqueo ?? (esAqui ? "Sí, es aquí" : "Listo")}
        </Boton>
        {esAqui && (
          <Boton type="button" variante="quieto" onClick={onOtro}>
            Buscar otro
          </Boton>
        )}
      </PiePaso>
    </>
  );
}

/** ¿Qué tipo de lugar es? La lista cerrada, una opción por renglón con el icono de etiqueta; elegir avanza. */
export function PasoTipo({ onElegir }: { onElegir: (tipo: Tipo) => void }) {
  return (
    <div className={evento.opciones} role="group" aria-label="Tipo de lugar">
      {TIPOS.map((t) => (
        <Opcion key={t.valor} compacta icono={<IconoEtiqueta width={20} height={20} />} titulo={t.etiqueta} onClick={() => onElegir(t.valor)} />
      ))}
    </div>
  );
}

/** «Otro»: qué es, en pocas palabras y opcional (lo que el formulario de siempre pedía con «Otro»). */
export function PasoOtro({ detalle, error, onCambio, onSeguir }: { detalle: string; error?: string; onCambio: (detalle: string) => void; onSeguir: () => void }) {
  return (
    <>
      <label className={canon.campo}>
        <IconoEtiqueta width={20} height={20} />
        <input
          type="text"
          value={detalle}
          onChange={(e) => onCambio(e.target.value)}
          onKeyDown={conIntro(onSeguir)}
          maxLength={LIMITES_LUGAR.detalle}
          placeholder="Ej. taller de cerámica (opcional)"
          aria-label="Qué es"
          aria-invalid={!!error}
          autoComplete="off"
          enterKeyHint="next"
          autoFocus
        />
        <Limpiar visible={!!detalle} />
        <ContadorCaracteres valor={detalle} tope={LIMITES_LUGAR.detalle} error={error} />
      </label>
      {error && (
        <p className={canon.error} role="alert">
          {error}
        </p>
      )}
      <PiePaso>
        <Boton type="button" onClick={onSeguir}>
          {detalle.trim() ? "Siguiente" : "Seguir sin decirlo"}
        </Boton>
      </PiePaso>
    </>
  );
}

type Mas = Pick<Respuestas, "portada" | "descripcion" | "redes" | "privado">;

/**
 * Foto, descripción o redes: lo opcional que ya tenía el formulario de siempre, igual que ahí (portada que se sube, descripción con su tope,
 * enlaces y redes; y, para la administración, la dirección de una imagen y «Solo yo lo veo»). «Listo» vuelve a «Revisa».
 */
export function PasoMas({ r, usuarioId, esAdmin, errores, onCambio, onListo }: { r: Mas; usuarioId: string; esAdmin: boolean; errores: ErroresLugar; onCambio: (cambios: Partial<Mas>) => void; onListo: () => void }) {
  const subida = useSubidaDeFoto();
  const subiendo = !!subida.subiendo;
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  // Con la espera de toda la app (`useSubidaDeFoto`, OL-353): la foto elegida late en el hueco de la portada hasta que la subida se ve.
  const subir = (e: React.ChangeEvent<HTMLInputElement>) =>
    subida.subir(e, async (archivo) => {
      setErrorFoto(null);
      const hecho = await subirFoto("lugares", usuarioId, "portada", archivo);
      if ("error" in hecho) return setErrorFoto(hecho.error);
      onCambio({ portada: hecho.url });
      return hecho.url;
    });
  return (
    <>
      <FotoSubida src={r.portada} vista={subida.vista} className={formulario.portada} />
      <label className={canon.subir} aria-busy={subiendo || undefined}>
        <input type="file" accept="image/*" onChange={subir} disabled={subiendo} />
        {subiendo ? "Subiendo…" : r.portada ? "Cambiar la foto" : "Poner una foto de portada"}
      </label>
      {(errorFoto ?? errores.portada) && (
        <p className={canon.error} role="alert">
          {errorFoto ?? errores.portada}
        </p>
      )}
      {esAdmin && <CampoImagenUrl valor={r.portada} onCambio={(portada) => onCambio({ portada })} />}
      <Campo etiqueta="Descripción corta" name="descripcion" multilinea value={r.descripcion} onChange={(e) => onCambio({ descripcion: e.target.value })} maxLength={LIMITES_LUGAR.descripcion} placeholder="Qué es y qué pasa ahí" error={errores.descripcion} mostrarContador />
      <SelectorEnlaces inicial={r.redes} error={errores.enlaces} onCambio={(redes: Enlace[]) => onCambio({ redes })} />
      {esAdmin && <Casilla titulo="Solo yo lo veo" detalle="Mapeo privado: no sale en el mapa, la lista ni la búsqueda para nadie más." marcada={r.privado} onCambio={(privado) => onCambio({ privado })} />}
      <PiePaso>
        <Boton type="button" aria-disabled={subiendo ? true : undefined} aria-busy={subiendo || undefined} onClick={subiendo ? undefined : onListo}>
          {subiendo ? "Subiendo la foto…" : "Listo"}
        </Boton>
      </PiePaso>
    </>
  );
}
