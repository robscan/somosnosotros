import { describe, expect, it } from "vitest";
import { agendasVigentes, diasEntre, mesSiguiente, pdfsDelIndice } from "./indiceAgendas";

const BASE = "https://cultura.slp.gob.mx/agenda-cultural/";
const CDN = "https://d3dac9gdq8t83x.cloudfront.net/media";

/** Con la forma de la página de Cultura de San Luis (comprobado contra la real el 21 de octubre de 2026: de 25 PDF valen dos). */
const INDICE = `<html><head><script>var x = "enero";</script><style>.a{}</style></head><body>
  <a href="${CDN}/PLAN_ANUAL_DE_TRABAJO_2026_SECULT_ACTUALIZACION27FEB.pdf">* Plan Anual de Trabajo 2026</a>
  <a href="${CDN}/Ley_de_Cultura_para_el_Estado_y_Municipios_27_Jun__2024.pdf">1-Ley de Cultura para SLP</a>
  <h3>Agenda Cultural</h3> Año 2026
  <div><p>Agenda programación XANTOLO en tu ciudad</p><span>13 de octubre de 2026</span><a href="${CDN}/archivos/Programa_Xantolo_2026_2.pdf" target="_blank">Descargar</a></div>
  <div><p>OCTUBRE</p><span>30 de septiembre de 2026</span><a href="${CDN}/archivos/oct_2026.pdf">Descargar</a></div>
  <div><p>SEPTIEMBRE</p><span>2 de septiembre de 2026</span><a href="${CDN}/archivos/sept_2026.pdf">Descargar</a></div>
  <div><p>Semana Santa 2026</p><span>19 de marzo de 2026</span><a href="${CDN}/archivos/SS.pdf">Descargar</a></div>
  <div><p>ENERO</p><span>30 de diciembre de 2026</span><a href="/media/enero.pdf">Descargar</a></div>
  <a href="${CDN}/archivos/oct_2026.pdf">Repetido</a>
  <a href="https://cultura.slp.gob.mx/contacto">Contacto</a>
</body></html>`;

describe("el índice de agendas de una Secretaría de Cultura (OL-429)", () => {
  it("cada PDF con su mes (del título antes de la fecha, o del archivo) y su fecha de publicación; sin repetidos ni páginas", () => {
    const pdfs = pdfsDelIndice(INDICE, BASE);
    const porArchivo = Object.fromEntries(pdfs.map((p) => [p.url.split("/").pop(), [p.mes, p.publicada]]));
    expect(porArchivo).toEqual({
      "PLAN_ANUAL_DE_TRABAJO_2026_SECULT_ACTUALIZACION27FEB.pdf": [null, null],
      "Ley_de_Cultura_para_el_Estado_y_Municipios_27_Jun__2024.pdf": ["2024-06", null],
      "Programa_Xantolo_2026_2.pdf": [null, "2026-10-13"],
      "oct_2026.pdf": ["2026-10", "2026-09-30"],
      "sept_2026.pdf": ["2026-09", "2026-09-02"],
      "SS.pdf": [null, "2026-03-19"],
      // Sin año escrito: la de enero publicada a fines de diciembre es del año siguiente. Y un enlace relativo se resuelve con la página.
      "enero.pdf": ["2027-01", "2026-12-30"],
    });
    expect(pdfs.find((p) => p.url.endsWith("enero.pdf"))?.url).toBe("https://cultura.slp.gob.mx/media/enero.pdf");
  });

  it("valen las del mes en curso y el siguiente, y los programas sin mes publicados hace 40 días o menos", () => {
    const vigentes = agendasVigentes(pdfsDelIndice(INDICE, BASE), "2026-10-21").map((p) => p.url.split("/").pop());
    expect(vigentes).toEqual(["Programa_Xantolo_2026_2.pdf", "oct_2026.pdf"]);
    expect(agendasVigentes(pdfsDelIndice(INDICE, BASE), "2026-12-31").map((p) => p.url.split("/").pop())).toEqual(["enero.pdf"]);
  });

  it("fechas: el mes siguiente y los días entre dos fechas", () => {
    expect(mesSiguiente("2026-12")).toBe("2027-01");
    expect(mesSiguiente("2026-10")).toBe("2026-11");
    expect(diasEntre("2026-10-13", "2026-10-21")).toBe(8);
  });
});
