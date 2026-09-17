import { describe, expect, it } from "vitest";
import { archivoIcs, escaparIcs, nombreArchivoIcs } from "./calendario";

const evento = { id: "fba5bd3e-7898-4261-b4fd-97a17b1d61ee", titulo: "Navidad queretana: danza, música; y más", inicio: "2026-12-06T18:00:00.000Z", fin: null, descripcion: "Espectáculo\nnavideño", lugar: "Teatro del IMSS, Tomasa Estévez 805" };

describe("escaparIcs", () => {
  it("escapa barra, punto y coma, coma y saltos de línea", () => {
    expect(escaparIcs("a\\b;c,d\ne")).toBe("a\\\\b\\;c\\,d\\ne");
  });
});

describe("archivoIcs", () => {
  const ics = archivoIcs(evento, new Date("2026-09-16T23:00:00.000Z"));
  const lineas = ics.split("\r\n");

  it("lleva una alerta 1 hora antes, dentro del evento", () => {
    const inicioAlerta = lineas.indexOf("BEGIN:VALARM");
    expect(inicioAlerta).toBeGreaterThan(lineas.indexOf("BEGIN:VEVENT"));
    expect(lineas.indexOf("END:VALARM")).toBeLessThan(lineas.indexOf("END:VEVENT"));
    expect(lineas).toContain("TRIGGER:-PT1H");
    expect(lineas).toContain("ACTION:DISPLAY");
  });
  it("sin hora de fin dura 2 horas", () => {
    expect(lineas).toContain("DTSTART:20261206T180000Z");
    expect(lineas).toContain("DTEND:20261206T200000Z");
  });
  it("el título y el lugar van escapados, con el punto y coma incluido", () => {
    expect(lineas).toContain("SUMMARY:Navidad queretana: danza\\, música\\; y más");
    expect(lineas).toContain("LOCATION:Teatro del IMSS\\, Tomasa Estévez 805");
  });
  it("sin lugar no hay renglón de lugar; la descripción termina con la liga", () => {
    const sinLugar = archivoIcs({ ...evento, lugar: null }).split("\r\n");
    expect(sinLugar.some((l) => l.startsWith("LOCATION:"))).toBe(false);
    expect(lineas).toContain(`DESCRIPTION:Espectáculo\\nnavideño\\nhttps://somosnosotros.org/eventos/${evento.id}`);
  });
  it("termina en CRLF", () => {
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});

describe("nombreArchivoIcs", () => {
  it("usa el título en ASCII, sin acentos ni signos", () => {
    expect(nombreArchivoIcs("Noche de son en el patio")).toBe("noche-de-son-en-el-patio.ics");
    expect(nombreArchivoIcs("KOSMOS: Camerata de San Luis, música")).toBe("kosmos-camerata-de-san-luis-musica.ics");
  });
  it("si no queda nada, evento.ics", () => {
    expect(nombreArchivoIcs("¡¿…?!")).toBe("evento.ics");
  });
});
