"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import BotonDescargarCartel from "@/components/BotonDescargarCartel";
import { useMemoriaPantalla } from "@/components/MemoriaPantalla";
import PorPasos, { PiePaso, type Direccion } from "@/components/PorPasos";
import { useTerminar, useVolverA } from "@/components/ui/Atras";
import Boton, { claseBoton } from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import { Chip, Chips } from "@/components/ui/Chip";
import Hoja from "@/components/ui/Hoja";
import { IconoDescarga } from "@/components/ui/Iconos";
import type { OrigenCreador } from "@/lib/carteles/origen";
import { hrefCartel } from "@/lib/carteles/parametros";
import { FORMATOS, type IdFormato } from "@/lib/carteles/tokens";
import { formatoMedido, medirCliente, plantillaMedida, rolEnPantalla, tandaMedida } from "@/lib/medir";
import { usarComoCartel } from "./acciones";
import styles from "./CreadorCartel.module.css";

export type Opcion = { id: string; nombre: string; cortaTitulo: boolean };

type Props = {
  evento: { slug: string; titulo: string; href: string };
  /** Las tandas de cuatro, en orden: la primera es la que se ofrece; «Ver otras» pasa a la siguiente. */
  tandas: Opcion[][];
  /** La versión del evento, para que la caché del teléfono no dé un cartel viejo. */
  v: string;
  /** Desde dónde se abrió (`?origen=`), para medirlo (OL-336). */
  origen: OrigenCreador | "otro";
};

type Paso = "elegir" | "ver";
type Recordado = { paso: Paso; tanda: number; plantilla: string | null; formato: IdFormato; titulo: string };

/** Lo escrito en «Acortar título» llega a la imagen cuando la persona deja de teclear un momento (no una imagen por letra). */
const ESPERA_TITULO_MS = 700;
const TOPE_TITULO = 80;

/** «Se abrió» espera a saber quién mira (`rolEnPantalla`: en una carga completa la marca llega en streaming, y sin ella no se mide): hasta 5 s. */
const ESPERA_ROL_MS = 250;
const INTENTOS_ROL = 20;

/** Mide que se abrió el creador y desde dónde (OL-336), una vez al montarse. */
function useMedirApertura(origen: Props["origen"]) {
  useEffect(() => {
    let intentos = 0;
    let plazo: ReturnType<typeof setTimeout> | undefined;
    const medir = () => {
      if (rolEnPantalla() === null && intentos++ < INTENTOS_ROL) {
        plazo = setTimeout(medir, ESPERA_ROL_MS);
        return;
      }
      medirCliente("cartel_abierto", { desde: origen });
    };
    medir();
    return () => clearTimeout(plazo);
  }, [origen]);
}

/**
 * El creador de cartel (OL-324, doc 52 §3.5), en dos pasos del armazón de siempre (`PorPasos`): «¿Cuál te gusta?» con cuatro opciones grandes
 * en rejilla (toca y elige; «Ver otras» trae las siguientes) y «Así queda» con la vista previa grande, el formato (publicación 4:5 o historia
 * 9:16) y el pie: «Descargar el cartel» («Guardar en Fotos» en la app) y «Usar como cartel del evento», que pregunta antes. El título solo se
 * edita si no cabe («Acortar título», con ✕ y contador): es solo para el cartel, el evento no cambia. Los pasos son estado, no historial
 * (filtrar no es navegar), y la memoria de pantalla los devuelve al volver.
 *
 * Atrás útil (OL-336, regla del founder: «siempre el botón atrás sea útil»): la ✕, «No me gusta ninguno» y «Usar como cartel» llevan a la ficha
 * del evento sin dejar el creador detrás. Si se vino de la ficha, se vuelve a ella con el historial (y, tras usar el cartel, se relee); si no (desde
 * «Publicado», que se reemplazó al abrir el creador, o un enlace), el creador se reemplaza por la ficha. Así el Atrás de la ficha lleva a donde
 * estaba la persona antes de entrar al creador (o adonde mandaba el alta), nunca otra vez al creador. Se mide cada paso (`medirCliente`), sin
 * texto escrito ni ids.
 */
export default function CreadorCartel({ evento, tandas, v, origen }: Props) {
  const volverA = useVolverA();
  const terminar = useTerminar();
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
  useMedirApertura(origen);
  const aLaFicha = useCallback(() => volverA(evento.href), [volverA, evento.href]);
  const salida = { href: evento.href, texto: "Volver al evento", alSalir: aLaFicha };

  const opciones = tandas[tanda] ?? [];
  const elegida = tandas.flat().find((o) => o.id === plantilla) ?? null;
  const propio = tituloDibujado || null;

  const elegir = (id: string) => {
    const medida = plantillaMedida(id);
    if (medida) medirCliente("cartel_elegido", { plantilla: medida, formato: formatoMedido(formato) });
    setPlantilla(id);
    setError(null);
    setDireccion("entra");
    setPaso("ver");
  };
  const otros = () => {
    const siguiente = (tanda + 1) % tandas.length;
    medirCliente("cartel_otros", { tanda: tandaMedida(siguiente) });
    setTanda(siguiente);
  };
  // «No me gusta ninguno» (OL-336): se mide y se vuelve a la ficha, sin preguntar por qué ni avisar (el aviso flotante se iría con la pantalla).
  const ninguno = () => {
    medirCliente("cartel_ninguno", { tanda: tandaMedida(tanda) });
    aLaFicha();
  };
  const cambiarFormato = (nuevo: IdFormato) => {
    if (nuevo === formato) return;
    medirCliente("cartel_formato", { formato: formatoMedido(nuevo) });
    setFormato(nuevo);
  };
  const acortar = () => {
    medirCliente("cartel_titulo_acortado");
    setAcortando(true);
  };
  const medirConPlantilla = (nombre: "cartel_descargado" | "cartel_usado") => {
    const medida = elegida && plantillaMedida(elegida.id);
    if (medida) medirCliente(nombre, { plantilla: medida, formato: formatoMedido(formato) });
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
      if (r.ok) {
        medirConPlantilla("cartel_usado");
        // A la ficha sin dejar el creador en el historial (con el historial si se vino de ella, y se relee para ver el cartel nuevo).
        terminar(r.href);
      } else {
        setConfirmando(false);
        setError(r.mensaje);
      }
    });

  if (paso === "elegir" || !elegida) {
    return (
      <PorPasos titulo="Crear cartel" paso={`elegir-${tanda}`} direccion={direccion} avance={0.5} salida={salida} pregunta="¿Cuál te gusta?">
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
          <Boton type="button" variante="quieto" onClick={otros}>
            Ver otros diseños
          </Boton>
        )}
        <Boton type="button" variante="quieto" onClick={ninguno}>
          No me gusta ninguno
        </Boton>
      </PorPasos>
    );
  }

  const cortado = elegida.cortaTitulo && !propio;
  return (
    <PorPasos titulo="Crear cartel" paso="ver" direccion={direccion} avance={1} salida={salida} onAtras={atras} pregunta="Así queda">
      <Chips ariaLabel="Formato">
        {(Object.values(FORMATOS) as (typeof FORMATOS)[IdFormato][]).map((f) => (
          <Chip key={f.id} activo={formato === f.id} onClick={() => cambiarFormato(f.id)}>
            {f.nombre} {f.proporcion}
          </Chip>
        ))}
      </Chips>
      {(cortado || acortando) && (
        <div className={styles.titulo}>
          {cortado && !acortando && <p>El título no cabe completo en este diseño.</p>}
          {acortando ? (
            <Campo name="titulo-cartel" etiqueta="Título del cartel" ayuda="Solo cambia en el cartel; el evento no cambia." value={titulo} maxLength={TOPE_TITULO} mostrarContador autoFocus onChange={(e) => setTitulo(e.target.value)} />
          ) : (
            <Boton type="button" variante="quieto" onClick={acortar}>
              Acortar título
            </Boton>
          )}
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- la imagen la dibuja el servidor a 720 de ancho */}
      <img key={`${elegida.id}-${formato}-${propio}`} className={styles.vista} data-formato={formato} src={hrefCartel(evento.slug, { plantilla: elegida.id, formato, ancho: 720, titulo: propio, v })} alt={`Vista previa del cartel: ${elegida.nombre}`} width={720} height={formato === "9x16" ? 1280 : 900} />
      {error && (
        <p className="aviso-error" role="alert">
          {error}
        </p>
      )}
      <PiePaso>
        <BotonDescargarCartel id={evento.slug} href={hrefCartel(evento.slug, { plantilla: elegida.id, formato, titulo: propio, descarga: true })} className={claseBoton()} icono={<IconoDescarga width={20} height={20} />} alGuardar={() => medirConPlantilla("cartel_descargado")} />
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
