import { redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import plantilla from "@/components/ui/Plantilla.module.css";
import { hrefPropuestas, notaBandeja, tituloBandeja } from "@/lib/ciudadesAdmin";
import { nombreDe, vistaPropuesta } from "@/lib/propuestas";
import { usuarioActual } from "@/lib/supabase/servidor";
import Reintentar from "../../../Reintentar";
import Bandeja from "../../Bandeja";
import { cargarBandeja } from "../../consultas";
import styles from "../../../admin.module.css";
import { tituloDePagina } from "@/lib/marca";

export const metadata = { title: tituloDePagina("Propuestas", "Administración"), robots: { index: false, follow: false } };

/**
 * La bandeja de una corrida (OL-427). Desde OL-432 la bandeja es por ciudad (respuesta 7): una corrida con ciudad lleva a la de su ciudad, así
 * los enlaces de antes (la portada, Corridas, un marcador) siguen sirviendo. Solo una corrida sin ciudad se enseña aquí, sola.
 */
export default async function Propuestas({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=/admin/ciudades/propuestas/${encodeURIComponent(id)}`);
  if (actual.perfil.rol !== "admin") redirect("/");
  const { bandeja, error } = await cargarBandeja(id);
  if (bandeja?.corrida.ciudad) redirect(hrefPropuestas(bandeja.corrida.ciudad));
  const barra = <Barra volver={{ href: "/admin/ciudades", texto: "Ciudades" }} />;
  if (error || !bandeja)
    return (
      <main className={plantilla.paginaContenido}>
        {barra}
        <h1 className={styles.titulo}>Propuestas</h1>
        {error ? <Reintentar texto="No pudimos leer las propuestas." /> : <p className={styles.vacio}>Esa corrida ya no está.</p>}
      </main>
    );
  const ahora = new Date();
  const propuestas = bandeja.propuestas.map((p) => ({ id: p.id, tipo: p.tipo, fuente: p.fuente, nombre: nombreDe(p), vista: vistaPropuesta(p, null, ahora) }));
  return (
    <main className={plantilla.paginaContenido}>
      {barra}
      <h1 className={styles.titulo}>{tituloBandeja(bandeja.corrida.tipo, null)}</h1>
      <p className={styles.nota}>{notaBandeja(bandeja.corrida, ahora)}</p>
      {/* Siempre la misma pieza: al decidir la última, el servidor ya no la trae, pero su línea de lo hecho se queda hasta salir. */}
      <Bandeja propuestas={propuestas} fuentesConTanda={bandeja.fuentes_con_tanda} />
    </main>
  );
}
