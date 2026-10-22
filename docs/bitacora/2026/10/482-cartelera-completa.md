# 482 · La cartelera de la Ciudad de México entra completa (OL-450)

**Fecha:** 2026-10-22. **Rama:** `cartelera-completa`, desde `origin/main` (`1c9c761c`, con OL-448 unido). **Operador:** agente de la pieza
(Claude) para el Gestor VII, sin otros agentes. **Migración:** ninguna. **Variables:** ninguna. **Pantallas:** ninguna. **Estado:** lista para la
revisión del gestor.

## El pedido

A la decisión 1 de la bitácora [480](480-cartelera-cdmx.md) (las alcaldías turísticas y el radio de 12 km seguían mandando sobre la cartelera),
el founder respondió: «Incluye todo lo que ya viene en la guía, no quites nada. Aprovechemos que está ya compilado y listo para consumir.»

## Qué cambió

- **`fueraDeLaCiudadDeMexico(direccion)`** (`src/lib/rutinas/carteleraCdmx.ts`): la cartelera es la guía oficial de la ciudad; lo suyo cuenta
  como de la Ciudad de México (cualquiera de sus 16 alcaldías) salvo que su dirección diga otro estado: un código postal que no es de la ciudad
  (los suyos van del 01000 al 16999), «Estado de México» o «Edo. Méx.», un trozo que sea un municipio mexiquense (Naucalpan, Ecatepec,
  Tlalnepantla…) u otro estado como último trozo. Las calles y colonias con nombre de estado (Av. Puebla, la colonia Guerrero) no la sacan.
- **La tarea `cartelera`** (`agendas.ts`), y con ella el guion `cartelera-cdmx.ts`, que la reutiliza:
  - la lista ya no salta lo que está fuera del radio: se piden todas las fichas que no se propusieron antes;
  - el descarte por evento (una vez, no por función) usa `fueraDeLaCiudadDeMexico` en vez de las alcaldías de la ciudad;
  - en `proponer`, una fila de la cartelera (`cartelera_id`) se mira con esa misma regla; las demás fuentes, con las alcaldías como siempre;
  - los recintos fuera de las alcaldías turísticas también se proponen como lugar (solo no, si su dirección es de otro estado). El cruce con
    el directorio no cambió.
- **Publicar** (`publicarEvento.ts`): el punto de una propuesta de la cartelera vale aunque quede fuera del radio de la ciudad (antes, un sitio
  a más de 12 km se buscaba en el mapa dentro del radio y no se publicaba: «el mapa no lo encuentra»).
- **Sin cambiar:** los parámetros de la ciudad, «Buscar lugares», y la lectura con IA de las demás agendas siguen en las alcaldías turísticas.

## Evidencia

- `npm run lint` (0 errores; el aviso de `VisorImagen.componentes.test.mjs` ya estaba), `npm run typecheck`, **`npm test`: 4 622 pruebas**,
  **`test:db`: 2 359 pruebas, 0 fallaron**, `npm run inventario` y `npm run medir` sin novedades, **`npm run test:componentes`: 719 de 719**.
- Pruebas nuevas en `carteleraCdmx.test.ts`: la regla (Gustavo A. Madero y Xochimilco dentro; Av. Puebla, colonia Guerrero y colonia Morelos
  dentro; Naucalpan, Edo. Méx., el C.P. 53100, Ecatepec y «…, Morelos» al final, fuera) y de punta a punta: **un FARO de Indios Verdes (Gustavo
  A. Madero) y uno de Xochimilco entran** con sus recintos como lugares (el de Indios Verdes con su imagen de la lista de recintos); **uno con
  dirección en Naucalpan, Edo. Méx., no** (`fuera_de_la_ciudad: 1`); y el de Xochimilco, a ~20 km del centro, se publica con el punto de la
  cartelera. Las pruebas de OL-448 se ajustaron: el taller de Talleres Tonatiuh (Álvaro Obregón) ahora entra con su recinto (5 eventos y 3
  recintos propuestos; la segunda corrida solo pide la lista).
- Ninguna petición real a la cartelera en esta pieza.

## Efecto esperado en la carga inicial

Se leerán todas las fichas de la cartelera (~900, no solo las de 12 km), así que el guion tarda más: **de 30 a 40 minutos** con la calma, y
con el motor unos 16 pasos. El comando no cambia:

```
node scripts/instituciones/correr.mjs cartelera-cdmx --autor <id del admin> --simular
node scripts/instituciones/correr.mjs cartelera-cdmx --autor <id del admin>
```
