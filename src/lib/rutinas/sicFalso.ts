/**
 * SOLO PARA LAS PRUEBAS de «Buscar artistas» (OL-430), como `baseFalsa.ts`.
 */

/**
 * La lista de «Grupos artísticos» del SIC tal como la publica (la forma de lista.php del 21 de octubre de 2026: bloques por municipio con el
 * nombre, la disciplina y la ficha de cada uno), con nombres inventados.
 */
export function listaSic(tabla: string, bloques: Record<string, [string, string, string][]>): string {
  const entrada = ([id, nombre, disciplina]: [string, string, string]) => `<div class="contlist">
    <div class="imagenlist"><a href="/ficha.php?table=${tabla}&table_id=${id}"><div class="cuadrito"></div></a></div>
    <div class="textolist">
        <span class="nombrelist"><a href="/ficha.php?table=${tabla}&table_id=${id}" class="links_fb">${nombre}</a></span><br>
         ${disciplina}
    </div>
</div>`;
  return `<html><body><h1>Grupos artísticos en San Luis Potosí</h1>${Object.entries(bloques)
    .map(([mun, filas]) => `<div class="subtitulo_lista">${mun}: ${filas.length}</div><hr class="subtemas_separador2"><div id="listadoContenedor">${filas.map(entrada).join("")}</div>`)
    .join("")}</body></html>`;
}
