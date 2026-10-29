"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import HojaDia from "@/components/instagram/HojaDia";
import HojaMaterial from "@/components/instagram/HojaMaterial";
import HojaSugerencia from "@/components/instagram/HojaSugerencia";
import { useMemoriaPantalla } from "@/components/MemoriaPantalla";
import Cabecera from "@/components/ui/Cabecera";
import { Chip } from "@/components/ui/Chip";
import Grupo from "@/components/ui/Grupo";
import { IconoCaret, IconoPin } from "@/components/ui/Iconos";
import Renglon from "@/components/ui/Renglon";
import renglonCss from "@/components/ui/Renglon.module.css";
import lista from "@/components/Lista.module.css";
import { SIN_FOTO } from "@/lib/imagen";
import { REFRESCO_MS } from "@/lib/redes/reglas";
import admin from "../admin.module.css";
import { HojaCiudades, recordarCiudad } from "../CabeceraLista";
import type { CiudadPanel } from "../consultas";
import type { DiaSemana, Semana } from "./semana";
import styles from "./SemanaInstagram.module.css";

const PALABRAS = { una: "evento", varias: "eventos", nota: "Cuenta los eventos de los próximos 7 días de cada ciudad. Cada ciudad tiene su semana." };
const unir = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/**
 * La pestaña «Semana» de Administración › Instagram (OL-479; firmada en el prototipo de OL-477, A · R, bitácora 509): en la fila de contexto, el
 * chip de ciudad y los de «Esta semana · La que viene» (filtrar no es navegar: cambian la dirección sin apilar historial); el resumen («2
 * publicadas · 4 programadas · el domingo descansa») y un renglón por día con la tarjeta en pequeño, el nombre, «Lun 5 · 7:00 pm · Artista», cómo
 * va, el aviso pendiente y, si ya salió, lo que dio y «Ver». Tocar un día abre su hoja (`HojaDia`). Mientras algo se publica, la semana se
 * refresca sola cada 20 s y al volver a la app.
 * OL-488 (bitácora 520): los días que ya pasaron sin publicación van en una línea gris («Mié 7 · antes de armar la semana»); de hoy en adelante,
 * un día sin publicación trae lo que sugiere la regla (su hoja: «Publicar ahora» hoy, «Programar» a su hora) o, si nadie tiene material,
 * «Nadie con material para hoy», que abre «Falta material»; y al final de la semana, el renglón «Falta material» (quién se quedó fuera por falta
 * de foto o portada, con «Pedírselo» y «Subir yo»).
 */
export default function SemanaInstagram({ ciudad, ciudades, semana, cual, pestanas, abrir, conexion, usuarioId = "" }: { ciudad: { slug: string | null; nombre: string }; ciudades: CiudadPanel[]; semana: Semana | null; cual: "esta" | "viene"; pestanas: ReactNode; abrir: string | null; conexion?: ReactNode; usuarioId?: string }) {
  const router = useRouter();
  const ruta = usePathname();
  const params = useSearchParams();
  const [hojaCiudad, setHojaCiudad] = useState(false);
  const [dia, setDia] = useState<string | null>(abrir);
  const [sugerida, setSugerida] = useState<string | null>(null);
  const [verFalta, setVerFalta] = useState(false);
  const falta = semana?.falta?.fichas.length ? semana.falta : null;
  // La memoria de pantalla (canon): volver de una ficha repone la semana elegida y el desplazamiento.
  useMemoriaPantalla<{ cual: "esta" | "viene" }>(null, { cual }, () => undefined);
  const ir = (cambios: Record<string, string | null>) => {
    const s = new URLSearchParams(params);
    for (const [k, v] of Object.entries(cambios)) {
      if (v === null) s.delete(k);
      else s.set(k, v);
    }
    const consulta = s.toString();
    router.replace(consulta ? `${ruta}?${consulta}` : ruta, { scroll: false });
  };
  const hayEnCamino = !!semana?.dias.some((d) => d.estado === "publicando");
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

  const renglon = (d: DiaSemana) =>
    d.pasado ? (
      <li key={d.id} className={styles.pasado}>
        {d.pasado}
      </li>
    ) : (
    <Renglon
      key={d.id}
      href={d.href}
      foto={d.imagen}
      cartel
      titulo={d.nombre}
      onClick={(e) => {
        e.preventDefault();
        if (d.sugerencia) setSugerida(d.fecha);
        else if (d.nadie) {
          if (d.nadie.abreFalta) setVerFalta(true);
        } else if (!d.id.startsWith("sin-")) setDia(d.id);
      }}
      accion={
        d.estado === "publicado" && d.permalink ? (
          <a className={unir(admin.enlace, styles.ver)} href={d.permalink} target="_blank" rel="noopener noreferrer" aria-label={`Ver en Instagram: ${d.nombre}`}>
            Ver
          </a>
        ) : undefined
      }
    >
      <span className={renglonCss.envuelve}>{d.cuando}</span>
      <span className={unir(renglonCss.envuelve, d.estado === "publicado" && styles.hecho, (d.sugerencia || d.nadie?.abreFalta) && styles.falta)}>{d.lineaEstado}</span>
      {d.aviso && <span className={unir(renglonCss.envuelve, d.aviso.falta && styles.falta)}>{d.aviso.texto}</span>}
      {d.medida && <span className={renglonCss.envuelve}>{d.medida}</span>}
    </Renglon>
    );
  const laSugerida = semana?.dias.find((d) => d.fecha === sugerida)?.sugerencia ?? null;

  return (
    <>
      <Cabecera
        contexto={
          <>
            <Chip variante="contexto" activo={!!ciudad.slug} icono={<IconoPin width={16} height={16} />} fin={<IconoCaret width={12} height={12} />} onClick={() => setHojaCiudad(true)}>
              {ciudad.nombre}
            </Chip>
            {ciudad.slug && (
              <>
                <Chip activo={cual === "esta"} onClick={() => cual !== "esta" && ir({ semana: null, dia: null })}>
                  Esta semana
                </Chip>
                <Chip activo={cual === "viene"} onClick={() => cual !== "viene" && ir({ semana: "viene", dia: null })}>
                  La que viene
                </Chip>
              </>
            )}
          </>
        }
      >
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
            if (slug !== ciudad.slug) ir({ ciudad: slug ?? "todas", dia: null });
          }}
          onCerrar={() => setHojaCiudad(false)}
        />
      )}
      {conexion}
      {!ciudad.slug ? (
        <p className={lista.vacio}>Cada ciudad tiene su semana en Instagram: elige una arriba.</p>
      ) : !semana ? (
        <p className={lista.vacio}>No pudimos leer la semana. Intenta de nuevo en un momento.</p>
      ) : (
        <>
          <p className={lista.conteo}>{semana.resumen}</p>
          <Grupo titulo={semana.rango} detalle="7 días">
            {semana.dias.map(renglon)}
          </Grupo>
          {falta && (
            <Grupo>
              <Renglon
                href="/admin/instagram"
                foto={falta.fichas.find((f) => f.foto)?.foto ?? SIN_FOTO}
                redonda
                titulo="Falta material"
                onClick={(e) => {
                  e.preventDefault();
                  setVerFalta(true);
                }}
              >
                <span className={renglonCss.envuelve}>{falta.resumen}</span>
                <span className={unir(renglonCss.envuelve, styles.falta)}>Pedírselo o subirla tú</span>
              </Renglon>
            </Grupo>
          )}
        </>
      )}
      {dia && <HojaDia id={dia} onCerrar={() => setDia(null)} onCambio={() => router.refresh()} />}
      {laSugerida && semana && <HojaSugerencia ciudad={semana.ciudad} sugerencia={laSugerida} onCerrar={() => setSugerida(null)} onCambio={() => router.refresh()} />}
      {verFalta && falta && <HojaMaterial falta={falta} usuarioId={usuarioId} onCerrar={() => setVerFalta(false)} onCambio={() => router.refresh()} />}
    </>
  );
}
