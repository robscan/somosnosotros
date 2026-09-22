import { describe, expect, it } from "vitest";
import {
  armarCorreo, armarDestinos, asuntoDe, type Destino, type EnvioPrevio, type Fila, hashCorreo, ICONO_URL, leerArgumentos, leerCsv, leerFilas, listaCorta,
  nombreBuzonCompartido, paraRecordatorio, quitarYaEnviados, repartir, tipoDe, urlFicha,
} from "./invitar-agendas";

const SAL = "sal-de-prueba";
const FIRMA = { telefono: "444 000 0000" };

const filas: Fila[] = [
  { lugarId: "id-1", slug: "museo-uno", nombre: "Museo Uno", variante: "institucion" },
  { lugarId: "id-2", slug: "museo-dos", nombre: "Museo Dos", variante: "institucion", comprobacion: 2 },
  { lugarId: "id-3", slug: "galeria-tres", nombre: "Galería Tres", variante: "institucion", comprobacion: 1 },
  { lugarId: "id-4", slug: "sede-a", nombre: "Sede A", variante: "organismo", organismo: "Organismo X" },
  { lugarId: "id-5", slug: "sede-b", nombre: "Sede B", variante: "organismo", organismo: "Organismo X" },
  { lugarId: "id-6", slug: "sede-c", nombre: "Sede C", variante: "organismo", organismo: "Organismo Y", sinCorreo: true },
  { lugarId: "id-7", slug: "sin-csv", nombre: "Sin CSV", variante: "institucion" },
  { lugarId: "id-8", slug: "museo-cuatro", nombre: "Museo Cuatro", variante: "institucion", grupoCorreo: "grupo-secult" },
  { lugarId: "id-9", slug: "centro-cinco", nombre: "Centro Cinco", variante: "institucion", grupoCorreo: "grupo-secult" },
];
const csv = `clave,correo,contesto
id-1,uno@ejemplo.mx,
id-2,dos@hotmail.com,agenda
id-3,tres@gmail.com,
Organismo X,contacto@organismo.mx,
id-8,compartido@buzon-compartido.test,
id-9,compartido@buzon-compartido.test,
`;

describe("leerCsv", () => {
  it("clave, correo y contesto; salta la cabecera, comentarios y líneas sin correo", () => {
    const c = leerCsv(`# privado\n${csv}\nbasura sin arroba\n`);
    expect(c).toHaveLength(6);
    expect(c[0]).toEqual({ clave: "id-1", correo: "uno@ejemplo.mx", contesto: "" });
    expect(c[1].contesto).toBe("agenda");
    expect(c[3]).toEqual({ clave: "Organismo X", correo: "contacto@organismo.mx", contesto: "" });
  });
  it("sin columna contesto también vale", () => {
    expect(leerCsv("id-9,nueve@x.mx")).toEqual([{ clave: "id-9", correo: "nueve@x.mx", contesto: "" }]);
  });
});

describe("armarDestinos y repartir", () => {
  const { destinos, sinCorreo } = armarDestinos(filas, leerCsv(csv));
  const buzon = destinos.find((d) => d.variante === "buzon_compartido")!;
  it("una institución por correo, con su ficha por slug; un organismo con sus sedes", () => {
    expect(destinos.map((d) => d.nombre)).toEqual(["Museo Uno", "Museo Dos", "Galería Tres", "Organismo X", nombreBuzonCompartido("Secretaría de Cultura")]);
    expect(destinos[0].url).toBe("https://somosnosotros.org/lugares/museo-uno");
    expect(destinos[0].lugarId).toBe("id-1");
    expect(destinos[3]).toMatchObject({ variante: "organismo", lugarId: null, organismo: "Organismo X", correo: "contacto@organismo.mx", sedes: ["Sede A", "Sede B"] });
  });
  it("dos instituciones con el mismo grupoCorreo se funden en un solo destino, cada una con su propia ficha", () => {
    expect(buzon).toMatchObject({ variante: "buzon_compartido", lugarId: null, correo: "compartido@buzon-compartido.test", organismo: nombreBuzonCompartido("Secretaría de Cultura") });
    expect(buzon.sedesConEnlace).toEqual([
      { nombre: "Museo Cuatro", url: "https://somosnosotros.org/lugares/museo-cuatro" },
      { nombre: "Centro Cinco", url: "https://somosnosotros.org/lugares/centro-cinco" },
    ]);
    expect(buzon.organismoRegistro).toBe(`${nombreBuzonCompartido("Secretaría de Cultura")}: museo-cuatro, centro-cinco`);
  });
  it("si el CSV ya no da el mismo correo para el grupo, no se adivina: cada una por su lado y se avisa", () => {
    const csvDistinto = `${csv.replace("id-9,compartido@buzon-compartido.test,", "id-9,otro@x.mx,")}`;
    const { destinos: d2, sinCorreo: s2 } = armarDestinos(filas, leerCsv(csvDistinto));
    expect(d2.some((d) => d.variante === "buzon_compartido")).toBe(false);
    expect(d2.filter((d) => d.nombre === "Museo Cuatro" || d.nombre === "Centro Cinco").map((d) => d.variante)).toEqual(["institucion", "institucion"]);
    expect(s2.some((s) => s.motivo.includes("ya no coinciden"))).toBe(true);
  });
  it("lo que se queda sin correo se reporta con motivo", () => {
    expect(sinCorreo).toEqual([
      { nombre: "Sede C", motivo: "Organismo Y: sin correo de área confirmado" },
      { nombre: "Sin CSV", motivo: "sin correo en el CSV" },
    ]);
  });
  it("comprobación en su orden, resto en el orden de la lista (el buzón compartido cuenta como uno más), organismos aparte", () => {
    const r = repartir(destinos);
    expect(r.comprobacion.map((d) => d.nombre)).toEqual(["Galería Tres", "Museo Dos"]);
    expect(r.resto.map((d) => d.nombre)).toEqual(["Museo Uno", nombreBuzonCompartido("Secretaría de Cultura")]);
    expect(r.organismos.map((d) => d.nombre)).toEqual(["Organismo X"]);
  });
});

describe("armarCorreo", () => {
  const { destinos } = armarDestinos(filas, leerCsv(csv));
  const inst = destinos[0];
  const org = destinos[3];
  const buzon = destinos.find((d) => d.variante === "buzon_compartido")!;
  it("variante institución: enlace a su ficha por slug, un solo llamado, salida y firma con el teléfono", () => {
    const c = armarCorreo(inst, FIRMA);
    expect(c.asunto).toBe("Museo Uno, súmate a la agenda de Somos Nosotros");
    expect(c.url).toBe("https://somosnosotros.org/lugares/museo-uno");
    expect(c.texto).toContain("Museo Uno ya tiene su ficha en la plataforma");
    expect(c.texto).toContain("https://somosnosotros.org/lugares/museo-uno");
    expect(c.texto).toContain("agenda o cartelera de este mes");
    expect(c.texto).toContain('"no me escriban más"');
    expect(c.texto.endsWith("Gracias,\nOscar Muñiz Blanco\nCoordinación de agenda · Somos Nosotros\nsomosnosotros.org · 444 000 0000")).toBe(true);
    expect(c.html).toContain('href="https://somosnosotros.org/lugares/museo-uno"');
    expect(c.html).toContain("<strong>agenda o cartelera de este mes</strong>");
    expect(c.html).toContain("444 000 0000");
    expect(c.texto).not.toContain("{teléfono}");
  });
  it("asunto B en pregunta", () => {
    expect(armarCorreo(inst, FIRMA, { asunto: "B" }).asunto).toBe("¿Nos mandas tu agenda de este mes?");
  });
  it("variante organismo: lista de sedes, pide reenvío o contacto, sin enlace a ficha", () => {
    const c = armarCorreo(org, FIRMA);
    expect(c.asunto).toBe("Somos Nosotros — agendas de Organismo X en San Luis Potosí");
    expect(c.texto).toContain("Ya tenemos fichas de Sede A y Sede B en la plataforma");
    expect(c.texto).toContain("reenviar esto a quien corresponda, o darnos el contacto de cada sede");
    expect(c.texto).not.toContain("/lugares/");
    expect(c.url).toBeUndefined();
    expect(c.html).toContain("Sede A y Sede B");
    expect(c.texto).toContain("somosnosotros.org · 444 000 0000");
  });
  it("variante buzón compartido: un solo correo, cada institución con su propia ficha, sin pedir reenvío ni contacto", () => {
    const c = armarCorreo(buzon, FIRMA);
    expect(c.asunto).toBe("Somos Nosotros — agendas de Museo Cuatro y Centro Cinco en San Luis Potosí");
    expect(c.texto).toContain("Museo Cuatro y Centro Cinco ya tienen su ficha en la plataforma");
    expect(c.texto).toContain("- Museo Cuatro: https://somosnosotros.org/lugares/museo-cuatro");
    expect(c.texto).toContain("- Centro Cinco: https://somosnosotros.org/lugares/centro-cinco");
    expect(c.texto).toContain("agenda o cartelera de este mes de cada una");
    expect(c.texto).not.toContain("reenviar esto a quien corresponda");
    expect(c.texto).not.toContain("contacto de cada sede");
    expect(c.texto).toContain('"no me escriban más"');
    expect(c.html).toContain('<li>Museo Cuatro: <a href="https://somosnosotros.org/lugares/museo-cuatro">');
    expect(c.html).toContain('<li>Centro Cinco: <a href="https://somosnosotros.org/lugares/centro-cinco">');
  });
  it("icono en la firma HTML (pedido del founder tras la comprobación técnica): 40×40, alt, esquinas redondeadas; el texto plano no lleva nada", () => {
    expect(ICONO_URL).toBe("https://somosnosotros.org/icono-192.png");
    for (const d of [inst, org, buzon]) {
      for (const recordatorio of [false, true]) {
        const c = armarCorreo(d, FIRMA, { recordatorio });
        expect(c.html).toContain(`<img src="${ICONO_URL}" alt="Somos Nosotros" width="40" height="40"`);
        expect(c.html).toContain("border-radius");
        expect(c.texto).not.toContain("icono-192");
        expect(c.texto).not.toContain("<img");
      }
    }
    // El texto plano de la variante institución termina exactamente igual que antes del icono (solo el HTML cambió).
    expect(armarCorreo(inst, FIRMA).texto.endsWith("Gracias,\nOscar Muñiz Blanco\nCoordinación de agenda · Somos Nosotros\nsomosnosotros.org · 444 000 0000")).toBe(true);
  });
  it("recordatorio: corto, nombra la institución o las sedes, misma salida y firma", () => {
    const r = armarCorreo(inst, FIRMA, { recordatorio: true });
    expect(r.asunto).toBe("Recordatorio: la agenda de Museo Uno en Somos Nosotros");
    expect(r.texto).toContain("Hola de nuevo,");
    expect(r.texto).toContain("pedirles la agenda de Museo Uno y sumarla a Somos Nosotros");
    expect(r.texto).toContain("ignoren este correo");
    expect(r.texto).toContain('"no me escriban más"');
    const ro = armarCorreo(org, FIRMA, { recordatorio: true });
    expect(ro.texto).toContain("pedirles las agendas de Sede A y Sede B y sumarlas a Somos Nosotros");
    const rb = armarCorreo(buzon, FIRMA, { recordatorio: true });
    expect(rb.asunto).toBe("Recordatorio: agendas de Museo Cuatro y Centro Cinco en Somos Nosotros");
    expect(rb.texto).toContain("pedirles las agendas de Museo Cuatro y Centro Cinco y sumarlas a Somos Nosotros");
  });
  it("el teléfono viene de la firma que se pasa (la variable), no del código", () => {
    expect(armarCorreo(inst, { telefono: "otro" }).texto).toContain("somosnosotros.org · otro");
    expect(asuntoDe(org, "A", true)).toBe("Recordatorio: agendas de Organismo X en Somos Nosotros");
  });
  it("el HTML escapa el nombre", () => {
    const raro: Destino = { ...inst, nombre: "Museo <A&B>" };
    expect(armarCorreo(raro, FIRMA).html).toContain("Museo &lt;A&amp;B&gt;");
  });
});

describe("listaCorta y urlFicha", () => {
  it("una, dos y tres sedes", () => {
    expect(listaCorta(["A"])).toBe("A");
    expect(listaCorta(["A", "B"])).toBe("A y B");
    expect(listaCorta(["A", "B", "C"])).toBe("A, B y C");
    expect(listaCorta([])).toBe("");
  });
  it("la ficha va por slug", () => {
    expect(urlFicha("teatro-de-la-paz")).toBe("https://somosnosotros.org/lugares/teatro-de-la-paz");
  });
});

describe("hashCorreo", () => {
  it("SHA-256 con sal, 64 hex, mismo valor con mayúsculas o espacios, distinto con otra sal", () => {
    const h = hashCorreo("Uno@Ejemplo.mx", SAL);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(hashCorreo("  uno@ejemplo.mx ", SAL)).toBe(h);
    expect(hashCorreo("uno@ejemplo.mx", "otra sal")).not.toBe(h);
    expect(hashCorreo("dos@ejemplo.mx", SAL)).not.toBe(h);
    expect(h).not.toContain("uno");
  });
  it("sin sal no calcula nada", () => {
    expect(() => hashCorreo("uno@ejemplo.mx", "")).toThrow(/AGENDAS_SAL/);
  });
});

describe("quitarYaEnviados", () => {
  const { destinos } = armarDestinos(filas, leerCsv(csv));
  it("quita a quien ya recibió ese tipo y a quien comparte buzón dentro de la tanda", () => {
    const previos: EnvioPrevio[] = [{ correo_hash: hashCorreo("uno@ejemplo.mx", SAL), tipo: "tanda", enviado_en: "2026-09-22T10:00:00Z" }];
    const repetido: Destino = { ...destinos[1], nombre: "Museo Dos bis", clave: "id-2b", lugarId: "id-2b" };
    const { pendientes, omitidos } = quitarYaEnviados([...destinos, repetido], "tanda", previos, SAL);
    expect(pendientes.map((d) => d.nombre)).toEqual(["Museo Dos", "Galería Tres", "Organismo X", nombreBuzonCompartido("Secretaría de Cultura")]);
    expect(omitidos.map((o) => `${o.destino.nombre}: ${o.motivo}`)).toEqual([
      'Museo Uno: ya recibió un correo de tipo "tanda"',
      "Museo Dos bis: mismo buzón que Museo Dos en esta tanda",
    ]);
  });
  it("otro tipo no bloquea", () => {
    const previos: EnvioPrevio[] = [{ correo_hash: hashCorreo("uno@ejemplo.mx", SAL), tipo: "comprobacion", enviado_en: "2026-09-22T10:00:00Z" }];
    expect(quitarYaEnviados(destinos, "tanda", previos, SAL).pendientes).toHaveLength(5);
  });
});

describe("paraRecordatorio", () => {
  const { destinos } = armarDestinos(filas, leerCsv(csv));
  const ahora = new Date("2026-10-06T12:00:00Z");
  const hace = (dias: number) => new Date(ahora.getTime() - dias * 86_400_000).toISOString();
  it("solo a quien no contestó, recibió el primer correo hace 12 días o más y no tiene recordatorio", () => {
    const previos: EnvioPrevio[] = [
      { correo_hash: hashCorreo("uno@ejemplo.mx", SAL), tipo: "tanda", enviado_en: hace(12) },
      { correo_hash: hashCorreo("dos@hotmail.com", SAL), tipo: "comprobacion", enviado_en: hace(20) }, // contestó "agenda"
      { correo_hash: hashCorreo("tres@gmail.com", SAL), tipo: "comprobacion", enviado_en: hace(5) }, // muy reciente
      { correo_hash: hashCorreo("contacto@organismo.mx", SAL), tipo: "tanda", enviado_en: hace(15) },
      { correo_hash: hashCorreo("contacto@organismo.mx", SAL), tipo: "recordatorio", enviado_en: hace(2) }, // ya recordado
    ];
    expect(paraRecordatorio(destinos, previos, SAL, ahora).map((d) => d.nombre)).toEqual(["Museo Uno"]);
  });
  it("sin envío previo no hay recordatorio", () => {
    expect(paraRecordatorio(destinos, [], SAL, ahora)).toEqual([]);
  });
});

describe("leerArgumentos y tipoDe", () => {
  it("ensayo por defecto, sin reparto; enviar exige confirmo aparte", () => {
    expect(leerArgumentos([])).toEqual({ enviar: false, confirmo: false, modo: null, asunto: "A" });
    expect(leerArgumentos(["--enviar", "--resto"])).toMatchObject({ enviar: true, confirmo: false, modo: "resto" });
    expect(leerArgumentos(["--enviar", "--confirmo", "--comprobacion", "--asunto=B"])).toEqual({ enviar: true, confirmo: true, modo: "comprobacion", asunto: "B" });
  });
  it("un solo reparto, asunto A o B, ensayo y enviar no van juntos", () => {
    expect(() => leerArgumentos(["--resto", "--organismos"])).toThrow(/un solo reparto/);
    expect(() => leerArgumentos(["--asunto=C"])).toThrow(/A o B/);
    expect(() => leerArgumentos(["--ensayo", "--enviar"])).toThrow(/no van juntos/);
  });
  it("el tipo anotado: comprobación, tanda (resto y organismos) o recordatorio", () => {
    expect(tipoDe("comprobacion")).toBe("comprobacion");
    expect(tipoDe("resto")).toBe("tanda");
    expect(tipoDe("organismos")).toBe("tanda");
    expect(tipoDe("recordatorio")).toBe("recordatorio");
  });
});

describe("agendas.json (el archivo real del repo)", () => {
  const reales = leerFilas();
  it("46 filas, sin correos, cada una con id, slug, nombre y variante; 3 de comprobación; los organismos con su organismo", () => {
    expect(reales).toHaveLength(46);
    for (const f of reales) {
      expect(JSON.stringify(f)).not.toContain("@");
      expect(f.lugarId).toMatch(/^[0-9a-f-]{36}$/);
      expect(f.slug).toMatch(/^[a-z0-9-]+$/);
      expect(["institucion", "organismo"]).toContain(f.variante);
      if (f.variante === "organismo") expect(f.organismo).toBeTruthy();
    }
    expect(reales.filter((f) => f.comprobacion).map((f) => f.comprobacion).sort()).toEqual([1, 2, 3]);
    expect(reales.filter((f) => f.variante === "institucion")).toHaveLength(41);
    expect(reales.filter((f) => f.variante === "organismo")).toHaveLength(5);
    expect(reales.filter((f) => f.sinCorreo)).toHaveLength(2);
    expect(new Set(reales.map((f) => f.slug)).size).toBe(46);
    expect(new Set(reales.map((f) => f.lugarId)).size).toBe(46);
  });
  it("las tres instituciones del buzón compartido de la Secretaría de Cultura llevan la misma grupoCorreo", () => {
    const grupo = reales.filter((f) => f.grupoCorreo);
    expect(grupo.map((f) => f.nombre).sort()).toEqual(["Centro Cultural Julián Carrillo", "Galería José Jayme", "Museo del Ferrocarril Jesús García Corona"]);
    expect(new Set(grupo.map((f) => f.grupoCorreo)).size).toBe(1);
    for (const f of grupo) expect(f.variante).toBe("institucion");
  });
});
