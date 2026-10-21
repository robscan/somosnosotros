import { describe, expect, it, vi } from "vitest";
import { formularioDeEvento, mismoEventoDeAgenda, parecidoGuardado, precioDeAgenda, resolverLugar, singular, titulosDelMismoEvento, ubicarSitio } from "./cargaEventos";
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

describe("la misma función con otro título (OL-433)", () => {
  const CEART = "Centro de las Artes de San Luis Potosí Centenario (CEART)";
  it("se unen: uno dentro del otro, plural y palabras del sitio, el mismo orden distinto", () => {
    // Los pares reales del 21 de octubre.
    expect(mismoEventoDeAgenda("Hermanos Pérez Meza Big Band", "Los Hermanos Pérez Meza Big Band: Esto somos", "Teatro de la Paz")).toBe(true);
    expect(mismoEventoDeAgenda("Noche de recorridos", "Noches de Recorridos CEART", CEART)).toBe(true);
    expect(mismoEventoDeAgenda("Noche de recorridos", "Noches de Recorridos CEART")).toBe(true); // sin saber el sitio también
    // Los de la bitácora 415 y la prueba del «¿Es este?».
    expect(mismoEventoDeAgenda("Gitanos mexicanos 2.ª edición: Pargazz", "Pargazz: Gitanos mexicanos, 2ª Edición")).toBe(true);
    expect(mismoEventoDeAgenda("Recital de guitarra", "Recital de Guitarra Clásica")).toBe(true);
    expect(mismoEventoDeAgenda("Xil", "Xil en concierto")).toBe(true);
    expect(mismoEventoDeAgenda("RECITAL de guitarra", "Recital de guitarra")).toBe(true);
  });

  it("no se unen: cada uno nombra algo que el otro no, o solo comparten una palabra genérica", () => {
    expect(mismoEventoDeAgenda("Inauguración: Raíces", "Inauguración: Ecos del agua", "Museo Regional Potosino")).toBe(false);
    expect(mismoEventoDeAgenda("Inauguración de la exposición Raíces de la tierra", "Inauguración de la exposición Ecos del agua")).toBe(false);
    expect(mismoEventoDeAgenda("Concierto de la Banda de Música del Estado", "Concierto de la Orquesta Sinfónica del Estado")).toBe(false);
    expect(mismoEventoDeAgenda("Fotovisión 31: charla sobre la exposición Échele mai", "Fotovisión 31: charla con integrantes de la exposición Entrelazos")).toBe(false);
    expect(mismoEventoDeAgenda("Concierto", "Concierto de jazz")).toBe(false);
    expect(mismoEventoDeAgenda("Noche de Museos", "Noche de recorridos")).toBe(false);
    expect(mismoEventoDeAgenda("", "Concierto")).toBe(false);
    // La regla de `eventos_parecidos` (la del importador) sí tomaba por iguales a dos inauguraciones distintas.
    expect(titulosDelMismoEvento("Inauguración de la exposición Raíces de la tierra", "Inauguración de la exposición Ecos del agua")).toBe(true);
  });

  it("singular sin diccionario, igual en los dos lados", () => {
    expect(["noches", "recorridos", "canciones", "festivales", "mujeres", "huehues", "luz", "mas", "31"].map(singular)).toEqual(["noche", "recorrido", "cancion", "festival", "mujer", "huehue", "luz", "mas", "31"]);
  });

  it("parecidoGuardado con la regla de la rutina: el plural se reconoce; dos inauguraciones distintas, no", () => {
    const zona = "America/Mexico_City";
    const guardado = (titulo: string) => ({ id: titulo, titulo, inicio: "2026-10-24T01:30:00.000Z", zona, lugar_id: "ceart", sitio_texto: null, clase: "puntual", borrador: false, visible: true });
    const nuevo = (titulo: string) => ({ titulo, inicio: "2026-10-24T01:30:00.000Z", zona, lugar_id: "ceart", sitio_texto: null });
    const lugares = [{ id: "ceart", nombre: CEART }];
    const regla = (a: string, b: string) => mismoEventoDeAgenda(a, b, CEART);
    expect(parecidoGuardado(nuevo("Noche de recorridos"), [guardado("Noches de Recorridos CEART")], lugares)).toBeNull(); // la del importador no
    expect(parecidoGuardado(nuevo("Noche de recorridos"), [guardado("Noches de Recorridos CEART")], lugares, regla)?.titulo).toBe("Noches de Recorridos CEART");
    expect(parecidoGuardado(nuevo("Inauguración: Raíces"), [guardado("Inauguración: Ecos")], lugares, regla)).toBeNull();
  });

  it("el lugar por su sigla entre paréntesis, solo si es uno", () => {
    const lugares = [
      { id: "ceart", nombre: "Centro de las Artes de San Luis Potosí Centenario (CEART)" },
      { id: "ipba", nombre: "Instituto Potosino de Bellas Artes (IPBA)" },
      { id: "x1", nombre: "Foro Uno (FX)" },
      { id: "x2", nombre: "Foro Dos (FX)" },
    ];
    expect(resolverLugar("CEART", lugares)?.id).toBe("ceart");
    expect(resolverLugar("ipba", lugares)?.id).toBe("ipba");
    expect(resolverLugar("FX", lugares)).toBeNull();
    expect(resolverLugar("Centro de las Artes", lugares)).toBeNull();
  });
});
