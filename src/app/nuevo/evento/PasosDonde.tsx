"use client";

import { useRef, useState, type ReactNode } from "react";
import MapaDondeEs from "@/components/MapaDondeEs";
import { PiePaso } from "@/components/PorPasos";
import Boton from "@/components/ui/Boton";
import ContadorCaracteres from "@/components/ui/ContadorCaracteres";
import { IconoBuscar, IconoCandado, IconoLapiz, IconoMas, IconoOk, IconoPin, IconoUbicacion } from "@/components/ui/Iconos";
import Limpiar from "@/components/ui/Limpiar";
import ListaFlotante from "@/components/ui/ListaFlotante";
import Opcion from "@/components/ui/Opcion";
import canon from "@/components/ui/FormularioCanon.module.css";
import sug from "@/components/ui/Sugerencia.module.css";
import { lugaresPorTexto, type LugarSugerido } from "@/lib/buscarLugares";
import type { Ciudad } from "@/lib/ciudad";
import { configPublica } from "@/lib/config";
import type { ContextoDireccion } from "@/lib/direccionContexto";
import { LIMITES_EVENTO } from "@/lib/eventos";
import type { Punto } from "@/lib/geo";
import { lugarDesdePunto } from "@/lib/geocodificar";
import type { LugarResumen } from "@/lib/lugares";
import { lugarAlLado, tituloDe, usosDisponibles, type Candidato, type Uso } from "./pasos";
import { useBusquedaSitio } from "./useBusquedaSitio";
import styles from "./AltaEvento.module.css";

/**
 * Los tres pasos de «Dónde» del alta de evento (OL-301; prototipo firmado, bitácora 323): buscar el sitio con un solo campo (`PasoDonde`),
 * confirmar el pin en el mapa (`PasoMapa`) y, si no es un lugar del directorio, decir qué hacer con él (`PasoUso`). Sustituyen a la
 * hoja de siempre (`HojaDonde`), que sigue en el alta de siempre. La dirección es texto de confirmación, nunca un campo.
 */

/**
 * ¿Dónde es? Un solo campo («Nombre del lugar o dirección») con lupa y ✕. Con 2 letras o más, una lista flotante bajo el campo: los
 * lugares del directorio que coinciden y, debajo, lo que trae el mapa. Sin texto, «Estoy aquí». Un lugar del directorio contesta (su
 * punto ya está confirmado); un resultado del mapa o «Estoy aquí» llevan a confirmar el pin.
 */
export function PasoDonde({
  q,
  onBuscar,
  lugares,
  contexto,
  ubicando,
  avisoUbicacion,
  onEstoyAqui,
  onLugar,
  onCandidato,
}: {
  q: string;
  onBuscar: (q: string) => void;
  lugares: LugarResumen[];
  contexto: ContextoDireccion;
  ubicando: boolean;
  avisoUbicacion: string | null;
  onEstoyAqui: (poner: (p: Punto) => void) => void;
  onLugar: (lugar: LugarResumen) => void;
  onCandidato: (candidato: Candidato) => void;
}) {
  const ancla = useRef<HTMLLabelElement>(null);
  // La lista se cierra con un toque fuera y se abre sola en cuanto el texto cambia: se guarda PARA QUÉ texto se cerró.
  const [cerradaPara, setCerradaPara] = useState<string | null>(null);
  const [eligiendo, setEligiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // «Estoy aquí»: tras leer la ubicación del teléfono (`ubicando`), se le pide al mapa la dirección de ese punto antes de ir a confirmarlo.
  const [leyendo, setLeyendo] = useState(false);
  const texto = q.trim();
  const busqueda = useBusquedaSitio(q, contexto);
  const delDirectorio = texto.length >= 2 ? lugaresPorTexto(lugares, q) : [];
  const delMapa = busqueda.opciones;
  const buscando = texto.length >= 3 && !busqueda.lista;
  const sinNada = texto.length >= 3 && busqueda.lista && !busqueda.falla && !delDirectorio.length && !delMapa.length;
  const hay = delDirectorio.length > 0 || delMapa.length > 0 || buscando || busqueda.falla || sinNada || eligiendo;
  const abierta = texto.length >= 2 && cerradaPara !== q && hay;

  async function elegirDelMapa(item: LugarSugerido) {
    if (eligiendo) return;
    setEligiendo(true);
    setError(null);
    const candidato = await busqueda.elegir(item);
    setEligiendo(false);
    if (candidato) onCandidato(candidato);
    else setError("No pude ubicar esa opción. Busca de nuevo.");
  }

  function estoyAqui() {
    if (ubicando || leyendo) return;
    onEstoyAqui(async (punto) => {
      setLeyendo(true);
      const candidato = await busqueda.aqui(punto);
      setLeyendo(false);
      onCandidato(candidato);
    });
  }

  return (
    <>
      <label className={canon.campo} ref={ancla}>
        <IconoBuscar width={20} height={20} />
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setError(null);
            onBuscar(e.target.value);
          }}
          placeholder="Nombre del lugar o dirección"
          aria-label="Buscar el lugar"
          autoComplete="off"
          enterKeyHint="search"
          role="combobox"
          aria-expanded={abierta}
          aria-controls="lista-sitio"
          aria-autocomplete="list"
          autoFocus
        />
        <Limpiar visible={!!q} />
      </label>
      {error && (
        <p className={styles.aviso} role="alert">
          {error}
        </p>
      )}
      {texto.length < 2 && (
        <>
          <Opcion icono={<IconoUbicacion />} titulo="Estoy aquí" detalle={ubicando || leyendo ? "Buscando tu ubicación…" : "Usa la ubicación del teléfono"} onClick={estoyAqui} />
          {avisoUbicacion && (
            <p className={styles.aviso} role="status">
              {avisoUbicacion}
            </p>
          )}
        </>
      )}
      <ListaFlotante abierta={abierta} onCerrar={() => setCerradaPara(q)} ancla={ancla} id="lista-sitio" etiqueta="Lugares y direcciones">
        {delDirectorio.map((l) => (
          <li key={`l-${l.id}`}>
            <button type="button" role="option" aria-selected={false} className={sug.renglon} onClick={() => onLugar(l)}>
              <IconoPin width={20} height={20} />
              <b>{l.nombre}</b>
              <small>{[l.privado ? "Privado" : "Lugar del directorio", l.direccion].filter(Boolean).join(" · ")}</small>
            </button>
          </li>
        ))}
        {delMapa.map((item) => (
          <li key={`m-${item.mapboxId}`}>
            <button type="button" role="option" aria-selected={false} className={sug.renglon} onClick={() => void elegirDelMapa(item)}>
              <IconoPin width={20} height={20} />
              <b>{item.nombre}</b>
              <small>{["Del mapa", item.direccion].filter(Boolean).join(" · ")}</small>
            </button>
          </li>
        ))}
        {(buscando || eligiendo) && (
          <li className={styles.avisoLista} role="status">
            {eligiendo ? "Ubicando…" : "Buscando…"}
          </li>
        )}
        {busqueda.falla && (
          <li className={styles.avisoLista} role="alert">
            No pude buscar. Intenta de nuevo o escribe la dirección.
          </li>
        )}
        {sinNada && (
          <li className={styles.avisoLista} role="status">
            No encontré «{texto}». Prueba con la calle y el número.
          </li>
        )}
      </ListaFlotante>
    </>
  );
}

/**
 * ¿Es aquí? El mapa con el pin arrastrable y, debajo, la tarjeta que confirma: el nombre del sitio en negrita y su dirección en letra
 * suave (la dirección es confirmación, no un campo). Si el mapa solo dio una dirección, esa es el título y «Ponle nombre» abre UNA caja
 * de texto en su lugar. Al arrastrar el pin se vuelve a pedir la dirección del punto. Sin nombre propio, un lugar del directorio a menos
 * de 50 m se ofrece como título («A 40 m de ti · lugar del directorio») y confirmar lo usa. Pie: «Sí, es aquí» y «Buscar otro».
 */
export function PasoMapa({
  candidato,
  lugares,
  ciudad,
  yo,
  onLugar,
  onConfirmar,
  onOtro,
}: {
  candidato: Candidato;
  lugares: LugarResumen[];
  ciudad: Ciudad;
  yo: (Punto & { vez: number }) | null;
  onLugar: (lugar: LugarResumen) => void;
  onConfirmar: (candidato: Candidato) => void;
  onOtro: () => void;
}) {
  const [c, setC] = useState(candidato);
  const [ubicando, setUbicando] = useState(false);
  const [movido, setMovido] = useState(false);
  const [nombrando, setNombrando] = useState(false);
  const version = useRef(0);

  // La dirección del punto que se mueve: el mapa la da al pedírsela, y mientras llega el botón dice «Ubicando…». Si otro pin llegó mientras
  // tanto (`version`), la respuesta vieja se descarta.
  async function pedirDireccion(punto: Punto) {
    const { mapboxToken } = configPublica();
    const esta = ++version.current;
    if (!mapboxToken) return;
    try {
      const r = await lugarDesdePunto(punto, mapboxToken);
      if (esta === version.current) setC((a) => ({ ...a, direccion: r?.direccion ?? "", ciudad: r?.ciudad ?? null }));
    } catch {
      if (esta === version.current) setC((a) => ({ ...a, direccion: "", ciudad: null }));
    } finally {
      if (esta === version.current) setUbicando(false);
    }
  }

  function mover(punto: Punto) {
    setMovido(true);
    setC((a) => ({ ...a, punto, direccion: "", ciudad: null }));
    setUbicando(!!configPublica().mapboxToken);
    void pedirDireccion(punto);
  }

  const alLado = c.nombre.trim() ? null : lugarAlLado(lugares, c.punto);
  const sinTitulo = !tituloDe(c) && !ubicando && !alLado;
  const titulo = alLado ? alLado.lugar.nombre : tituloDe(c) || (ubicando ? "Ubicando…" : "Este punto del mapa");
  const detalle = alLado ? `A ${alLado.metros} m ${c.origen === "aqui" && !movido ? "de ti" : "del pin"} · lugar del directorio` : c.nombre.trim() ? c.direccion || (ubicando ? "Ubicando…" : "") : "";
  const nombrar = nombrando || sinTitulo;
  const bloqueo = ubicando ? "Ubicando…" : sinTitulo && !c.nombre.trim() ? "Falta el nombre" : null;

  return (
    <>
      <div className={styles.mapaPaso}>
        <MapaDondeEs lugares={[]} seleccion={c.punto} centrarEn={c.punto} ciudad={ciudad} yo={yo} onLugar={() => {}} onPoi={(_, punto) => mover(punto)} onPunto={mover} onArrastre={mover} />
      </div>
      <div className={styles.confirma} role="status">
        <IconoOk width={20} height={20} />
        <b>{titulo}</b>
        {detalle && <small>{detalle}</small>}
      </div>
      <small className={styles.aviso}>Si el pin no está en su sitio, arrástralo.</small>
      {nombrar ? (
        <label className={canon.campo}>
          <IconoLapiz width={20} height={20} />
          <input
            type="text"
            value={c.nombre}
            onChange={(e) => setC((a) => ({ ...a, nombre: e.target.value }))}
            maxLength={LIMITES_EVENTO.sitio}
            placeholder="Nombre del lugar"
            aria-label="Nombre del lugar"
            autoComplete="off"
            autoFocus
          />
          <Limpiar visible={!!c.nombre} />
          <ContadorCaracteres valor={c.nombre} tope={LIMITES_EVENTO.sitio} />
        </label>
      ) : (
        !c.nombre.trim() &&
        !alLado && (
          <Boton type="button" variante="quieto" onClick={() => setNombrando(true)}>
            Ponle nombre
          </Boton>
        )
      )}
      <PiePaso>
        <Boton type="button" aria-disabled={bloqueo ? true : undefined} onClick={bloqueo ? undefined : () => (alLado ? onLugar(alLado.lugar) : onConfirmar(c))}>
          {bloqueo ?? "Sí, es aquí"}
        </Boton>
        <Boton type="button" variante="quieto" onClick={onOtro}>
          Buscar otro
        </Boton>
      </PiePaso>
    </>
  );
}

const USOS: Record<Uso, { icono: ReactNode; titulo: string; detalle: string }> = {
  evento: { icono: <IconoPin />, titulo: "Usarlo solo en este evento", detalle: "Sale con su nombre y su punto en el mapa" },
  lugar: { icono: <IconoMas />, titulo: "Guardarlo como lugar", detalle: "Tendrá su ficha y servirá para otros eventos" },
  reservado: { icono: <IconoCandado />, titulo: "Es un sitio reservado", detalle: "La dirección solo se muestra a quien va" },
};

/**
 * No está en el directorio. Tres opciones grandes y elegir avanza; «Guardarlo como lugar» no se ofrece si el mapa dice que es un negocio
 * (bar, café, restaurante: no entran al directorio) ni si el sitio no tiene nombre (una dirección no nombra un lugar).
 */
export function PasoUso({ candidato, onUsar }: { candidato: Candidato; onUsar: (uso: Uso) => void }) {
  return (
    <div className={styles.opciones} role="group" aria-label="Qué hacer con este sitio">
      {usosDisponibles(candidato).map((uso) => (
        <Opcion key={uso} icono={USOS[uso].icono} titulo={USOS[uso].titulo} detalle={USOS[uso].detalle} onClick={() => onUsar(uso)} />
      ))}
    </div>
  );
}
