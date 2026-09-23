"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { CIUDAD_INICIAL, type Ciudad, type CiudadConDatos } from "@/lib/ciudad";
import CarrilEsqueleto from "./CarrilEsqueleto";
import CarrilCercanos from "./inicio/CarrilCercanos";
import ChipCiudad from "./Ciudad";
import { CampoBuscar } from "./ui/Buscador";
import Cabecera from "./ui/Cabecera";
import BuscadorUnificado from "./BuscadorUnificado";
import PantallaConAviso from "./useCanalDeListas";
import type { AvisosLista } from "./useSeguirEnLista";
import styles from "./Inicio.module.css";

type Props = {
  ciudad: Ciudad;
  ciudades: CiudadConDatos[];
  conSesion: boolean;
  avisos: AvisosLista | null;
  /** Los ids que ya usaron los otros carriles de eventos, para que Cercanos tampoco los repita (lib/inicio.ts). */
  excluirDeCercanosPromise: Promise<string[]>;
  /** Los siete carriles, ya construidos (cada uno, un componente de servidor dentro de su propio `<Suspense>` en
   *  `src/app/page.tsx`, salvo Cercanos, que vive aquí mismo porque es enteramente de cliente). */
  slotEstelar: React.ReactNode;
  slotLugaresSemana: React.ReactNode;
  slotArtistasDestacados: React.ReactNode;
  slotPopulares: React.ReactNode;
  slotNuevos: React.ReactNode;
  slotArtistasSemana: React.ReactNode;
  verTodosCercanosHref: string;
};

/**
 * Inicio (docs/rediseno/41, OL-156 segunda vuelta): siete carriles con el shell de siempre — `ui/Cabecera` con el
 * chip de ciudad y la lupa. Carga progresiva (pedido del founder tras probar en producción): esta pantalla ya no
 * espera ninguna consulta antes de pintar; cada carril llega por su cuenta (streaming del App Router, cada uno en su
 * `<Suspense>`) y un esqueleto del tamaño exacto (`CarrilEsqueleto`) ocupa su lugar mientras tanto. Un carril vacío
 * colapsa sin salto (`Destacados.module.css`, `.vacio`). El buscador único es la misma lupa, con los resultados
 * agrupados por tipo (`BuscadorUnificado`). Todos los carriles comparten un solo aviso/pregunta de avisos
 * (`PantallaConAviso`, la misma pieza que ya usan las fichas): el de más abajo se pinta una sola vez, para toda la
 * pantalla, aunque cada carril tenga su propio botón.
 */
export default function Inicio({ ciudad, ciudades, conSesion, avisos, excluirDeCercanosPromise, slotEstelar, slotLugaresSemana, slotArtistasDestacados, slotPopulares, slotNuevos, slotArtistasSemana, verTodosCercanosHref }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [enfocar, setEnfocar] = useState(false);

  const esCiudadInicial = ciudad.slug === CIUDAD_INICIAL.slug;

  return (
    <PantallaConAviso>
      <Cabecera
        contexto={<ChipCiudad ciudad={ciudad} ciudades={ciudades} hrefDe={(c) => `/${c.slug === CIUDAD_INICIAL.slug ? "" : `?ciudad=${c.slug}`}`} />}
        onBuscar={() => {
          setBuscando(true);
          setEnfocar(true);
        }}
        campo={buscando && <CampoBuscar valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar un evento, lugar o artista" ariaLabel="Buscar en toda la app" autoFocus={enfocar} onCerrar={() => { setBusqueda(""); setBuscando(false); setEnfocar(false); }} />}
      />
      {buscando && busqueda.trim() ? (
        <BuscadorUnificado seccion="inicio" q={busqueda} ciudadSlug={esCiudadInicial ? null : ciudad.slug} ciudadNombre={ciudad.nombre} />
      ) : (
        <div className={styles.carriles}>
          {!conSesion && (
            <div className={styles.invitacion}>
              <b>Sigue lugares y artistas</b>
              <p>Con una cuenta, esta pantalla se llena con lo tuyo: tus lugares, tus artistas y lo que pasa cerca.</p>
              <Link href="/entrar?siguiente=/" className={styles.crearCuenta}>
                Crear cuenta
              </Link>
            </div>
          )}
          <Suspense fallback={<CarrilEsqueleto tamano="grande" />}>{slotEstelar}</Suspense>
          <Suspense fallback={<CarrilEsqueleto tamano="mediana" />}>
            <CarrilCercanos excluirPromise={excluirDeCercanosPromise} avisos={avisos} verTodosHref={verTodosCercanosHref} />
          </Suspense>
          <Suspense fallback={<CarrilEsqueleto tamano="chica" />}>{slotLugaresSemana}</Suspense>
          <Suspense fallback={<CarrilEsqueleto tamano="chica" />}>{slotArtistasDestacados}</Suspense>
          <Suspense fallback={<CarrilEsqueleto tamano="mediana" />}>{slotPopulares}</Suspense>
          <Suspense fallback={<CarrilEsqueleto tamano="mediana" />}>{slotNuevos}</Suspense>
          <Suspense fallback={<CarrilEsqueleto tamano="chica" />}>{slotArtistasSemana}</Suspense>
        </div>
      )}
    </PantallaConAviso>
  );
}
