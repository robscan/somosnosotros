# Resolver `docs/ops/OPEN_LOOPS.md` al unir una rama

Los dos guiones se corren desde la raíz del repo, en un árbol donde `HEAD` es la rama por unir y `origin/main` está al día. Reescriben `docs/ops/OPEN_LOOPS.md` con el contenido de `origin/main` más lo que la rama añadió, y abortan con `AssertionError` si algo no cuadra (entonces se resuelve a mano).

- `python3 scripts/ops/resolver_ol.py`: caso normal. Antepone los trozos nuevos de «Last updated» de la rama, añade sus entradas nuevas a «Ahora» y a «Decidido», y si la rama y main tocaron la misma entrada OL se queda con la más larga conservando el sufijo «En producción». Exige que la cabecera de la rama termine con la de la base y que main conserve todos los trozos de la base.
- `python3 scripts/ops/resolver_ol_rama_gana.py`: cuando main editó la entrada OL de una pieza cuya rama seguía abierta (el guion normal aborta con «faltan rama»). La rama gana su entrada; el resto igual.

Si el operador reconstruyó la cabecera «Last updated» (ya no termina con la de la base), ninguno sirve: se toma la versión de main, se anteponen los trozos nuevos de la rama y se copian sus líneas OL a mano. Regla de fondo: el gestor no edita en main la línea OL de una rama abierta; las precisiones del founder van al trozo de «Last updated» o a «Decidido».
