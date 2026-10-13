import { redirect } from "next/navigation";
import { Suspense } from "react";
import BotonTuAnio from "@/components/BotonTuAnio";
import FichaPersona from "@/components/FichaPersona";
import { cargarPasadosPersona } from "@/lib/cargarTuAnio";
import { usuarioActual } from "@/lib/supabase/servidor";
import { hayTuAnio, hrefVistaTuAnio } from "@/lib/tuAnio";
import { avisosParaListas } from "@/app/avisos/paraListas";
import { cargarMisArtistas } from "@/app/artistas/consultas";
import { cargarPersona, relacionDe } from "@/app/personas/consultas";
import { conArtistasLigados, hrefArtista } from "@/lib/artistas";
import { qrDeUrl } from "@/lib/qr";
import Boton from "@/components/ui/Boton";
import MisArtistas from "./MisArtistas";
import plantilla from "@/components/ui/Plantilla.module.css";
import styles from "./perfil.module.css";

export const metadata = { title: "Mi perfil · Somos Nosotros", robots: { index: false, follow: false } };
const ORIGEN = "https://somosnosotros.org";

/**
 * Mi perfil: la misma ficha que ven los demás, con Ajustes bajo la colonia, en una pantalla raíz (docs/rediseno/50, P5): su
 * cabecera, los tres números —Voy · Interesan · Sigo— y, debajo, la lista de cada uno por día. Lo que se configura vive en
 * /ajustes (docs/rediseno/13, decisión 5).
 */
export default async function PaginaPerfil() {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/perfil");
  const [persona, ligados] = await Promise.all([cargarPersona(actual.perfil.id, { conProximos: true }), cargarMisArtistas(actual.perfil.id)]);
  if (!persona) redirect("/entrar?siguiente=/perfil");
  // Mis gestos sobre mis listas: quitar desaparece al instante y Deshacer lo devuelve (OL-057).
  const gestos = { ...relacionDe(persona), avisos: avisosParaListas(actual) };
  // El QR de cada artista ligado, ya calculado en el servidor (OL-154, doc 40c; de vuelta en OL-163 para el
  // compartir de la tarjeta): mismo patrón que Pincel.
  const misArtistas = await Promise.all(ligados.map(async (artista) => ({ artista, url: `${ORIGEN}${hrefArtista(artista)}`, svg: await qrDeUrl(`${ORIGEN}${hrefArtista(artista)}`) })));
  return (
    <main className={`${plantilla.raiz} ${styles.perfil}`}>
      <FichaPersona
        perfil={persona.perfil}
        mia
        eventos={persona.eventos}
        interesan={persona.interesan}
        lugares={persona.lugares}
        artistas={persona.artistas}
        gestos={gestos}
        origen={ORIGEN}
        // Antes de "Lo que sigues" (lo tuyo primero, doc 40b); sin artistas ligados, ni se pinta (OL-154).
        misArtistas={conArtistasLigados(misArtistas) && <MisArtistas artistas={misArtistas} />}
      />
      {/* «Tu año» (OL-394): lo pasado se lee aparte, sin hacer esperar al perfil. */}
      <Suspense fallback={null}>
        <TuAnioPerfil perfilId={persona.perfil.id} />
      </Suspense>
      <Boton href={`/personas/${persona.perfil.id}`} variante="texto" ancho="contenido" className={styles.enlace}>
        Así te ve la gente
      </Boton>
    </main>
  );
}

/**
 * «Tu año» (OL-394, «O en la sección» y «Q solo quien gestiona»): al pie de Mi perfil, sobre «Así te ve la gente», solo para la persona con
 * sesión y si dijo «Voy» a algo que ya pasó este año. Su ficha vista por los demás no lo lleva.
 */
async function TuAnioPerfil({ perfilId }: { perfilId: string }) {
  const pasados = await cargarPasadosPersona(perfilId);
  return hayTuAnio(pasados) ? <BotonTuAnio href={hrefVistaTuAnio("persona")} className={styles.tuAnio} /> : null;
}
