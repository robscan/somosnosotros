import { ayudaDocumento, clavePeriodo, FORMATOS_DOCUMENTO_LISTA, hrefDocumento, informeLugar, nombreDocumento, PERIODOS_INFORME, presentacionArtista, versionDocumento, zonaInforme, type EntradaInforme, type EntradaPresentacion, type FormatoDocumento, type PeriodoInforme, type QueDocumento } from "./documentos";
import { contarPaginas } from "./carteles/plantillas/documento";

/**
 * Lo que necesita la hoja de opciones del PDF (OL-396) para cada elección: cuántas páginas salen (la línea de ayuda), la dirección del PDF (con
 * su versión, para que la caché del teléfono no dé el de ayer) y el nombre del archivo. Se calcula en el servidor al pintar la sección, solo
 * para quien gestiona la ficha: la hoja no espera a nadie para decir «2 páginas».
 */
export type OpcionDocumento = { formato: FormatoDocumento; periodo: PeriodoInforme | null; paginas: number; href: string; archivo: string; ayuda: string };

/** Las dos opciones de la presentación (carta y A4). */
export function opcionesPresentacion(e: EntradaPresentacion): OpcionDocumento[] {
  const d = presentacionArtista(e);
  const id = e.artista.slug || e.artista.id;
  const v = versionDocumento(d);
  return FORMATOS_DOCUMENTO_LISTA.map((formato) => {
    const paginas = contarPaginas(d, formato);
    return { formato, periodo: null, paginas, href: hrefDocumento({ que: "artista", id, formato, v }), archivo: nombreDocumento("artista", id), ayuda: ayudaDocumento("artista", d.nombre, paginas) };
  });
}

/** Las seis opciones del informe (mes, año y todo, en carta y A4). */
export function opcionesInforme(e: Omit<EntradaInforme, "periodo">): OpcionDocumento[] {
  const id = e.lugar.slug || e.lugar.id;
  return PERIODOS_INFORME.flatMap((periodo) => {
    const d = informeLugar({ ...e, periodo });
    const v = versionDocumento(d);
    const archivo = nombreDocumento("lugar", id, clavePeriodo(periodo, e.ahora, zonaInforme(e.lugar)));
    return FORMATOS_DOCUMENTO_LISTA.map((formato) => {
      const paginas = contarPaginas(d, formato);
      return { formato, periodo, paginas, href: hrefDocumento({ que: "lugar", id, formato, periodo, v }), archivo, ayuda: ayudaDocumento("lugar", d.nombre, paginas) };
    });
  });
}

/** Lo que recibe el botón y su hoja. */
export type PropsDocumento = { que: QueDocumento; opciones: OpcionDocumento[]; etiquetasPeriodo: Record<PeriodoInforme, string> | null };
