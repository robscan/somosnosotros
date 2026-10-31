"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLayoutEffect, useState, type ComponentProps } from "react";
import { Pestana, Pestanas } from "@/components/ui/Pestanas";
import type { ClaveVuelta, EstadoConexion } from "@/lib/instagram/conexionEstado";
import { guardarMemoria, leerMemoria } from "@/lib/memoriaPantalla";
import type { RenglonSinSalir } from "@/lib/redes/sinSalir";
import { volverAPublicar, type Vueltos } from "./acciones";
import ConexionInstagram, { BotonConexion, HojaConexion, porVolver } from "./ConexionInstagram";
import ListaInstagram from "./ListaInstagram";
import { pestanaDeLaDireccion, type PestanaInstagram } from "./pestana";
import { SemanaSinMaterial } from "./RenglonFalta";
import type { FaltaMaterial } from "./semana";
import SemanaInstagram from "./SemanaInstagram";
import styles from "./PantallaInstagram.module.css";

/** La pestaña que eligió la persona en esta sesión (memoria de pantalla, sessionStorage): una sola para la pantalla, sea cual sea su dirección. */
const MEMORIA = "/admin/instagram#pestana";

/**
 * Administración › Instagram con sus dos pestañas (OL-479; firmado A · R en el prototipo de OL-477, bitácora 509): «Semana» (lo que el sistema
 * programó, un día por renglón) y «Eventos» (la lista de hoy). Las pestañas son las de Agenda (`ui/Pestanas`, el último renglón de la cabecera) y
 * viven en la dirección (`?pestana=`): cambiar de una a otra reemplaza la dirección sin apilar historial y sin pedirle nada al servidor. Llegar
 * con `?evento=` (el aviso de una publicación de evento) abre Eventos con su hoja.
 * OL-495 (firmado en el prototipo de OL-493, variante C, bitácora 525): sin pestaña en la dirección, manda la que la persona eligió en esta sesión
 * (memoria de pantalla) y, si no eligió, `inicial` (la regla de `pestana.ts`: «Semana» si tiene algo de hoy en adelante; si no, «Eventos»). A la
 * derecha de las pestañas, el botón de la conexión (icono de Instagram con su punto) abre la hoja de la conexión; bajo la cabecera, solo la vuelta
 * de Meta y, si falta algo o caducó, el renglón con la causa.
 * OL-496: al volver de Meta con la conexión hecha y algo que se quedó sin salir esta semana por la conexión caducada (`sinSalir`), la hoja de la
 * conexión se abre sola con «Se quedó sin salir», la lista corta y «Volver a publicar (N)»; cerrada, la línea verde lleva de vuelta a ella.
 * La lista se guarda al llegar (la dirección pierde `?conectado` y el servidor ya no la manda) y la respuesta también: no se ofrece dos veces.
 */
export default function PantallaInstagram({ semana, eventos, conexion, vuelta, inicial, sinMaterial, sinSalir = [] }: { semana: Omit<ComponentProps<typeof SemanaInstagram>, "pestanas" | "conexion">; eventos: Omit<ComponentProps<typeof ListaInstagram>, "pestanas" | "conexion" | "sinMaterial">; conexion: EstadoConexion; vuelta: ClaveVuelta | null; inicial: PestanaInstagram; sinMaterial: { falta: FaltaMaterial; usuarioId: string } | null; sinSalir?: RenglonSinSalir[] }) {
  const ruta = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [elegida, setElegida] = useState<PestanaInstagram | null>(null);
  const [renglones] = useState(() => (vuelta === "conectado" ? sinSalir : []));
  const [vueltos, setVueltos] = useState<Vueltos | null>(null);
  const [hojaConexion, setHojaConexion] = useState(renglones.length > 0);
  const quedan = porVolver({ renglones, vueltos }).length;
  const alTerminar = (v: Vueltos) => {
    setVueltos(v);
    if (v.ok && v.enCamino) router.refresh(); // la lista y la semana dicen «Publicando…»
  };
  // Antes de pintar: la que se eligió en esta sesión (volver a la pantalla, recargarla), sin parpadeo.
  useLayoutEffect(() => {
    const m = leerMemoria<PestanaInstagram>(MEMORIA)?.estado;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la memoria de sesión solo existe en el teléfono: se repone antes de pintar, como useMemoriaPantalla
    if (m === "semana" || m === "eventos") setElegida(m);
  }, []);
  const pestana = pestanaDeLaDireccion(params) ?? elegida ?? inicial;
  const ver = (p: PestanaInstagram) => {
    if (p === pestana) return;
    guardarMemoria(MEMORIA, { estado: p });
    setElegida(p);
    const s = new URLSearchParams(params);
    s.delete("evento");
    s.delete("dia");
    s.set("pestana", p);
    window.history.replaceState(null, "", `${ruta}?${s.toString()}`);
    window.scrollTo({ top: 0 });
  };
  const pestanas = (
    <div className={styles.tira}>
      <Pestanas ariaLabel="Instagram">
        <Pestana activa={pestana === "semana"} onClick={() => ver("semana")}>
          Semana
        </Pestana>
        <Pestana activa={pestana === "eventos"} onClick={() => ver("eventos")}>
          Eventos
        </Pestana>
      </Pestanas>
      <BotonConexion estado={conexion} onAbrir={() => setHojaConexion(true)} />
    </div>
  );
  const bloque = <ConexionInstagram estado={conexion} vuelta={vuelta} sinSalir={quedan} onVerSinSalir={() => setHojaConexion(true)} />;
  return (
    <>
      {pestana === "semana" ? <SemanaInstagram {...semana} pestanas={pestanas} conexion={bloque} /> : <ListaInstagram {...eventos} pestanas={pestanas} conexion={bloque} sinMaterial={sinMaterial && <SemanaSinMaterial {...sinMaterial} />} />}
      {hojaConexion && <HojaConexion estado={conexion} onCerrar={() => setHojaConexion(false)} sinSalir={renglones.length ? { renglones, vueltos, alTerminar, volver: volverAPublicar } : undefined} />}
    </>
  );
}
