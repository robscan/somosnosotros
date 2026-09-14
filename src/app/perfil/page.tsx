import Link from "next/link";
import { redirect } from "next/navigation";
import { desdeReciente, formatearCuando } from "@/lib/fechas";
import { nombreSitio, type EventoResumen } from "@/lib/eventos";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import styles from "./perfil.module.css";
import FormularioPerfil from "./FormularioPerfil";

export const metadata = { title: "Mi perfil · somosnosotros" };

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
      <Link href="/" className="enlace-volver">
        ← Volver al mapa
      </Link>
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
                <Link href={`/eventos/${e.id}`} className={styles.tarjeta}>
                  <span className={styles.cuando}>{formatearCuando(e.inicio, e.fin)}</span>
                  <strong>{e.titulo}</strong>
                  <span className={styles.detalle}>{nombreSitio(e)}</span>
                </Link>
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
                <Link href={`/lugares/${l.id}`} className={styles.tarjeta}>
                  <strong>{l.nombre}</strong>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className={styles.publico}>
        Tu perfil público: <Link href={`/personas/${actual.perfil.id}`}>lo que ven los demás</Link>.
      </p>
      <FormularioPerfil perfil={actual.perfil} />
    </main>
  );
}
