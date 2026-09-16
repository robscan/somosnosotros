# 049 · Salir del alta sin publicar: una sola regla para las tres altas

**Fecha:** 2026-09-16 (tarde) · **Base:** observación del founder: la hoja de salida del alta de evento salía sin cambios, y en Lugares y Artistas no salía; "revisa y propón y estandariza" · **PR:** #56.

## Qué pasaba
- El alta de evento decidía si preguntar mirando si había *algo* (nombre, sitio, artista, descripción o foto), no si había *cambios*. Un duplicado ("Duplicar con otra fecha") llega lleno y preguntaba de entrada; un alta desde un lugar o un artista llegaba con Dónde o Quién puestos.
- Lugares y Artistas no tenían guardia: Atrás o la ✕ se iban sin más, y además guardaban un borrador en el teléfono que volvía solo al abrir el alta (lo que el founder rechazó para eventos el 15: "formulario limpio").

## La regla (propuesta y aplicada)
1. **Se pregunta solo si el formulario cambió respecto a cómo se abrió.** Se toma una huella del formulario (campo por campo, con `FormData`) en cuanto está en pantalla y se compara al tocar Atrás o la ✕. Un alta que llega con el lugar, el artista o el nombre puestos, o un duplicado, no pregunta hasta que se toca algo. Vale para lo controlado y lo no controlado (descripción, redes), porque se lee el formulario, no el estado.
2. **La misma hoja en las tres altas**: "¿Salir sin publicar? Se borra lo que escribiste." con Seguir editando y Salir y borrar. Al confirmar, se olvida el borrador (el de evento) y se vuelve.
3. **El alta empieza limpia.** Lugares y Artistas dejan de guardar borrador en el teléfono; el de evento se queda solo para volver de "Registrar un lugar nuevo" (bitácora 044). Editar no pregunta.
4. Publicar quita la guardia antes de mandar.

Todo vive en `components/SalirSinPublicar` (`useSalirSinPublicar(formRef, activa, olvidar)`, que devuelve la hoja); los tres formularios solo ponen la referencia al `form` y pintan la hoja. Se fueron de `FormularioEvento` el cálculo `hayAlgo` y su hoja propia, y de `FormularioLugar` y `FormularioArtista` los borradores (`localStorage`).

## Evidencia
- lint, typecheck y 145 pruebas en verde.
- Navegador integrado a 390 con usuario desechable (borrado al final): alta de evento abierta desde un lugar, sin tocar nada, la ✕ se va sin preguntar; con un nombre escrito, la ✕ abre la hoja y Seguir editando la cierra sin perder el nombre; alta de lugar con un nombre escrito, la ✕ abre la hoja; alta de artista con el nombre puesto desde la URL y sin tocar, la ✕ se va sin preguntar.

## Firma
Pendiente en el iPhone.
