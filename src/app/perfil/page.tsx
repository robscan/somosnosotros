import Link from "next/link";
import Barra from "@/components/ui/Barra";
import { redirect } from "next/navigation";
import { desdeReciente, formatearCuando } from "@/lib/fechas";
import { nombreSitio, type EventoResumen } from "@/lib/eventos";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import Tarjeta from "@/components/ui/Tarjeta";
import styles from "./perfil.module.css";
import FormularioPerfil from "./FormularioPerfil";

export const metadata = { title: "Mi perfil · Somos Nosotros" };

export default async function PaginaPerfil({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/perfil");
  const supabase = await clienteServidor();
  const desde = desdeReciente();
  const [{ data: sigue }, { data: va }] = await Promise.all([
    supabase!.from("seguimientos").select("lugar:lugares(id, nombre)").eq("usuario_id", actual.perfil.id),
    supabase!.from("asistencias").select("evento:eventos(id, titulo, inicio, fin, imagen, precio, lugar_id, sitio_texto, sitio_reservado, lugar:lugares(nombre, portada))").eq("usuario_id", actual.perfil.id).eq("estado", "voy"),
  ]);
  const lugares = (sigue ?? []).map((s) => (Array.isArray(s.lugar) ? s.lugar[0] : s.lugar)).filter(Boolean) as { id: string; nombre: string }[];
  const eventos = (va ?? [])
    .map((a) => (Array.isArray(a.evento) ? a.evento[0] : a.evento))
    .filter((e): e is NonNullable<typeof e> => !!e && e.inicio >= desde)
    .map((e) => ({ ...e, lugar: Array.isArray(e.lugar) ? (e.lugar[0] ?? null) : e.lugar }) as unknown as EventoResumen)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  return (
    <main className="pagina">
      <Barra volver={{ href: "/", texto: "Agenda" }} />
      <h1 className="titulo">Mi perfil</h1>
      <p className="subtitulo">
        {actual.correo}
        {actual.perfil.rol === "admin" ? " · administrador" : ""}
      </p>
      {error === "borrar" && (
        <p className="aviso-error" role="alert">
          No se pudo borrar la cuenta. Intenta de nuevo.
        </p>
      )}
      <section className={styles.seccion} aria-label="Eventos a los que voy">
        <h2 className={styles.tituloSeccion}>Voy a</h2>
        {eventos.length === 0 ? (
          <p className={styles.vacio}>Todavía no has dicho que vas a ningún evento. En la agenda, toca “Voy”.</p>
        ) : (
          <ul className={styles.lista}>
            {eventos.map((e) => (
              <li key={e.id}>
                <Tarjeta href={`/eventos/${e.id}`} arriba={formatearCuando(e.inicio, e.fin)} titulo={e.titulo} detalle={nombreSitio(e)} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className={styles.seccion} aria-label="Lugares que sigo">
        <h2 className={styles.tituloSeccion}>Sigo</h2>
        {lugares.length === 0 ? (
          <p className={styles.vacio}>Todavía no sigues ningún lugar. En la ficha de un lugar, toca “Seguir” y te avisamos de sus eventos.</p>
        ) : (
          <ul className={styles.lista}>
            {lugares.map((l) => (
              <li key={l.id}>
                <Tarjeta href={`/lugares/${l.id}`} titulo={l.nombre} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className={styles.publico}>
        Tu perfil público: <Link href={`/personas/${actual.perfil.id}`}>lo que ven los demás</Link>.
        {actual.perfil.rol === "admin" && (
          <>
            {" "}
            · <Link href="/admin">Administración</Link>
          </>
        )}
      </p>
      <FormularioPerfil perfil={actual.perfil} llavePush={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
    </main>
  );
}
