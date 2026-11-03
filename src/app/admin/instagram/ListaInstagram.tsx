"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import HojaInstagram from "@/components/instagram/HojaInstagram";
import useAlDia from "@/components/instagram/useAlDia";
import type { Estados } from "@/components/instagram/sondeo";
import BotonIcono from "@/components/ui/BotonIcono";
import Cabecera from "@/components/ui/Cabecera";
import { Chip } from "@/components/ui/Chip";
import Girando from "@/components/ui/Girando";
import Grupo from "@/components/ui/Grupo";
import { IconoAbrirFuera, IconoCaret, IconoFacebook, IconoPin } from "@/components/ui/Iconos";
import Renglon from "@/components/ui/Renglon";
import renglonCss from "@/components/ui/Renglon.module.css";
import lista from "@/components/Lista.module.css";
import { HojaCiudades, recordarCiudad } from "../CabeceraLista";
import type { CiudadPanel } from "../consultas";
import { ESTADO_FACEBOOK, type ClaveFacebook } from "@/lib/instagram/frases";
import { preguntaRepetir } from "@/lib/redes/reglas";
import { estadosTrabajos, publicarEnFacebook, type Encolado } from "./acciones";
import type { Sugerencia } from "./datos";
import { escribirTrabajos, leerTrabajos, useTrabajosRecordados } from "./tiendaTrabajos";
import { anotar, combinar, conRespuesta, encolado, enlaceVer, fusionar, LISTA_VIEJA_MS, lineaFacebook, lineaInstagram, semillas, vigente, vivosDe, type LineaFacebook } from "./trabajosLista";

const PALABRAS = { una: "evento", varias: "eventos", nota: "Cuenta los eventos de los próximos 7 días de cada ciudad." };

/**
 * Administración › Instagram (OL-458, prototipo firmado, pantalla B; bitácora 490): la cabecera con el chip de ciudad y su hoja (la de las listas
 * de Administración, OL-456), y los eventos en dos grupos de `ui/Grupo`: «Para publicar» (en orden de señal) y «Ya en Instagram». El renglón es
 * el de las listas; tocarlo abre la hoja de vista previa (sin JavaScript, lleva a la ficha). `abrir`: el evento con el que llega abierta la hoja.
 * OL-461: en «Ya en Instagram», cada renglón dice cómo va en Facebook y, si no está ahí, lleva el botón «Publicar en Facebook» (el icono de
 * Facebook a la derecha, como el «Voy» de las listas): publica la misma imagen en la página y el renglón lo dice.
 * OL-465 (bitácora 497): publicar va en segundo plano: el renglón dice «Publicando…» (o «Facebook: publicando…») mientras el trabajo está en la
 * cola. Si ese evento ya se publicó en Facebook hace menos de 15 minutos, el botón pregunta antes de repetir.
 * OL-488 (añadido del founder del 2026-10-29): «Publicando…» (o «Reintentando…», si la cola va en otro intento) lleva su cargador (`ui/Girando`).
 * OL-471 (bitácora 503): `conexion`, el bloque «Conexión» (`ConexionInstagram`), va bajo la cabecera y arriba de la lista.
 * OL-495 (bitácora 527): con la semana vacía por falta de material, `sinMaterial` (la línea que lo dice y el renglón «Falta material» con su hoja,
 * `SemanaSinMaterial`) va arriba de la lista; después, la lista para publicar uno a mano.
 *
 * OL-506 (prototipo firmado el 2026-11-02, bitácora 535; código en la 539): publicar sin recargar. La lista es la dueña de lo que sabe de cada
 * trabajo (`trabajos`): lo siembra con lo que trae el servidor (`enCamino` de cada renglón), lo anota con la respuesta de «Publicar» (de la hoja,
 * `onPublicado`, y del botón de Facebook) y lo pone al día con el sondeo (`useAlDia`, cada 2 s mientras haya algo en camino). La tarjeta no se
 * mueve mientras se mira: ni la lista, ni el desplazamiento, ni los contadores; solo cambian su última línea («Publicando…» al cerrarse la hoja,
 * «Publicado · hace un momento» con «Ver», o «No se publicó: …») y la de Facebook. Lo demás cambia la próxima vez que la pantalla se pide al
 * servidor. La sesión lo recuerda 10 min (`tiendaTrabajos`): al volver con Atrás dentro del minuto la lista llega de la caché con la línea vieja y
 * la tarjeta queda como se dejó. `generada`: cuándo armó el servidor esta lista (para saber si ya sabe de lo que se publicó desde aquí).
 */
export default function ListaInstagram({ ciudad, ciudades, para, ya, abrir, conteo, vacio, conexion, pestanas, sinMaterial = null, generada = "" }: { ciudad: { slug: string | null; nombre: string }; ciudades: CiudadPanel[]; para: Sugerencia[]; ya: Sugerencia[]; abrir: string | null; conteo: string | null; vacio: string | null; conexion?: ReactNode; pestanas?: ReactNode; sinMaterial?: ReactNode; generada?: string }) {
  const router = useRouter();
  const [hojaCiudad, setHojaCiudad] = useState(false);
  const [evento, setEvento] = useState<string | null>(abrir);
  const [enCurso, setEnCurso] = useState<string | null>(null);
  // Lo que respondió el botón de Facebook de un renglón cuando no se guardó (repetido o error), solo mientras la lista no se vuelva a pedir.
  const [respuestas, setRespuestas] = useState<Record<string, { r: Encolado; ya: Sugerencia[] }>>({});
  const [, empezar] = useTransition();
  const respuesta = (s: Sugerencia) => (respuestas[s.id]?.ya === ya ? respuestas[s.id].r : null);

  // El dueño del estado: lo que recuerda la sesión, con lo que trae el servidor sembrado debajo.
  const filas = useMemo(() => [...para, ...ya], [para, ya]);
  const recordados = useTrabajosRecordados();
  const trabajos = useMemo(() => combinar(recordados, semillas(filas, generada, 0)), [recordados, filas, generada]);
  const vivos = vivosDe(filas, trabajos);
  const alResponder = (m: Estados) => {
    const cambios = conRespuesta(trabajos, m, Date.now());
    if (cambios) escribirTrabajos((t) => fusionar(t, cambios));
  };
  // Cuándo llegó esta lista al teléfono: al volver a la app solo se pide otra vez si tiene más de 5 min y no hay nada en camino.
  const llegada = useRef(0);
  useEffect(() => {
    llegada.current = Date.now();
  }, [para, ya]);
  useAlDia(vivos, alResponder, () => {
    if (!vivos.length && Date.now() - llegada.current > LISTA_VIEJA_MS) router.refresh();
  });
  // Al llegar con trabajos recordados en camino (Atrás, o la app que se recargó), se pregunta una vez por ellos en seguida. Se lee la memoria misma
  // (al hidratar, `recordados` todavía viene vacío) y solo al llegar: lo que se publique después lo sigue el sondeo.
  const llego = useRef(false);
  useEffect(() => {
    if (llego.current) return;
    llego.current = true;
    const memoria = leerTrabajos();
    if (!Object.keys(memoria).length) return;
    const ids = vivosDe(filas, combinar(memoria, semillas(filas, generada, 0))).map((v) => v.id);
    if (ids.length) estadosTrabajos(ids).then(alResponder, () => undefined);
  });

  const pideConfirmar = (s: Sugerencia) => {
    const r = respuesta(s);
    return !!r && !r.ok && "duplicado" in r;
  };
  const aFacebook = (s: Sugerencia) =>
    empezar(async () => {
      setEnCurso(s.id);
      const r = await publicarEnFacebook(s.id, null, pideConfirmar(s)).catch((): Encolado => ({ ok: false, error: "otro", mensaje: "No se pudo guardar la publicación." }));
      // En la cola: la línea de Facebook la pone el estado (OL-506: sin volver a pedir la pantalla).
      if (r.ok) escribirTrabajos((t) => anotar(t, s.id, encolado("facebook", r, false, generada, Date.now())));
      setRespuestas((h) => {
        const resto = { ...h };
        delete resto[s.id];
        return r.ok ? resto : { ...resto, [s.id]: { r, ya } };
      });
      setEnCurso(null);
    });
  /** Lo de este renglón que se publicó desde aquí y la lista todavía no sabe. */
  const deAqui = (s: Sugerencia) => {
    const del = trabajos[s.id];
    return { ig: vigente(s, del?.instagram) ? del?.instagram : undefined, fb: vigente(s, del?.facebook) ? del?.facebook : undefined };
  };
  /** La línea de Facebook: la del toque en curso, la de una respuesta que no se guardó, la de lo publicado desde aquí o la que dice el servidor. */
  const lineaDeFacebook = (s: Sugerencia): LineaFacebook | null => {
    if (enCurso === s.id) return { texto: "Facebook: publicando…", girando: true };
    const r = respuesta(s);
    if (r && !r.ok) return { texto: "duplicado" in r ? preguntaRepetir(r.duplicado, "facebook") : `Facebook: ${ESTADO_FACEBOOK[r.error as ClaveFacebook] ?? "no se publicó"}`, girando: false };
    const { ig, fb } = deAqui(s);
    if (ig || fb) return lineaFacebook({ instagram: ig, facebook: fb });
    const f = s.facebook;
    if (!f) return null;
    if (f.estado === "publicada") return { texto: "Facebook: publicado", girando: false };
    if (f.estado === "publicando") return { texto: "Facebook: publicando…", girando: true };
    if (f.estado === "error") return { texto: `Facebook: ${ESTADO_FACEBOOK[f.error]}`, girando: false };
    return { texto: "Facebook: sin publicar", girando: false };
  };
  const faltaFacebook = (s: Sugerencia) => {
    const { ig, fb } = deAqui(s);
    return !!s.facebook && s.facebook.estado !== "publicada" && s.facebook.estado !== "publicando" && !ig && !fb;
  };
  const renglon = (s: Sugerencia) => {
    const { ig } = deAqui(s);
    const linea = ig ? lineaInstagram(ig) : null;
    const facebook = lineaDeFacebook(s);
    return (
      <Renglon
        key={s.id}
        href={s.href}
        foto={s.foto}
        titulo={s.titulo}
        onClick={(e) => {
          e.preventDefault();
          setEvento(s.id);
        }}
        estado={linea?.estado ?? (s.fallido ? "fallido" : undefined)}
        otraLinea={
          facebook && (
            <span className={renglonCss.envuelve} role="status">
              {facebook.girando ? <Girando texto={facebook.texto} /> : facebook.texto}
            </span>
          )
        }
        accion={
          // «Ver» manda en el hueco de acción: uno solo (OL-506).
          ig?.estado === "publicado" ? (
            <BotonIcono href={enlaceVer(ig)} target="_blank" rel="noopener noreferrer" prefetch={false} aria-label={`Ver en Instagram: ${s.titulo}`}>
              <IconoAbrirFuera width={22} height={22} />
            </BotonIcono>
          ) : faltaFacebook(s) ? (
            <BotonIcono aria-label={`${pideConfirmar(s) ? "Publicar otra vez en Facebook" : "Publicar en Facebook"}: ${s.titulo}`} disabled={enCurso !== null} aria-busy={enCurso === s.id || undefined} onClick={() => aFacebook(s)}>
              <IconoFacebook width={22} height={22} />
            </BotonIcono>
          ) : undefined
        }
      >
        {/* El cuándo también se parte en dos renglones: con el botón de Facebook al lado, a 320 no cabe en uno (OL-461). */}
        <span className={renglonCss.envuelve}>{s.cuando}</span>
        <span className={renglonCss.envuelve}>{s.donde}</span>
        {linea ? linea.texto : s.fallido ? s.linea : <span className={renglonCss.envuelve}>{s.publicando && /…$/.test(s.linea) ? <Girando texto={s.linea} /> : s.linea}</span>}
      </Renglon>
    );
  };
  return (
    <>
      <Cabecera
        contexto={
          <Chip variante="contexto" activo={!!ciudad.slug} icono={<IconoPin width={16} height={16} />} fin={<IconoCaret width={12} height={12} />} onClick={() => setHojaCiudad(true)}>
            {ciudad.nombre}
          </Chip>
        }
      >
        {/* OL-479: las pestañas «Semana · Eventos», si la pantalla las trae. */}
        {pestanas}
      </Cabecera>
      {hojaCiudad && (
        <HojaCiudades
          palabras={PALABRAS}
          ciudades={ciudades}
          elegida={ciudad.slug}
          onElegir={(slug) => {
            setHojaCiudad(false);
            recordarCiudad(slug);
            if (slug !== ciudad.slug) router.replace(`/admin/instagram${slug ? `?ciudad=${slug}` : "?ciudad=todas"}${pestanas ? "&pestana=eventos" : ""}`, { scroll: false });
          }}
          onCerrar={() => setHojaCiudad(false)}
        />
      )}
      {conexion}
      {sinMaterial}
      {conteo && <p className={lista.conteo}>{conteo}</p>}
      {vacio && <p className={lista.vacio}>{vacio}</p>}
      {para.length > 0 && (
        <Grupo titulo="Para publicar" cuenta={para.length}>
          {para.map(renglon)}
        </Grupo>
      )}
      {ya.length > 0 && (
        <Grupo titulo="Ya en Instagram" cuenta={ya.length}>
          {ya.map(renglon)}
        </Grupo>
      )}
      {evento && (
        <HojaInstagram
          eventoId={evento}
          onCerrar={() => setEvento(null)}
          // La hoja avisa qué guardó: el renglón dice «Publicando…» en el mismo pintado en que la hoja se cierra, sin volver a pedir la pantalla.
          onPublicado={(p) => escribirTrabajos((t) => anotar(t, p.eventoId, encolado(p.red, p, p.conFacebook, generada, Date.now())))}
          onTrabajo={(e) => alResponder({ [e.id]: e })}
        />
      )}
    </>
  );
}
