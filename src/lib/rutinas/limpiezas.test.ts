import { describe, expect, it } from "vitest";
import { limpiarCandidato, limpiarDireccion, textoLimpio } from "./candidatos";
import { candidatosDeTabla, TABLAS_SIC } from "./sic";

const CENTROS = TABLAS_SIC.find((t) => t.tabla === "centro_cultural")!;
const CABECERA = "centro_cultural_id,centro_cultural_nombre,nom_mun,nom_loc,centro_cultural_calle_numero,centro_cultural_colonia,centro_cultural_cp,pagina_web,gmaps_longitud,gmaps_latitud";

describe("dos limpiezas vistas en la primera corrida real de «Buscar lugares» (OL-429)", () => {
  it("el nombre del SIC sin etiquetas HTML ni entidades (y la comparación de repetidos ya sin ellas)", () => {
    const csv = [
      CABECERA,
      '7,"Centro Cultural Juan Ignacio <i>Juani </i>Torres","San Luis Potosí","San Luis Potosí","Calle 1","Centro","78000","",-100.97,22.15',
      '8,"Centro Cultural Juan Ignacio Juani Torres","San Luis Potosí","San Luis Potosí","Calle 1","Centro","78000","",-100.97,22.15',
      '9,"Casa &amp; Foro <b>Ágora</b>","San Luis Potosí","San Luis Potosí","Calle 2","Centro","78000","",-100.97,22.15',
    ].join("\n");
    const c = candidatosDeTabla(csv, CENTROS, ["San Luis Potosí"]);
    expect(c.map((x) => x.nombre)).toEqual(["Centro Cultural Juan Ignacio Juani Torres", "Casa & Foro Ágora"]);
  });

  it("textoLimpio: etiquetas, entidades con nombre y numéricas, controles; corta al tope", () => {
    expect(textoLimpio("Foro <span class='x'>El</span>&nbsp;Hueco &#8211; Centro", 80)).toBe("Foro El Hueco – Centro");
    expect(textoLimpio("Teatro\u0000 de&#x20;la Paz", 80)).toBe("Teatro de la Paz");
    expect(textoLimpio("&raro; queda", 80)).toBe("&raro; queda");
    expect(textoLimpio(3, 80)).toBe("");
  });

  it("la dirección sin «Dirección:,» ni rótulos parecidos al principio, ni comas sueltas", () => {
    expect(limpiarDireccion("Dirección:, Av. Venustiano Carranza 1815, Tequisquiapan", 200)).toBe("Av. Venustiano Carranza 1815, Tequisquiapan");
    expect(limpiarDireccion("Domicilio: Calle Zaragoza 410, Centro.", 200)).toBe("Calle Zaragoza 410, Centro.");
    expect(limpiarDireccion("Ubicación: , Jardín Hidalgo 3,", 200)).toBe("Jardín Hidalgo 3");
    expect(limpiarDireccion("Calle Dirección General 5", 200)).toBe("Calle Dirección General 5");
    const c = limpiarCandidato({ fuente: "cultura", nombre: "Casa de la Cultura <i>Sur</i>", direccion: "Dirección:, Av. Juárez 10" });
    expect(c).toMatchObject({ nombre: "Casa de la Cultura Sur", direccion: "Av. Juárez 10" });
  });
});
