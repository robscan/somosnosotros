# 250 · Inicio: «Tus planes» no le quita eventos a las demás filas (OL-221)

**Fecha:** 2026-09-26 · **Rama:** `planes-sin-quitar` · **Quién:** gestor de cambios

## Lo que vio el founder

«Al seleccionar que voy a un evento seleccionado para mí, desaparece de slider y me imagino que aparece en tus planes, eso confunde.»

## Causa

Con OL-219 (PR #256), los ids de «Tus planes» servían de punto de partida a la regla de no repetir de Inicio (`calcularCarrilesAgenda(…, vistosIniciales)` e `idsUsadosEnAgenda(…, ids)`). Al tocar «Voy», la acción revalidaba `/` y la pantalla se repintaba. El evento ya estaba en «Tus planes», así que la regla lo sacaba de «Seleccionados para ti», justo donde se había tocado.

## Decisión

Propuesta del gestor, aceptada por el founder («Sí a tu propuesta»):

- «Tus planes» es la agenda de la persona, no un carril de descubrir, y no entra en la regla de no repetir.
- El evento sigue en su fila con el check de «Voy».
- Con OL-212 (PR #257) guardar desde una lista ya no repinta la pantalla, así que nada desaparece bajo el dedo.
- En la próxima visita, el evento aparece también en «Tus planes».

Hubo una confusión que queda anotada. El founder escribió después «Entonces deja listo en los dos lados», y el gestor lo leyó como «que el evento aparezca al instante en los dos lados». Lanzó un operador para eso y lo detuvo sin que subiera nada, cuando el founder aclaró que hablaba del botón «Listo» de los dos calendarios (OL-218).

## Cambios

- `src/lib/inicio.ts`: `calcularCarrilesAgenda(agenda, ahora)` e `idsUsadosEnAgenda(agenda, ahora)` ya no reciben ids de «Tus planes».
- `src/components/inicio/CarrilAgenda.tsx` y `src/app/page.tsx`: se retira `tusPlanesIdsPromise`. «Cerca de ti» excluye solo lo de los carriles de descubrir.
- `src/lib/inicio.test.ts`: la prueba de antes, que exigía quitar lo de «Tus planes», se cambia por una que exige lo contrario. Un evento que está en «Tus planes» sigue saliendo en «Seleccionados para ti».

## Evidencia

`vitest` de `inicio.test.ts`: 40 pruebas en verde. `npm run typecheck` en verde y `npm run lint` sin errores. CI en el PR.
