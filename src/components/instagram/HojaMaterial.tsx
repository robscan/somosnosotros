"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import Boton from "@/components/ui/Boton";
import FotoSubida from "@/components/ui/FotoSubida";
import canon from "@/components/ui/FormularioCanon.module.css";
import Hoja from "@/components/ui/Hoja";
import { IconoOk } from "@/components/ui/Iconos";
import hoja from "@/components/ui/Hoja.module.css";
import Renglon from "@/components/ui/Renglon";
import renglonCss from "@/components/ui/Renglon.module.css";
import useSubidaDeFoto from "@/components/ui/useSubidaDeFoto";
import admin from "@/app/admin/admin.module.css";
import {
  pedirMaterial,
  ponerMaterial,
  type Hecho,
} from "@/app/admin/instagram/accionesSemana";
import type {
  FaltaMaterial,
  FichaSinMaterial,
} from "@/app/admin/instagram/semana";
import { subirFoto } from "@/lib/subirFoto";
import styles from "./HojaMaterial.module.css";

const NO_SE_PUDO: Hecho = {
  ok: false,
  mensaje: "No se pudo guardar. Intenta de nuevo en un momento.",
};

/**
 * «Falta material» de la semana de Instagram (OL-488, bitácora 520; founder: «Primero confirmar que tenemos material visual; si no,
 * conseguirlo… es una manera de promover que los artistas entren y completen sus perfiles»). Tres vistas dentro de la misma hoja (filtrar no es
 * navegar: nada se apila en el historial):
 *   · la lista: quién tiene fecha y se quedó fuera, qué le falta, su próxima fecha y quién lleva la ficha;
 *   · la ficha: «Pedírselo» (si alguien la lleva: le llega el aviso en la app y en su teléfono, una vez por semana) y «Subir yo»;
 *   · subir: solo los huecos que faltan (la foto y la portada del artista, la portada del lugar), con la espera de subida de toda la app (OL-353;
 *     el teléfono reduce la imagen antes, OL-352) y «Guardar». Al guardar vuelve a la lista, ya sin esa ficha (y la semana la toma).
 */
export default function HojaMaterial({
  falta,
  usuarioId,
  onCerrar,
  onCambio,
}: {
  falta: FaltaMaterial;
  usuarioId: string;
  onCerrar: () => void;
  onCambio?: () => void;
}) {
  const [elegida, setElegida] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [hechas, setHechas] = useState<Record<string, string>>({});
  const [quitadas, setQuitadas] = useState<string[]>([]);
  const [pedidas, setPedidas] = useState<string[]>([]);
  const [imagenes, setImagenes] = useState<{ foto?: string; portada?: string }>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [enviando, enviar] = useTransition();
  const subida = useSubidaDeFoto<"foto" | "portada">();

  const fichas = falta.fichas.filter((f) => !quitadas.includes(f.id));
  const f = fichas.find((x) => x.id === elegida) ?? null;
  const volver = () => {
    setElegida(null);
    setSubiendo(false);
    setImagenes({});
    setError(null);
  };
  const cerrar = () => {
    if (!enviando && !subida.subiendo) onCerrar();
  };

  // ----- Subir yo: los huecos que faltan.
  if (f && subiendo) {
    const huecos = (
      f.tipo === "artista"
        ? (["foto", "portada"] as const)
        : (["portada"] as const)
    ).filter((h) => f.falta.includes(h) || f.falta.includes(`${h}_ajena`));
    const listas = huecos.every((h) => imagenes[h]);
    const elegir =
      (h: "foto" | "portada") => (e: ChangeEvent<HTMLInputElement>) =>
        subida.subir(
          e,
          async (archivo) => {
            setError(null);
            const r = await subirFoto(
              f.tipo === "artista" ? "artistas" : "lugares",
              usuarioId,
              h,
              archivo,
              h,
              "portada",
            );
            if ("error" in r) return setError(r.error);
            setImagenes((x) => ({ ...x, [h]: r.url }));
            return r.url;
          },
          h,
        );
    const guardar = () =>
      enviar(async () => {
        setError(null);
        const r = await ponerMaterial(f.tipo, f.id, imagenes).catch(
          () => NO_SE_PUDO,
        );
        if (!r.ok) return setError(r.mensaje);
        setHechas((x) => ({ ...x, [f.id]: f.nombre }));
        setQuitadas((x) => [...x, f.id]);
        volver();
        onCambio?.();
      });
    return (
      <Hoja
        etiqueta={`Subir el material de ${f.nombre}`}
        titulo={f.nombre}
        onCerrar={cerrar}
        pie={
          <>
            <Boton
              type="button"
              variante="secundario"
              onClick={() => setSubiendo(false)}
              disabled={enviando || !!subida.subiendo}
            >
              Volver
            </Boton>
            <Boton
              type="button"
              onClick={guardar}
              disabled={!listas || enviando || !!subida.subiendo}
              aria-busy={enviando || undefined}
            >
              {enviando
                ? "Guardando…"
                : listas
                  ? "Guardar"
                  : `Falta ${huecos
                      .filter((h) => !imagenes[h])
                      .map((h) => `la ${h}`)
                      .join(" y ")}`}
            </Boton>
          </>
        }
      >
        <p className={hoja.nota}>
          Sube {huecos.map((h) => `la ${h}`).join(" y ")} de su obra o de su
          espacio. Se guarda en su ficha y con eso entra a la semana de
          Instagram.
        </p>
        {huecos.map((h) => (
          <div
            key={h}
            className={styles.hueco}
            aria-busy={subida.subiendo === h || undefined}
          >
            {imagenes[h] || subida.vistaDe(h) ? (
              <FotoSubida
                src={imagenes[h]}
                vista={subida.vistaDe(h)}
                className={h === "foto" ? styles.foto : styles.portada}
              />
            ) : (
              <span
                className={h === "foto" ? styles.foto : styles.portada}
                aria-hidden="true"
              />
            )}
            <label className={canon.subir}>
              <input
                type="file"
                accept="image/*"
                onChange={elegir(h)}
                disabled={!!subida.subiendo || enviando}
                aria-label={
                  h === "foto" ? "Elegir la foto" : "Elegir la portada"
                }
              />
              {subida.subiendo === h
                ? "Subiendo…"
                : imagenes[h]
                  ? `Cambiar la ${h}`
                  : h === "foto"
                    ? "Elegir la foto"
                    : "Elegir la portada"}
            </label>
          </div>
        ))}
        {error && (
          <p className="aviso-error" role="alert">
            {error}
          </p>
        )}
      </Hoja>
    );
  }

  // ----- La ficha: «Pedírselo» o «Subir yo».
  if (f) {
    const pedida = pedidas.includes(f.id);
    const pedir = () =>
      enviar(async () => {
        setError(null);
        const r = await pedirMaterial(f.tipo, f.id, falta.lunes).catch(
          () => NO_SE_PUDO,
        );
        if (!r.ok) return setError(r.mensaje);
        setPedidas((x) => [...x, f.id]);
        onCambio?.();
      });
    return (
      <Hoja
        etiqueta={f.nombre}
        titulo={f.nombre}
        onCerrar={cerrar}
        pie={
          <>
            <Boton
              type="button"
              variante={f.puedePedir && !pedida ? "secundario" : undefined}
              onClick={() => setSubiendo(true)}
              disabled={enviando}
            >
              Subir yo
            </Boton>
            {f.puedePedir && !pedida && (
              <Boton
                type="button"
                onClick={pedir}
                disabled={enviando}
                aria-busy={enviando || undefined}
              >
                {enviando ? "Pidiendo…" : "Pedírselo"}
              </Boton>
            )}
          </>
        }
      >
        <p className={`${hoja.nota} ${styles.falta}`}>{f.queFalta}.</p>
        {f.proxima && <p className={hoja.nota}>{f.proxima}.</p>}
        {f.otros && <p className={hoja.nota}>{f.otros}.</p>}
        {pedida || f.pedido ? (
          <p className={`${admin.hecho} ${styles.hecho}`} role="status">
            <IconoOk width={22} height={22} />
            <span>
              {pedida
                ? `Se lo pedimos hoy: le mandamos a ${f.lleva} el aviso en la app y en su teléfono.`
                : `${f.pedido}. Se pide una vez por semana.`}
            </span>
          </p>
        ) : f.lleva ? (
          <p className={hoja.nota}>
            La lleva {f.lleva}. Con «Pedírselo» le llega un aviso en la app y en
            su teléfono: «Completa tu portada y te presentamos en Instagram».
            Abre la edición de su ficha.
          </p>
        ) : (
          <p className={hoja.nota}>
            Nadie lleva esta ficha todavía: súbela tú.
          </p>
        )}
        {error && (
          <p className="aviso-error" role="alert">
            {error}
          </p>
        )}
        <p className={hoja.nota}>
          <button
            type="button"
            className={admin.enlace}
            onClick={volver}
            disabled={enviando}
          >
            Volver a la lista
          </button>
        </p>
      </Hoja>
    );
  }

  // ----- La lista.
  const guardadas = Object.values(hechas);
  return (
    <Hoja etiqueta="Falta material" titulo="Falta material" onCerrar={cerrar}>
      <p className={hoja.nota}>
        Lo que se presenta en Instagram es lo que está en la app: con su foto y
        su portada, cada ficha entra sola a la semana.
      </p>
      {guardadas.length > 0 && (
        <p className={`${admin.hecho} ${styles.hecho}`} role="status">
          <IconoOk width={22} height={22} />
          <span>{`${guardadas.join(" y ")} ya ${guardadas.length === 1 ? "tiene" : "tienen"} su material: ${guardadas.length === 1 ? "entra" : "entran"} a la semana.`}</span>
        </p>
      )}
      {fichas.length ? (
        <ul className={styles.lista}>
          {fichas.map((x: FichaSinMaterial) => (
            <Renglon
              key={x.id}
              href={x.ficha}
              foto={x.foto}
              redonda={x.tipo === "artista"}
              titulo={x.nombre}
              onClick={(e) => {
                e.preventDefault();
                setError(null);
                setElegida(x.id);
              }}
            >
              <span className={`${renglonCss.envuelve} ${styles.falta}`}>
                {x.queFalta}
              </span>
              {x.proxima && (
                <span className={renglonCss.envuelve}>{x.proxima}</span>
              )}
              <span className={renglonCss.envuelve}>
                {pedidas.includes(x.id)
                  ? "Se lo pedimos hoy"
                  : (x.pedido ??
                    (x.lleva ? `La lleva ${x.lleva}` : "Nadie lleva la ficha"))}
              </span>
            </Renglon>
          ))}
        </ul>
      ) : (
        <p className={hoja.nota}>
          Ya nadie con fecha se queda fuera por falta de foto o portada.
        </p>
      )}
    </Hoja>
  );
}
