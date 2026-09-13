import Link from "next/link";
import { CIUDAD_INICIAL } from "@/lib/ciudad";
import type { LugarResumen } from "@/lib/lugares";
import { usuarioActual } from "@/lib/supabase/servidor";
import ListaLugares from "./ListaLugares";
import Sheet from "./Sheet";
import styles from "./Panel.module.css";

/** En el panel cabe poco: solo el primer nombre. */
function primerNombre(nombre: string): string {
  return nombre.trim().split(" ")[0] ?? "";
}

type Props = { lugares: LugarResumen[]; cuentaBorrada?: boolean };

/** Panel inferior sobre el mapa: cabecera (marca, ciudad, sesión) y la lista de lugares con búsqueda. */
export default async function Panel({ lugares, cuentaBorrada = false }: Props) {
  const actual = await usuarioActual();
  const cabecera = (
    <>
      <div className={styles.cabecera}>
        <div>
          <h1 className={styles.titulo}>somosnosotros</h1>
          <p className={styles.ciudad}>
            {CIUDAD_INICIAL.nombre}
            {lugares.length > 0 ? ` · ${lugares.length === 1 ? "1 lugar" : `${lugares.length} lugares`}` : ""}
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
    <Sheet cabecera={cabecera} inicial={lugares.length > 0 ? "medium" : "peek"}>
      <ListaLugares lugares={lugares} conSesion={!!actual} />
    </Sheet>
  );
}
