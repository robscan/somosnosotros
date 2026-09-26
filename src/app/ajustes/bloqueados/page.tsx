import { redirect } from "next/navigation";
import Desbloquear from "@/components/Desbloquear";
import Barra from "@/components/ui/Barra";
import { cargarBloqueados } from "@/app/personas/consultas";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import styles from "./bloqueados.module.css";

export const metadata = { title: "Personas bloqueadas · Somos Nosotros", robots: { index: false, follow: false } };

/** Ajustes → Personas bloqueadas (OL-203): a quién bloqueaste, con Desbloquear en cada fila. */
export default async function PersonasBloqueadas() {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/ajustes/bloqueados");
  const supabase = await clienteServidor();
  const bloqueados = supabase ? await cargarBloqueados(supabase, actual.perfil.id) : [];
  return (
    <main className="pagina">
      <Barra volver={{ href: "/ajustes", texto: "Ajustes" }} />
      <h1 className="titulo">Personas bloqueadas</h1>
      {bloqueados.length === 0 ? (
        <p className={styles.vacio}>No has bloqueado a nadie. Desde la ficha de una persona, el menú «···» tiene la opción Bloquear.</p>
      ) : (
        <ul className={styles.tarjeta}>
          {bloqueados.map((p) => (
            <li key={p.id} className={styles.fila}>
              {p.foto ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
                <img src={p.foto} alt="" className={styles.avatar} />
              ) : (
                <span className={`${styles.avatar} ${styles.avatarVacio}`} aria-hidden="true">
                  {(p.nombre || "?").slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className={styles.nombre}>{p.nombre}</span>
              <Desbloquear personaId={p.id} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
