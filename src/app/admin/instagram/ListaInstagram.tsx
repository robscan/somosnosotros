"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import HojaInstagram from "@/components/instagram/HojaInstagram";
import Cabecera from "@/components/ui/Cabecera";
import { Chip } from "@/components/ui/Chip";
import Grupo from "@/components/ui/Grupo";
import { IconoCaret, IconoPin } from "@/components/ui/Iconos";
import Renglon from "@/components/ui/Renglon";
import renglonCss from "@/components/ui/Renglon.module.css";
import lista from "@/components/Lista.module.css";
import { HojaCiudades, recordarCiudad } from "../CabeceraLista";
import type { CiudadPanel } from "../consultas";
import type { Sugerencia } from "./datos";

const PALABRAS = { una: "evento", varias: "eventos", nota: "Cuenta los eventos de los próximos 7 días de cada ciudad." };

/**
 * Administración › Instagram (OL-458, prototipo firmado, pantalla B; bitácora 490): la cabecera con el chip de ciudad y su hoja (la de las listas
 * de Administración, OL-456), y los eventos en dos grupos de `ui/Grupo`: «Para publicar» (en orden de señal) y «Ya en Instagram». El renglón es
 * el de las listas; tocarlo abre la hoja de vista previa (sin JavaScript, lleva a la ficha). `abrir`: el evento con el que llega abierta la hoja.
 */
export default function ListaInstagram({ ciudad, ciudades, para, ya, abrir, conteo, vacio }: { ciudad: { slug: string | null; nombre: string }; ciudades: CiudadPanel[]; para: Sugerencia[]; ya: Sugerencia[]; abrir: string | null; conteo: string | null; vacio: string | null }) {
  const router = useRouter();
  const [hojaCiudad, setHojaCiudad] = useState(false);
  const [evento, setEvento] = useState<string | null>(abrir);
  const renglon = (s: Sugerencia) => (
    <Renglon
      key={s.id}
      href={s.href}
      foto={s.foto}
      titulo={s.titulo}
      onClick={(e) => {
        e.preventDefault();
        setEvento(s.id);
      }}
    >
      <span>
        <span>{s.cuando}</span>
      </span>
      <span className={renglonCss.envuelve}>{s.donde}</span>
      <span className={renglonCss.envuelve}>{s.linea}</span>
    </Renglon>
  );
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
