import { describe, expect, it, vi } from "vitest";
import { formularioDeEvento, precioDeAgenda, ubicarSitio } from "./cargaEventos";
import { validarEvento } from "./eventos";

describe("la carga de eventos compartida entre el importador y el servidor (OL-429)", () => {
  it("el costo como lo escribe una agenda, a lo que entiende el formulario", () => {
    for (const t of ["Entrada libre", "ENTRADA LIBRE", "Acceso gratuito", "Gratuito", "Sin costo", "Libre", "Entrada gratuita", "gratis"]) expect(precioDeAgenda(t), t).toBe("Gratis");
    expect(precioDeAgenda("Cooperación voluntaria")).toBe("Cooperación solidaria");
    expect(precioDeAgenda("$150 general, $100 estudiantes")).toBe("$150 general, $100 estudiantes");
    expect(precioDeAgenda("  ")).toBeNull();
    expect(precioDeAgenda(null)).toBeNull();
    // Y el formulario lo entiende: gratis, cooperación en su casilla o el número.
    const base = { titulo: "Recital", fecha: "2026-10-25", hora: "18:00", descripcion: "", lugar: null, sitio: "Plaza de Armas", sitio_lat: 22.15, sitio_lng: -100.97 };
    expect(validarEvento(formularioDeEvento({ ...base, precio: precioDeAgenda("Entrada libre") }, null)).errores.precio).toBeUndefined();
    expect(validarEvento(formularioDeEvento({ ...base, precio: precioDeAgenda("Cooperación voluntaria") }, null)).datos.precio).toBe("Cooperación solidaria");
  });

  it("ubicarSitio: con las búsquedas que le dé quien llama (el servidor, por área; la Mac, por la caja de San Luis)", async () => {
    const porNombre = vi.fn(async () => ({ lat: 22.1518, lng: -100.9755, direccion: "Jardín Hidalgo s/n", nombre: "Plaza de Armas" }));
    const porDireccion = vi.fn(async () => null);
    expect(await ubicarSitio("Plaza de Armas…", null, { porNombre, porDireccion })).toMatchObject({ punto: { lat: 22.1518 }, como: "Mapbox por nombre" });
    expect(porNombre).toHaveBeenCalledWith("Plaza de Armas");
    expect(porDireccion).not.toHaveBeenCalled();
    expect(await ubicarSitio("Nadie", "Calle 1", { porNombre: async () => null, porDireccion: async () => null })).toBeNull();
    expect(await ubicarSitio("  ", null, { porNombre, porDireccion })).toBeNull();
  });
});
