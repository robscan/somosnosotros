"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import HojaInstagram from "@/components/instagram/HojaInstagram";
import BotonIcono from "@/components/ui/BotonIcono";
import Cabecera from "@/components/ui/Cabecera";
import { Chip } from "@/components/ui/Chip";
import Grupo from "@/components/ui/Grupo";
import { IconoCaret, IconoFacebook, IconoPin } from "@/components/ui/Iconos";
import Renglon from "@/components/ui/Renglon";
import renglonCss from "@/components/ui/Renglon.module.css";
import lista from "@/components/Lista.module.css";
import { HojaCiudades, recordarCiudad } from "../CabeceraLista";
import type { CiudadPanel } from "../consultas";
import { ESTADO_FACEBOOK, type ClaveFacebook } from "@/lib/instagram/frases";
import { preguntaRepetir, REFRESCO_MS } from "@/lib/redes/reglas";
import { publicarEnFacebook, type Encolado } from "./acciones";
import type { Sugerencia } from "./datos";

const PALABRAS = { una: "evento", varias: "eventos", nota: "Cuenta los eventos de los próximos 7 días de cada ciudad." };

/**
 * Administración › Instagram (OL-458, prototipo firmado, pantalla B; bitácora 490): la cabecera con el chip de ciudad y su hoja (la de las listas
 * de Administración, OL-456), y los eventos en dos grupos de `ui/Grupo`: «Para publicar» (en orden de señal) y «Ya en Instagram». El renglón es
 * el de las listas; tocarlo abre la hoja de vista previa (sin JavaScript, lleva a la ficha). `abrir`: el evento con el que llega abierta la hoja.
 * OL-461: en «Ya en Instagram», cada renglón dice cómo va en Facebook y, si no está ahí, lleva el botón «Publicar en Facebook» (el icono de
 * Facebook a la derecha, como el «Voy» de las listas): publica la misma imagen en la página y el renglón lo dice.
 * OL-465 (bitácora 497): publicar va en segundo plano: el renglón dice «Publicando…» (o «Facebook: publicando…») mientras el trabajo está en la
 * cola, y la lista se refresca sola cada 20 s mientras lo haya y al volver a la app. Si ese evento ya se publicó en Facebook hace menos de 15
 * minutos, el botón pregunta antes de repetir.
 * OL-471 (bitácora 503): `conexion`, el bloque «Conexión» (`ConexionInstagram`), va bajo la cabecera y arriba de la lista.
 */
export default function ListaInstagram({ ciudad, ciudades, para, ya, abrir, conteo, vacio, conexion, pestanas }: { ciudad: { slug: string | null; nombre: string }; ciudades: CiudadPanel[]; para: Sugerencia[]; ya: Sugerencia[]; abrir: string | null; conteo: string | null; vacio: string | null; conexion?: ReactNode; pestanas?: ReactNode }) {
  const router = useRouter();
  const [hojaCiudad, setHojaCiudad] = useState(false);
  const [evento, setEvento] = useState<string | null>(abrir);
  const [enCurso, setEnCurso] = useState<string | null>(null);
  // Lo que respondió el botón de Facebook de cada renglón, solo mientras la lista no se refresque (luego manda lo que dice el servidor).
  const [hechos, setHechos] = useState<Record<string, { r: Encolado; ya: Sugerencia[] }>>({});
  const [, empezar] = useTransition();
  const hecho = (s: Sugerencia) => (hechos[s.id]?.ya === ya ? hechos[s.id].r : null);
  const aFacebook = (s: Sugerencia) =>
    empezar(async () => {
      setEnCurso(s.id);
      const r = await publicarEnFacebook(s.id, null, pideConfirmar(s)).catch((): Encolado => ({ ok: false, error: "otro", mensaje: "No se pudo guardar la publicación." }));
      setHechos((h) => ({ ...h, [s.id]: { r, ya } }));
      setEnCurso(null);
      if (r.ok) router.refresh();
    });
  /** La línea de Facebook de lo que ya está en Instagram. */
  const lineaFacebook = (s: Sugerencia): string | null => {
    const r = hecho(s);
    if (enCurso === s.id) return "Facebook: publicando…";
    if (r) return r.ok ? (r.yaEstaba ? "Facebook: publicado" : "Facebook: publicando…") : "duplicado" in r ? preguntaRepetir(r.duplicado, "facebook") : `Facebook: ${ESTADO_FACEBOOK[r.error as ClaveFacebook] ?? "no se publicó"}`;
    const f = s.facebook;
    if (!f) return null;
    if (f.estado === "publicada") return "Facebook: publicado";
    if (f.estado === "publicando") return "Facebook: publicando…";
    if (f.estado === "error") return `Facebook: ${ESTADO_FACEBOOK[f.error]}`;
    return "Facebook: sin publicar";
  };
  const pideConfirmar = (s: Sugerencia) => {
    const r = hecho(s);
    return !!r && !r.ok && "duplicado" in r;
  };
  const faltaFacebook = (s: Sugerencia) => !!s.facebook && s.facebook.estado !== "publicada" && s.facebook.estado !== "publicando" && !hecho(s)?.ok;
  // Mientras algo está en la cola: la lista se refresca cada 20 s (si la pantalla se ve) y al volver a la app.
  const hayEnCamino = para.some((s) => s.publicando) || ya.some((s) => s.publicando);
  useEffect(() => {
    const refrescar = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", refrescar);
    const reloj = hayEnCamino ? window.setInterval(refrescar, REFRESCO_MS) : null;
    return () => {
      document.removeEventListener("visibilitychange", refrescar);
      if (reloj) window.clearInterval(reloj);
    };
  }, [hayEnCamino, router]);
  const renglon = (s: Sugerencia) => {
    const facebook = lineaFacebook(s);
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
        accion={
          faltaFacebook(s) ? (
            <BotonIcono aria-label={`${pideConfirmar(s) ? "Publicar otra vez en Facebook" : "Publicar en Facebook"}: ${s.titulo}`} disabled={enCurso !== null} aria-busy={enCurso === s.id || undefined} onClick={() => aFacebook(s)}>
              <IconoFacebook width={22} height={22} />
            </BotonIcono>
          ) : undefined
        }
      >
        {/* El cuándo también se parte en dos renglones: con el botón de Facebook al lado, a 320 no cabe en uno (OL-461). */}
        <span className={renglonCss.envuelve}>{s.cuando}</span>
        <span className={renglonCss.envuelve}>{s.donde}</span>
        <span className={renglonCss.envuelve}>{s.linea}</span>
        {facebook && <span className={renglonCss.envuelve}>{facebook}</span>}
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
      {evento && <HojaInstagram eventoId={evento} onCerrar={() => setEvento(null)} onPublicado={() => router.refresh()} />}
    </>
  );
}
