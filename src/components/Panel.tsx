import Link from "next/link";
import { CIUDAD_INICIAL } from "@/lib/ciudad";
import type { EventoResumen } from "@/lib/eventos";
import type { LugarResumen } from "@/lib/lugares";
import { usuarioActual } from "@/lib/supabase/servidor";
import Agenda from "./Agenda";
import ListaLugares from "./ListaLugares";
import Pestanas from "./Pestanas";
import Sheet from "./Sheet";
import styles from "./Panel.module.css";

/** En el panel cabe poco: solo el primer nombre. */
function primerNombre(nombre: string): string {
  return nombre.trim().split(" ")[0] ?? "";
}

type Props = { lugares: LugarResumen[]; eventos: EventoResumen[]; cuentaBorrada?: boolean };

/** Panel inferior sobre el mapa: cabecera (marca, ciudad, sesión) y dos pestañas: Agenda y Lugares. */
export default async function Panel({ lugares, eventos, cuentaBorrada = false }: Props) {
  const actual = await usuarioActual();
  const resumen = [
    eventos.length > 0 ? `${eventos.length} ${eventos.length === 1 ? "evento" : "eventos"}` : null,
    lugares.length > 0 ? `${lugares.length} ${lugares.length === 1 ? "lugar" : "lugares"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const cabecera = (
    <>
      <div className={styles.cabecera}>
        <div>
          <h1 className={styles.titulo}>somosnosotros</h1>
          <p className={styles.ciudad}>
            {CIUDAD_INICIAL.nombre}
            {resumen ? ` · ${resumen}` : ""}
          </p>
        </div>
        {actual ? (
          <Link href="/perfil" className={styles.persona} aria-label="Mi perfil">
            {actual.perfil.foto ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
              <img src={actual.perfil.foto} alt="" className={styles.avatar} />
            ) : (
              <span className={styles.avatar}>{(actual.perfil.nombre || "?").slice(0, 1).toUpperCase()}</span>
            )}
            <span className={styles.nombre}>{primerNombre(actual.perfil.nombre) || "Mi perfil"}</span>
          </Link>
        ) : (
          <Link href="/entrar" className={styles.entrar}>
            Entrar
          </Link>
        )}
      </div>
      {cuentaBorrada && (
        <p className={styles.aviso} role="status">
          Tu cuenta quedó borrada. Gracias por haber estado.
        </p>
      )}
    </>
  );
  return (
    <Sheet cabecera={cabecera} inicial={lugares.length > 0 || eventos.length > 0 ? "medium" : "peek"}>
      <Pestanas
        inicial={eventos.length > 0 || lugares.length === 0 ? "agenda" : "lugares"}
        pestanas={[
          { clave: "agenda", etiqueta: "Agenda", contenido: <Agenda eventos={eventos} conSesion={!!actual} hayLugares={lugares.length > 0} /> },
          { clave: "lugares", etiqueta: "Lugares", contenido: <ListaLugares lugares={lugares} conSesion={!!actual} /> },
        ]}
      />
    </Sheet>
  );
}
