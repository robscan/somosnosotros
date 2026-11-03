# 540 · OL-508 · El título de «Esta semana» cuando todos los eventos caen el mismo día

**Fecha:** 2026-11-02. **Rama:** `titulo-semana-un-dia` (desde `origin/main` `28b67262`). **Quién:** operador del Gestor de cambios VIII (agente, árbol aislado), sin subagentes.
**Manda:** el founder vio la publicación «Esta semana» de Instagram con dos eventos del mismo viernes y el título «Del viernes 6 al viernes 6 de noviembre»: «No tiene sentido».
**Estado:** hecho. Sin migración, sin variables nuevas. No toqué producción, `.env` ni llaves. Espera revisión del gestor y el «publica» del founder.

## Qué cambió

- `tituloSemana` (`src/lib/instagram/destacado.ts`): si el primer y el último día son el mismo, devuelve el día solo con mayúscula inicial («Viernes 6 de noviembre», con `conMayuscula` de `fechas.ts`). Dos días o más, como antes («Del viernes 6 al sábado 7 de noviembre»; entre meses, «Del viernes 30 de octubre al domingo 1 de noviembre»). `cargarSemana` (`ficha.ts`) no cambia: ya le pasa el primer y el último día.
- `textoSemana` no dice «del … al …» (abre con «Este fin en …» y un renglón por evento con su día), así que no lleva cambio.
- La regla de «Esta semana» (`armarSemana`, solo eventos con cartel) no se tocó.

## Pruebas

- `destacado.test.ts`: prueba nueva con el mismo día («Viernes 6 de noviembre») y con dos días distintos del mismo mes («Del viernes 6 al sábado 7 de noviembre»); las dos que ya había siguen.
- `npm run lint && npm run typecheck && npm test`: verde (323 archivos, 5 175 pruebas).

## La portada con un título de una línea

`scripts/ops/auditoria-ui/instagram-repisa.mjs` (OL-505) acepta `--mismo-dia`: dibuja solo «Esta semana» con el código de la app (`dibujarPortadaSemana`), con los dos primeros eventos reales del `.tercera.json` (Cultura Mística y Merk Local, con sus carteles) puestos los dos el viernes 30, y el título que da `tituloSemana` («Viernes 30 de octubre»). Guarda en `docs/rediseno/capturas-540/` (solo las de 540 y `medidas.json`):

- `semana-4x5-540.png`: dos barras con «VIE 30», la ceja, el título en una línea, los dos eventos con su filete y el pie. Nada encimado, cortado ni fuera del margen; tinta a 7,49:1.
- `semana-9x16-540.png`: lo mismo dentro de la zona de texto de la historia; sin fallas.

El título de una línea no deja hueco entre el título y los eventos: el texto se apila desde abajo y las barras se apoyan sobre él. Lo que sí queda es aire arriba de las barras (más que con tres eventos), porque con dos eventos hay dos barras del ancho de un tercio y su alto tiene tope; el título de una línea suma una línea más de ese aire. Es el plano de OL-505 para dos eventos, no un defecto de este cambio; lo dejo anotado para el gestor por si quiere otro reparto con uno o dos eventos.
