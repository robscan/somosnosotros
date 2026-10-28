import CargandoPorRuta from "@/components/CargandoPorRuta";
import InicioEsqueleto from "@/components/InicioEsqueleto";
import CargandoRaiz from "@/components/ui/CargandoRaiz";

/**
 * Lo que se ve mientras llega una pantalla que no trae su propio `loading.tsx`. Inicio (OL-455; el founder: «al iniciar la app hay un momento
 * en blanco, sin skeletons ni nada»): su esqueleto bajo la barra, que es lo primero que se pinta al abrir la app. Las demás, el símbolo SN.
 */
export default function Loading() {
  return <CargandoPorRuta inicio={<InicioEsqueleto />} otra={<CargandoRaiz />} />;
}
