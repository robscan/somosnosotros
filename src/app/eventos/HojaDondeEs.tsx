"use client";

import Link from "next/link";
import { useState } from "react";
import Mapa from "@/components/Mapa";
import Boton from "@/components/ui/Boton";
import Hoja from "@/components/ui/Hoja";
import { IconoBuscar, IconoMas, IconoPin, IconoUbicacion } from "@/components/ui/Iconos";
import { LIMITES_EVENTO, REVELAR_OPCIONES, type ModoSitio } from "@/lib/eventos";
import type { Punto } from "@/lib/geo";
import { etiquetaLugar, normalizarNombre, type LugarResumen } from "@/lib/lugares";
import { avisarQueVuelvo } from "./borrador";
import canon from "@/components/ui/FormularioCanon.module.css";
import styles from "./HojaDondeEs.module.css";

/** Lo que resuelve Dónde cuando no es un lugar registrado: el sitio, su pin y, si es reservado, la dirección exacta. */
export type OtroSitio = {
  reservado: boolean;
  sitioTexto: string;
  sitioPunto: Punto | null;
  direccionPrivada: string;
  privadoPunto: Punto | null;
  revelarHoras: number;
  indicaciones: string;
};

type Props = {
  lugares: LugarResumen[];
  modoSitio: ModoSitio;
  lugarId: string;
  otro: OtroSitio;
  /** La persona en el mapa (punto azul), si ya se ubicó. */
  yo: (Punto & { vez: number }) | null;
  ubicando: boolean;
  avisoUbicacion: string | null;
  /** Adónde vuelve "Registrar un lugar nuevo" con el lugar elegido. */
  volverA: string;
  onLugar: (id: string) => void;
  onOtro: (o: OtroSitio) => void;
  onEstoyAqui: (poner: (p: Punto) => void) => void;
  onCerrar: () => void;
};

/**
 * Hoja "Dónde es" del alta de evento (docs/rediseno/15, decisión 2): un solo camino para resolver Dónde. Arriba el
 * campo con la lupa y los lugares registrados (foto, tipo, calle) que se filtran al escribir; debajo, "Es en otro
 * sitio" (nombre, pin y el interruptor de reservado con la dirección exacta) y "Registrar un lugar nuevo".
 */
export default function HojaDondeEs({ lugares, modoSitio, lugarId, otro, yo, ubicando, avisoUbicacion, volverA, onLugar, onOtro, onEstoyAqui, onCerrar }: Props) {
  const [q, setQ] = useState("");
  const [vista, setVista] = useState<"lista" | "otro">(modoSitio !== "lugar" && otro.sitioTexto ? "otro" : "lista");
  const clave = normalizarNombre(q);
  const filtrados = clave ? lugares.filter((l) => normalizarNombre(l.nombre).includes(clave)) : lugares;
  const cambiar = (parte: Partial<OtroSitio>) => onOtro({ ...otro, ...parte });
  const otroListo = otro.sitioTexto.trim().length > 0 && (!otro.reservado || otro.direccionPrivada.trim().length > 0);

  if (vista === "otro") {
    const punto = otro.reservado ? otro.privadoPunto : otro.sitioPunto;
    const ponerPunto = (p: Punto) => cambiar(otro.reservado ? { privadoPunto: p } : { sitioPunto: p });
    return (
      <Hoja etiqueta="Es en otro sitio" onCerrar={onCerrar}>
        <h3 className={styles.titulo}>Es en otro sitio</h3>
        <div className={styles.otro}>
          <label className={`${canon.campo} ${canon.sinIcono}`}>
            <input type="text" value={otro.sitioTexto} onChange={(e) => cambiar({ sitioTexto: e.target.value })} maxLength={LIMITES_EVENTO.sitio} placeholder={otro.reservado ? "Cómo se anuncia, ej. Casa en Tequis" : "Nombre del sitio, ej. Plaza de Armas"} aria-label={otro.reservado ? "Cómo se anuncia" : "Nombre del sitio"} autoComplete="off" autoFocus />
          </label>
          <div className={styles.mapa}>
            <Mapa modo="elegir" valor={punto} onCambio={ponerPunto} ubicacion={yo} />
            <button type="button" className={styles.ubicame} onClick={() => onEstoyAqui(ponerPunto)} disabled={ubicando} aria-label="Estoy aquí" title="Estoy aquí">
              <IconoUbicacion width={22} height={22} />
            </button>
          </div>
          {avisoUbicacion && <p className={styles.nota}>{avisoUbicacion}</p>}
          <div className={styles.reservado}>
            <b>Reservado</b>
            <small>{otro.reservado ? "La dirección exacta solo la ven quienes van, cuando toque" : "La dirección solo la ven quienes van"}</small>
            <button type="button" role="switch" aria-checked={otro.reservado} aria-label="Sitio reservado" className={canon.palanca} onClick={() => cambiar({ reservado: !otro.reservado })} />
          </div>
          {otro.reservado && (
            <>
              <input type="text" value={otro.direccionPrivada} onChange={(e) => cambiar({ direccionPrivada: e.target.value })} maxLength={LIMITES_EVENTO.direccion} placeholder="Dirección exacta: calle y número, colonia" aria-label="Dirección exacta" className={canon.entrada} autoComplete="off" />
              <select value={otro.revelarHoras} onChange={(e) => cambiar({ revelarHoras: Number(e.target.value) })} aria-label="Cuándo se revela" className={styles.select}>
                {REVELAR_OPCIONES.map((o) => (
                  <option key={o.horas} value={o.horas}>
                    Se revela {o.etiqueta}
                  </option>
                ))}
              </select>
              <input type="text" value={otro.indicaciones} onChange={(e) => cambiar({ indicaciones: e.target.value })} maxLength={LIMITES_EVENTO.indicaciones} placeholder="Indicaciones, ej. portón verde (opcional)" aria-label="Indicaciones" className={canon.entrada} autoComplete="off" />
            </>
          )}
          <button type="button" className={styles.volver} onClick={() => setVista("lista")}>
            Mejor un lugar registrado
          </button>
        </div>
        <Boton type="button" onClick={onCerrar} disabled={!otroListo}>
          Listo
          {!otroListo && <small className={canon.faltaBoton}>{otro.sitioTexto.trim() ? "falta la dirección" : "falta el nombre del sitio"}</small>}
        </Boton>
      </Hoja>
    );
  }

  return (
    <Hoja etiqueta="Dónde es" onCerrar={onCerrar}>
      <h3 className={styles.titulo}>Dónde es</h3>
      <label className={canon.campo}>
        <IconoBuscar width={20} height={20} />
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre del lugar" aria-label="Buscar el lugar" autoComplete="off" autoFocus />
      </label>
      {filtrados.length > 0 ? (
        <ul className={styles.lista} role="listbox" aria-label="Lugares registrados">
          {filtrados.map((l) => (
            <li key={l.id}>
              <button type="button" role="option" aria-selected={l.id === lugarId} className={styles.lugar} onClick={() => onLugar(l.id)}>
                {l.portada ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
                  <img src={l.portada} alt="" className={styles.foto} />
                ) : (
                  <span className={`${styles.foto} ${styles.fotoVacia}`} aria-hidden="true">
                    <IconoPin width={18} height={18} />
                  </span>
                )}
                <b>{l.nombre}</b>
                <small>{[etiquetaLugar(l), l.direccion].filter(Boolean).join(" · ")}</small>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.nadie}>{lugares.length ? `Ningún lugar registrado se llama «${q.trim()}».` : "Todavía no hay lugares registrados."}</p>
      )}
      <ul className={styles.lista}>
        <li>
          <button type="button" className={`${styles.lugar} ${styles.atajo}`} onClick={() => setVista("otro")}>
            <IconoPin width={20} height={20} />
            <b>Es en otro sitio</b>
            <small>Una plaza, un parque, una casa: lo escribes y pones el pin</small>
          </button>
        </li>
        <li>
          <Link href={`/lugares/nuevo?siguiente=${encodeURIComponent(volverA)}`} className={`${styles.lugar} ${styles.atajo}`} onClick={avisarQueVuelvo}>
            <IconoMas width={20} height={20} />
            <b>Registrar un lugar nuevo</b>
            <small>Vuelves aquí con él elegido</small>
          </Link>
        </li>
      </ul>
    </Hoja>
  );
}
