# 053 · Artistas con ciudad y direcciones ordenadas por cercanía

**Fecha:** 2026-09-16 (noche) · **Base:** reparto de la cola de la bitácora [052](052-firma-y-cola-en-marcha.md).

## Qué pidió
Dos pendientes chicos, sueltos en la 051 ("La ciudad se deduce de las altas"):
1. Artistas siguen todos en San Luis Potosí (un artista no tiene punto del que deducir ciudad); Artistas no acepta `?ciudad=` como ya hacen la agenda y Lugares.
2. Buscando "Plaza de Armas" desde San Luis, Mapbox trae calles de Querétaro, Zacatecas y Saltillo antes que la de aquí, en la hoja "Dónde está" del alta de lugar.

## Qué se hizo
1. **Artistas con ciudad.** La regla: al registrar un artista, la ciudad es la que la persona tenía elegida en la app en ese momento (no hay pin del que deducirla).
   - `/artistas` acepta `?ciudad=<slug>` igual que la agenda y Lugares: carga las ciudades (`cargarCiudades`), resuelve con `ciudadPorSlug` y filtra los artistas y las RPC (`disciplinas_con_artistas`, `detalles_de_disciplina`) por esa ciudad.
   - El chip de ciudad (`ChipCiudad`) va al principio de la fila de chips en `ListaArtistas`, como en Lugares; abre la misma hoja "Dónde". Cambiar de ciudad suelta el filtro de disciplina. `ListaArtistas` pasó a ser de cliente (antes no tenía "use client"; hacía falta para poder darle a `ChipCiudad` la función que arma el enlace de cada ciudad — una función no viaja de servidor a cliente).
   - El botón "Registrar artista" (de la lista y el flotante de `Publicar`) lleva la ciudad actual en `?ciudad=`; el alta (`/artistas/nuevo`) la lee, la resuelve a un nombre real y la manda al formulario en un campo escondido. `validarArtista` la toma con `ciudadCanonica` y cae en San Luis Potosí si viene vacía. **Editar no cambia la ciudad**: el formulario de edición no manda ese campo y `actualizarArtista` no lo toca aunque llegara.
   - El texto de "aún no hay artistas" ya no dice "San Luis Potosí" fijo: dice la ciudad que se esté viendo.
2. **Direcciones por cercanía.** `urlGeocodificar` pide 10 resultados a Mapbox (antes 5); `buscarDirecciones` los reordena por distancia real al punto de cercanía (`distanciaKm`) y devuelve los 5 más cercanos. Mapbox seguirá trayendo ciudades lejanas primero a veces; ahora se corrigen antes de mostrarse.

## Evidencia
- `npm run lint && npm run typecheck && npm test`: verdes, 150 pruebas (2 nuevas: la ciudad en `hrefArtistas`/`validarArtista`, el reordeno por cercanía en `geocodificar`).
- Navegador integrado a 390×844, servidor local con los datos reales: `/artistas` muestra el chip "San Luis Potosí" al principio de la fila de chips, abre la misma hoja "Dónde" que Lugares ("San Luis Potosí · 58 lugares · 85 eventos"), y "Registrar artista" (lista y botón flotante) enlaza a `/artistas/nuevo` limpio (sin `?ciudad=` porque es la ciudad inicial) o a `/entrar?siguiente=/artistas/nuevo?ciudad=<slug>` sin sesión.
- Todas las ciudades registradas hoy siguen siendo San Luis Potosí (nadie ha dado de alta en otra), así que no hay todavía una segunda ciudad real donde probar el caso "artista en otra ciudad"; la lógica es la misma que ya prueba Lugares y quedó cubierta con pruebas unitarias.

## Firma pendiente
Falta la firma del founder en su iPhone (Safari).
