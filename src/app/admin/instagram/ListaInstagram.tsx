"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
import { ESTADO_FACEBOOK, FRASES_FACEBOOK } from "@/lib/instagram/frases";
import { publicarEnFacebook, type Espejo } from "./acciones";
import type { Sugerencia } from "./datos";

const PALABRAS = { una: "evento", varias: "eventos", nota: "Cuenta los eventos de los próximos 7 días de cada ciudad." };

/**
 * Administración › Instagram (OL-458, prototipo firmado, pantalla B; bitácora 490): la cabecera con el chip de ciudad y su hoja (la de las listas
 * de Administración, OL-456), y los eventos en dos grupos de `ui/Grupo`: «Para publicar» (en orden de señal) y «Ya en Instagram». El renglón es
 * el de las listas; tocarlo abre la hoja de vista previa (sin JavaScript, lleva a la ficha). `abrir`: el evento con el que llega abierta la hoja.
 * OL-461: en «Ya en Instagram», cada renglón dice cómo va en Facebook y, si no está ahí, lleva el botón «Publicar en Facebook» (el icono de
 * Facebook a la derecha, como el «Voy» de las listas): publica la misma imagen en la página y el renglón lo dice.
 */
export default function ListaInstagram({ ciudad, ciudades, para, ya, abrir, conteo, vacio }: { ciudad: { slug: string | null; nombre: string }; ciudades: CiudadPanel[]; para: Sugerencia[]; ya: Sugerencia[]; abrir: string | null; conteo: string | null; vacio: string | null }) {
  const router = useRouter();
  const [hojaCiudad, setHojaCiudad] = useState(false);
  const [evento, setEvento] = useState<string | null>(abrir);
  const [enCurso, setEnCurso] = useState<string | null>(null);
  const [hechos, setHechos] = useState<Record<string, Espejo>>({});
  const [, empezar] = useTransition();
  const aFacebook = (s: Sugerencia) =>
    empezar(async () => {
      setEnCurso(s.id);
      const r = await publicarEnFacebook(s.id).catch((): Espejo => ({ ok: false, error: "otro", mensaje: FRASES_FACEBOOK.otro }));
      setHechos((h) => ({ ...h, [s.id]: r }));
      setEnCurso(null);
      if (r.ok) router.refresh();
    });
  /** La línea de Facebook de lo que ya está en Instagram. */
  const lineaFacebook = (s: Sugerencia): string | null => {
    const r = hechos[s.id];
    if (enCurso === s.id) return "Facebook: publicando…";
    if (r) return r.ok ? "Facebook: publicado" : `Facebook: ${ESTADO_FACEBOOK[r.error]}`;
    if (!s.facebook) return null;
    return s.facebook.estado === "publicada" ? "Facebook: publicado" : s.facebook.estado === "error" ? `Facebook: ${ESTADO_FACEBOOK[s.facebook.error]}` : "Facebook: sin publicar";
  };
  const faltaFacebook = (s: Sugerencia) => !!s.facebook && s.facebook.estado !== "publicada" && !hechos[s.id]?.ok;
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
            <BotonIcono aria-label={`Publicar en Facebook: ${s.titulo}`} disabled={enCurso !== null} aria-busy={enCurso === s.id || undefined} onClick={() => aFacebook(s)}>
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
      />
      {hojaCiudad && (
        <HojaCiudades
          palabras={PALABRAS}
          ciudades={ciudades}
          elegida={ciudad.slug}
          onElegir={(slug) => {
            setHojaCiudad(false);
            recordarCiudad(slug);
            if (slug !== ciudad.slug) router.replace(`/admin/instagram${slug ? `?ciudad=${slug}` : "?ciudad=todas"}`, { scroll: false });
          }}
          onCerrar={() => setHojaCiudad(false)}
        />
      )}
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
