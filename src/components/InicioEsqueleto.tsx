import CarrilEsqueleto from "./CarrilEsqueleto";
import { CabeceraEsqueleto } from "./ListaEsqueleto";
import plantilla from "@/components/ui/Plantilla.module.css";

/**
 * Inicio mientras llega (OL-455): lo que pone `app/loading.tsx` en la raíz, en vez del símbolo SN solo. Al abrir la app el primer cuadro ya
 * trae, bajo la barra, la cabecera con sus chips en gris (como `ListaEsqueleto` en Agenda y Artistas) y los primeros carriles con su esqueleto,
 * los mismos `fallback` y en el mismo orden que `Inicio.tsx` («Tus planes», que depende de la sesión, no: aún no se sabe si hay). Solo los que
 * llenan la pantalla del teléfono: es lo que se ve, y el HTML que llega primero queda chico (los de más abajo los pone `Inicio.tsx` al llegar).
 * Nada propio: piezas que ya existen, del tamaño de lo que sustituyen.
 */
export default function InicioEsqueleto() {
  return (
    <main className={plantilla.raiz} aria-busy="true" aria-live="polite" aria-label="Cargando">
      <div aria-hidden="true">
        <CabeceraEsqueleto />
        <CarrilEsqueleto forma="xl" />
        <CarrilEsqueleto forma="mediana" />
        <CarrilEsqueleto forma="grande" tituloDentro />
      </div>
    </main>
  );
}
