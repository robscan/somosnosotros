import Link from "next/link";
import { redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import { IconoBandera, IconoBoleto, IconoCalendario, IconoCampana, IconoChevronDerecha, IconoEstrella, IconoLapiz, IconoPersona, IconoReloj } from "@/components/ui/Iconos";
import ficha from "@/components/ui/Ficha.module.css";
import { datosPersona, estadoRol, unir } from "@/lib/panel";
import { usuarioActual } from "@/lib/supabase/servidor";
import Avatar from "../../Avatar";
import { cargarPersona } from "../../consultas";
import Reintentar from "../../Reintentar";
import CorreoPersona from "./CorreoPersona";
import RolPersona from "./RolPersona";
import styles from "../../admin.module.css";

export const metadata = { title: "Persona · Administración · Somos Nosotros", robots: { index: false, follow: false } };

/**
 * La ficha de administración de una persona (decisión 8): cabecera, Cuenta y Actividad con el dibujo de Ajustes, y Rol
 * al final y solo. Si la cuenta ya no existe, lo dice (P9).
 */
export default async function PersonaAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=/admin/personas/${id}`);
  if (actual.perfil.rol !== "admin") redirect("/");
  const { persona: f, error } = await cargarPersona(id);
  if (error) {
    return (
      <main className={ficha.pagina}>
        <Barra volver={{ href: "/admin/personas", texto: "Personas" }} />
        <h1 className={styles.titulo}>Persona</h1>
        <Reintentar texto="No pudimos leer esta cuenta." />
      </main>
    );
  }
  if (!f) {
    return (
      <main className={ficha.pagina}>
        <Barra volver={{ href: "/admin/personas", texto: "Personas" }} />
        <h1 className={styles.titulo}>Esta cuenta ya no existe</h1>
        <p className={styles.vacio}>Quizá se borró. Lo que publicó se queda, sin su nombre.</p>
        <Link href="/admin/personas" className={styles.salida}>
          Volver a Personas
          <IconoChevronDerecha />
        </Link>
      </main>
    );
  }
  const ahora = new Date();
  const d = datosPersona(f, ahora);
  return (
    <main className={ficha.pagina}>
      <Barra volver={{ href: "/admin/personas", texto: "Personas" }} />
      <header className={styles.cabecera}>
        <Avatar foto={f.foto} nombre={f.nombre} />
        <h1>{f.nombre || "Sin nombre"}</h1>
        <small>{unir([f.es_yo && "Tú", f.colonia, f.reservado ? "perfil reservado" : "perfil público"])}</small>
      </header>

      <h2 className={styles.grupo}>Cuenta</h2>
      <ul className={styles.tarjeta}>
        {f.correo_oculto && <CorreoPersona perfilId={f.id} oculto={f.correo_oculto} />}
        <li className={styles.dato}>
          <IconoCalendario width={20} height={20} />
          <small>Alta</small>
          <b>{d.alta}</b>
        </li>
        <li className={styles.dato}>
          <IconoReloj width={20} height={20} />
          <small>Última vez</small>
          <b>{d.ultimaVez}</b>
        </li>
        <li className={styles.dato}>
          <IconoCampana width={20} height={20} />
          <small>Avisos</small>
          <b>{d.avisos}</b>
        </li>
      </ul>

      <h2 className={styles.grupo}>Actividad</h2>
      <ul className={styles.tarjeta}>
        <li className={styles.dato}>
          <IconoBoleto width={20} height={20} />
          <small>Va a</small>
          <b>{d.vaA}</b>
        </li>
        <li className={styles.dato}>
          <IconoEstrella width={20} height={20} />
          <small>Sigue</small>
          <b>{d.sigue}</b>
        </li>
        <li className={styles.dato}>
          <IconoLapiz width={20} height={20} />
          <small>Publicó</small>
          <b>{d.publico}</b>
        </li>
        {f.lleva.length === 0 ? (
          <li className={styles.dato}>
            <IconoPersona width={20} height={20} />
            <small>Lleva</small>
            <b>Ninguna ficha</b>
          </li>
        ) : (
          f.lleva.map((x) => (
            <li key={`${x.tipo}-${x.id}`}>
              <Link href={x.tipo === "artista" ? `/artistas/${x.id}` : `/lugares/${x.id}`} className={styles.dato}>
                <IconoPersona width={20} height={20} />
                <small>Lleva</small>
                <b>{x.nombre}</b>
                <span className={styles.total}>
                  <IconoChevronDerecha />
                </span>
              </Link>
            </li>
          ))
        )}
        <li className={styles.dato}>
          <IconoBandera width={20} height={20} />
          <small>Reclamos y reportes</small>
          <b>{d.reportes}</b>
        </li>
      </ul>

      <h2 className={styles.grupo}>Rol</h2>
      <RolPersona perfilId={f.id} nombre={f.nombre} estado={estadoRol(f, actual.perfil.id, ahora)} />
      <Link href={`/personas/${f.id}`} className={styles.salida}>
        Ver su ficha pública
        <IconoChevronDerecha />
      </Link>
    </main>
  );
}
