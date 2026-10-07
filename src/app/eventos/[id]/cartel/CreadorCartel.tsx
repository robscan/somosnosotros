"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import BotonDescargarCartel from "@/components/BotonDescargarCartel";
import { useMemoriaPantalla } from "@/components/MemoriaPantalla";
import PorPasos, { PiePaso, type Direccion } from "@/components/PorPasos";
import Boton, { claseBoton } from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import { Chip, Chips } from "@/components/ui/Chip";
import Hoja from "@/components/ui/Hoja";
import { IconoDescarga } from "@/components/ui/Iconos";
import { hrefCartel } from "@/lib/carteles/parametros";
import { FORMATOS, type IdFormato } from "@/lib/carteles/tokens";
import { usarComoCartel } from "./acciones";
import styles from "./CreadorCartel.module.css";

export type Opcion = { id: string; nombre: string; cortaTitulo: boolean };

type Props = {
  evento: { slug: string; titulo: string; href: string };
  /** Las tandas de cuatro, en orden: la primera es la que se ofrece; «Ver otras» pasa a la siguiente. */
  tandas: Opcion[][];
  /** La versión del evento, para que la caché del teléfono no dé un cartel viejo. */
  v: string;
};

type Paso = "elegir" | "ver";
type Recordado = { paso: Paso; tanda: number; plantilla: string | null; formato: IdFormato; titulo: string };

/** Lo escrito en «Acortar título» llega a la imagen cuando la persona deja de teclear un momento (no una imagen por letra). */
const ESPERA_TITULO_MS = 700;
const TOPE_TITULO = 80;

/**
 * El creador de cartel (OL-324, doc 52 §3.5), en dos pasos del armazón de siempre (`PorPasos`): «¿Cuál te gusta?» con cuatro opciones grandes
 * en rejilla (toca y elige; «Ver otras» trae las siguientes) y «Así queda» con la vista previa grande, el formato (publicación 4:5 o historia
 * 9:16) y el pie: «Descargar el cartel» («Guardar en Fotos» en la app) y «Usar como cartel del evento», que pregunta antes. El título solo se
 * edita si no cabe («Acortar título», con ✕ y contador): es solo para el cartel, el evento no cambia. Los pasos son estado, no historial
 * (filtrar no es navegar), y la memoria de pantalla los devuelve al volver.
 */
export default function CreadorCartel({ evento, tandas, v }: Props) {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>("elegir");
  const [direccion, setDireccion] = useState<Direccion | null>(null);
  const [tanda, setTanda] = useState(0);
  const [plantilla, setPlantilla] = useState<string | null>(null);
  const [formato, setFormato] = useState<IdFormato>("4x5");
  const [titulo, setTitulo] = useState("");
  const [tituloDibujado, setTituloDibujado] = useState("");
  const [acortando, setAcortando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usando, empezar] = useTransition();

  useMemoriaPantalla<Recordado>(null, { paso, tanda, plantilla, formato, titulo }, (r) => {
    setPaso(r.paso === "ver" && r.plantilla ? "ver" : "elegir");
    setTanda(r.tanda < tandas.length ? r.tanda : 0);
    setPlantilla(r.plantilla);
    setFormato(r.formato === "9x16" ? "9x16" : "4x5");
    setTitulo(r.titulo ?? "");
    setTituloDibujado(r.titulo ?? "");
    setAcortando(!!r.titulo);
  });

  useEffect(() => {
    const espera = setTimeout(() => setTituloDibujado(titulo.trim()), ESPERA_TITULO_MS);
    return () => clearTimeout(espera);
  }, [titulo]);

  const opciones = tandas[tanda] ?? [];
  const elegida = tandas.flat().find((o) => o.id === plantilla) ?? null;
  const propio = tituloDibujado || null;

  const elegir = (id: string) => {
    setPlantilla(id);
    setError(null);
    setDireccion("entra");
    setPaso("ver");
  };
  const atras = () => {
    setDireccion("vuelve");
    setPaso("elegir");
    setConfirmando(false);
  };
  const usar = () =>
    empezar(async () => {
      if (!elegida) return;
      setError(null);
      const r = await usarComoCartel(evento.slug, elegida.id, formato, propio);
      if (r.ok) router.push(r.href);
      else {
        setConfirmando(false);
        setError(r.mensaje);
      }
    });

  if (paso === "elegir" || !elegida) {
    return (
      <PorPasos titulo="Crear cartel" paso={`elegir-${tanda}`} direccion={direccion} avance={0.5} salida={{ href: evento.href, texto: "Volver al evento" }} pregunta="¿Cuál te gusta?">
        <ul className={styles.opciones} aria-label="Diseños">
          {opciones.map((o) => (
            <li key={o.id}>
              <button type="button" className={styles.opcion} onClick={() => elegir(o.id)} aria-label={o.nombre}>
                {/* eslint-disable-next-line @next/next/no-img-element -- la imagen la dibuja el servidor ya a su tamaño (360 de ancho) */}
                <img src={hrefCartel(evento.slug, { plantilla: o.id, formato: "4x5", ancho: 360, titulo: propio, v })} alt="" width={360} height={450} />
              </button>
            </li>
          ))}
        </ul>
        {tandas.length > 1 && (
          <Boton type="button" variante="quieto" onClick={() => setTanda((tanda + 1) % tandas.length)}>
            Ver otros diseños
          </Boton>
        )}
      </PorPasos>
    );
  }

  const cortado = elegida.cortaTitulo && !propio;
  return (
    <PorPasos titulo="Crear cartel" paso="ver" direccion={direccion} avance={1} salida={{ href: evento.href, texto: "Volver al evento" }} onAtras={atras} pregunta="Así queda">
      <Chips ariaLabel="Formato">
        {(Object.values(FORMATOS) as (typeof FORMATOS)[IdFormato][]).map((f) => (
          <Chip key={f.id} activo={formato === f.id} onClick={() => setFormato(f.id)}>
            {f.nombre} {f.proporcion}
          </Chip>
        ))}
      </Chips>
      {/* eslint-disable-next-line @next/next/no-img-element -- la imagen la dibuja el servidor a 720 de ancho */}
      <img key={`${elegida.id}-${formato}-${propio}`} className={styles.vista} data-formato={formato} src={hrefCartel(evento.slug, { plantilla: elegida.id, formato, ancho: 720, titulo: propio, v })} alt={`Vista previa del cartel: ${elegida.nombre}`} width={720} height={formato === "9x16" ? 1280 : 900} />
      {(cortado || acortando) && (
        <div className={styles.titulo}>
          {cortado && !acortando && <p>El título no cabe completo en este diseño.</p>}
          {acortando ? (
            <Campo name="titulo-cartel" etiqueta="Título del cartel" ayuda="Solo cambia en el cartel; el evento no cambia." value={titulo} maxLength={TOPE_TITULO} mostrarContador autoFocus onChange={(e) => setTitulo(e.target.value)} />
          ) : (
            <Boton type="button" variante="quieto" onClick={() => setAcortando(true)}>
              Acortar título
            </Boton>
          )}
        </div>
      )}
      {error && (
        <p className="aviso-error" role="alert">
          {error}
        </p>
      )}
      <PiePaso>
        <BotonDescargarCartel id={evento.slug} href={hrefCartel(evento.slug, { plantilla: elegida.id, formato, titulo: propio, descarga: true })} className={claseBoton()} icono={<IconoDescarga width={20} height={20} />} />
        <Boton type="button" variante="secundario" onClick={() => setConfirmando(true)} aria-busy={usando || undefined} disabled={usando}>
          {usando ? "Poniendo el cartel…" : "Usar como cartel del evento"}
        </Boton>
      </PiePaso>
      {confirmando && (
        <Hoja etiqueta="Usar como cartel del evento" onCerrar={() => setConfirmando(false)}>
          <div className={styles.confirmar}>
            <div className={styles.encabezado}>
              <h3>¿Usar este cartel en el evento?</h3>
              <p>Se verá en la agenda y en la ficha, y reemplaza la imagen que tenga.</p>
            </div>
            <Boton type="button" onClick={usar} disabled={usando} aria-busy={usando || undefined}>
              {usando ? "Poniendo el cartel…" : "Usar este cartel"}
            </Boton>
            <Boton type="button" variante="quieto" onClick={() => setConfirmando(false)}>
              Cancelar
            </Boton>
          </div>
        </Hoja>
      )}
    </PorPasos>
  );
}
