import { describe, expect, it } from "vitest";
import { jsonLdArtista, jsonLdLugar, jsonLdMigajas, jsonLdSitio } from "./estructurados";

describe("jsonLdLugar", () => {
  const base = { nombre: "Casa de la Cultura", descripcion: null, direccion: null, ciudad: "San Luis Potosí", lat: 22.15, lng: -100.98, imagen: null, url: "/lugares/casa-de-la-cultura" };

  it("manda el tipo Place con nombre, geo y dirección absoluta", () => {
    const d = jsonLdLugar(base);
    expect(d["@type"]).toBe("Place");
    expect(d.url).toBe("https://somosnosotros.org/lugares/casa-de-la-cultura");
    expect(d.geo).toEqual({ "@type": "GeoCoordinates", latitude: 22.15, longitude: -100.98 });
  });
  it("sin dirección, descripción ni imagen no manda esos campos", () => {
    const d = jsonLdLugar(base);
    expect(d).not.toHaveProperty("address");
    expect(d).not.toHaveProperty("description");
    expect(d).not.toHaveProperty("image");
  });
  it("con dirección, descripción e imagen las manda", () => {
    const d = jsonLdLugar({ ...base, direccion: "C. 5 de Mayo 100", descripcion: "Un centro cultural", imagen: "https://x/y.jpg" });
    expect(d.address).toEqual({ "@type": "PostalAddress", streetAddress: "C. 5 de Mayo 100", addressLocality: "San Luis Potosí" });
    expect(d.description).toBe("Un centro cultural");
    expect(d.image).toEqual(["https://x/y.jpg"]);
  });
});

describe("jsonLdArtista", () => {
  const base = { nombre: "Ana López", descripcion: null, imagen: null, url: "/artistas/ana-lopez", esGrupo: false, redes: [] as string[] };

  it("un solista es Person; un grupo o colectivo es PerformingGroup", () => {
    expect(jsonLdArtista(base)["@type"]).toBe("Person");
    expect(jsonLdArtista({ ...base, esGrupo: true })["@type"]).toBe("PerformingGroup");
  });
  it("sin redes, descripción ni foto no manda esos campos", () => {
    const d = jsonLdArtista(base);
    expect(d).not.toHaveProperty("sameAs");
    expect(d).not.toHaveProperty("description");
    expect(d).not.toHaveProperty("image");
  });
  it("con redes públicas ya registradas las manda en sameAs, nunca datos de contacto", () => {
    const d = jsonLdArtista({ ...base, redes: ["https://instagram.com/analopez"], descripcion: "Cantautora", imagen: "https://x/foto.jpg" });
    expect(d.sameAs).toEqual(["https://instagram.com/analopez"]);
    expect(JSON.stringify(d)).not.toMatch(/mailto:|tel:|@[a-z0-9.-]+\.[a-z]{2,}/i);
  });
});

describe("jsonLdSitio", () => {
  it("manda WebSite con el nombre y el dominio", () => {
    expect(jsonLdSitio()).toEqual({ "@context": "https://schema.org", "@type": "WebSite", name: "Somos Nosotros", url: "https://somosnosotros.org" });
  });
});

describe("jsonLdMigajas", () => {
  it("arma la lista en orden, con el dominio agregado a una ruta relativa", () => {
    const d = jsonLdMigajas([{ nombre: "Inicio", url: "/" }, { nombre: "Lugares", url: "/lugares" }, { nombre: "Casa de la Cultura", url: "/lugares/casa-de-la-cultura" }]);
    expect(d.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Inicio", item: "https://somosnosotros.org/" },
      { "@type": "ListItem", position: 2, name: "Lugares", item: "https://somosnosotros.org/lugares" },
      { "@type": "ListItem", position: 3, name: "Casa de la Cultura", item: "https://somosnosotros.org/lugares/casa-de-la-cultura" },
    ]);
  });
  it("una url que ya lleva dominio no lo duplica", () => {
    const d = jsonLdMigajas([{ nombre: "Inicio", url: "https://somosnosotros.org/" }]);
    expect((d.itemListElement as { item: string }[])[0].item).toBe("https://somosnosotros.org/");
  });
});
