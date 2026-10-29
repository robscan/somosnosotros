"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";
import { Pestana, Pestanas } from "@/components/ui/Pestanas";
import ListaInstagram from "./ListaInstagram";
import SemanaInstagram from "./SemanaInstagram";

/**
 * Administración › Instagram con sus dos pestañas (OL-479; firmado A · R en el prototipo de OL-477, bitácora 509): «Semana» primero (lo que el
 * sistema programó, un día por renglón) y «Eventos» (la lista de hoy, sin cambios). Las pestañas son las de Agenda (`ui/Pestanas`, el último
 * renglón de la cabecera) y viven en la dirección (`?pestana=eventos`; sin ella, Semana): cambiar de una a otra reemplaza la dirección sin apilar
 * historial y sin pedirle nada al servidor. Llegar con `?evento=` (el aviso de una publicación de evento) abre Eventos con su hoja.
 */
export default function PantallaInstagram({ semana, eventos }: { semana: Omit<ComponentProps<typeof SemanaInstagram>, "pestanas">; eventos: Omit<ComponentProps<typeof ListaInstagram>, "pestanas"> }) {
  const ruta = usePathname();
  const params = useSearchParams();
  const pestana = params.get("pestana") === "eventos" || (params.get("evento") && params.get("pestana") !== "semana") ? "eventos" : "semana";
  const ver = (p: "semana" | "eventos") => {
    if (p === pestana) return;
    const s = new URLSearchParams(params);
    s.delete("evento");
    s.delete("dia");
    if (p === "eventos") s.set("pestana", "eventos");
    else s.delete("pestana");
    const consulta = s.toString();
    window.history.replaceState(null, "", consulta ? `${ruta}?${consulta}` : ruta);
    window.scrollTo({ top: 0 });
  };
  const pestanas = (
    <Pestanas ariaLabel="Instagram">
      <Pestana activa={pestana === "semana"} onClick={() => ver("semana")}>
        Semana
      </Pestana>
      <Pestana activa={pestana === "eventos"} onClick={() => ver("eventos")}>
        Eventos
      </Pestana>
    </Pestanas>
  );
  return pestana === "semana" ? <SemanaInstagram {...semana} pestanas={pestanas} /> : <ListaInstagram {...eventos} pestanas={pestanas} />;
}
