"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import ciudadCss from "@/components/Ciudad.module.css";
import Boton from "@/components/ui/Boton";
import { CampoBuscar } from "@/components/ui/Buscador";
import Hoja from "@/components/ui/Hoja";
import hoja from "@/components/ui/Hoja.module.css";
import Imagen from "@/components/ui/Imagen";
import { IconoPersona } from "@/components/ui/Iconos";
import renglon from "@/components/ui/Renglon.module.css";
import { avisoCompartida, lineaQueEs, lineaQuienLaLleva, MINIMO_BUSQUEDA, textoAsignar, type FichaHallada } from "@/lib/asignarFichas";
import { SIN_FOTO } from "@/lib/imagen";
import { asignarFicha, buscarFichas } from "./acciones";
import IconoFicha from "./IconoFicha";
import css from "./asignar.module.css";

const ESPERA_MS = 250;

/** El renglón de una ficha hallada: foto, nombre, qué es y quién la administra. Botón en la lista; a secas, ya elegida. */
function Ficha({ f, persona, onElegir }: { f: FichaHallada; persona: string; onElegir?: () => void }) {
  const cuerpo = (
    <>
      <Imagen src={f.foto ?? SIN_FOTO} alt="" width={56} height={56} sizes="56px" className={f.tipo === "artista" ? `${renglon.foto} ${renglon.redonda}` : renglon.foto} />
      <b>{f.nombre}</b>
      <small>
        <span>
          <IconoFicha f={f} />
          <span>{lineaQueEs(f)}</span>
        </span>
        <span className={f.suya || f.otros_n ? css.llevada : undefined}>
          <IconoPersona width={15} height={15} />
          <span>{lineaQuienLaLleva(f, persona)}</span>
        </span>
      </small>
    </>
  );
  return onElegir ? (
    <button type="button" className={`${renglon.frente} ${css.hallada}`} onClick={onElegir}>
      {cuerpo}
    </button>
  ) : (
    <div className={`${renglon.frente} ${css.elegida}`}>{cuerpo}</div>
  );
}

/**
 * «Asignar una ficha» (OL-447): la hoja con un solo campo y su ✕ que busca lugares y artistas a la vez (el canon de la hoja de ciudades). Cada
 * resultado dice qué es, de qué ciudad y quién la administra ya. Al elegir uno, la hoja enseña solo esa ficha y un botón que dice lo que va a
 * pasar («Asignar Foro Lunaria a Ana»); si otra cuenta ya la administra, lo dice: asignar agrega, no reemplaza. Escribir otra vez vuelve a la lista.
 */
export default function HojaAsignar({ perfilId, persona, onCerrar, onAsignada }: { perfilId: string; persona: string; onCerrar: () => void; onAsignada: (ficha: string) => void }) {
  const [q, setQ] = useState("");
  const [enfocado, setEnfocado] = useState(false);
  const [halladas, setHalladas] = useState<{ q: string; fichas: FichaHallada[] } | null>(null);
  const [elegida, setElegida] = useState<FichaHallada | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asignando, iniciar] = useTransition();
  // Cada pedido lleva su número: si llega uno viejo (se escribió otra cosa mientras), se descarta.
  const pedido = useRef(0);
  const t = q.trim();

  useEffect(() => {
    if (t.length < MINIMO_BUSQUEDA || elegida) return;
    const n = ++pedido.current;
    const espera = setTimeout(async () => {
      const r = await buscarFichas(perfilId, t);
      if (n !== pedido.current) return;
      if (!r.ok) return setError(r.error);
      setError(null);
      setHalladas({ q: t, fichas: r.fichas });
    }, ESPERA_MS);
    return () => clearTimeout(espera);
  }, [t, elegida, perfilId]);

  function escribir(v: string) {
    setQ(v);
    setError(null);
    // Escribir otra vez deja la ficha elegida y vuelve a la lista.
    if (elegida) setElegida(null);
  }

  function asignar() {
    if (!elegida || elegida.suya) return;
    setError(null);
    iniciar(async () => {
      const r = await asignarFicha(perfilId, elegida.tipo, elegida.id);
      if (!r.ok) return setError(r.error);
      onAsignada(elegida.nombre);
    });
  }

  const campo = (
    <div className={css.buscador} onFocus={() => setEnfocado(true)}>
      <CampoBuscar valor={q} onCambiar={escribir} placeholder="Nombre del lugar o del artista" ariaLabel="Nombre del lugar o del artista" autoFocus={!elegida} />
    </div>
  );
  const aviso = error && (
    <p className="aviso-error" role="alert">
      {error}
    </p>
  );

  if (elegida) {
    const compartida = avisoCompartida(elegida);
    const pie = (
      <Boton disabled={asignando || elegida.suya} aria-busy={asignando} onClick={asignar}>
        {asignando ? "Asignando…" : elegida.suya ? `Ya la administra ${persona}` : textoAsignar(elegida.nombre, persona)}
      </Boton>
    );
    return (
      <Hoja etiqueta="Asignar una ficha" titulo="Asignar una ficha" onCerrar={onCerrar} pie={pie}>
        <div className={ciudadCss.opciones}>
          {campo}
          <Ficha f={elegida} persona={persona} />
          <p className={hoja.nota}>{compartida ?? `Podrá editar la ficha, como quien la reclama y se la aprueban.`}</p>
          {aviso}
        </div>
      </Hoja>
    );
  }

  const lista = t.length >= MINIMO_BUSQUEDA && halladas ? halladas.fichas : null;
  const nota = t.length < MINIMO_BUSQUEDA ? "Escribe el nombre de un lugar o de un artista." : halladas?.q === t ? `Nada con «${t}».` : "Buscando…";
  return (
    <Hoja etiqueta="Asignar una ficha" titulo="Asignar una ficha" plano onCerrar={onCerrar}>
      <div className={[ciudadCss.opciones, (enfocado || !!q) && ciudadCss.buscando].filter(Boolean).join(" ")}>
        {campo}
        {lista?.length ? (
          <ul className={`${ciudadCss.lista} ${css.halladas}`} aria-label="Fichas halladas">
            {lista.map((f) => (
              <li key={`${f.tipo}-${f.id}`}>
                <Ficha
                  f={f}
                  persona={persona}
                  onElegir={() => {
                    setError(null);
                    setElegida(f);
                  }}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className={hoja.nota} role="status">
            {nota}
          </p>
        )}
        {aviso}
      </div>
    </Hoja>
  );
}
