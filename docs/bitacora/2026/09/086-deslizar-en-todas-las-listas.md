# 086 · Deslizar en todas las listas: los mismos renglones y acciones (OL-057, pieza B)

**Fecha:** 2026-09-17 · **Ramas:** `deslizar-en-todas-las-listas` (PR 1) y `deslizar-en-perfil-y-fichas` (PR 2, desde `main` cuando entre el 1) · **Pieza B** de deslizar; la A está en la [085](085-voy-y-me-interesa-al-deslizar.md).

## Qué pidió el founder
> «Existen varias tabs con listas y por consistencia deberían heredar comportamiento, de hecho deberían usar los mismos componentes» (2026-09-16, noche).

> «Quitar pienso que debería desaparecer al instante» (para Mi perfil).

La pausó el 2026-09-17 (madrugada) para cerrar la pieza A, y la retomó ese mismo día: «retoma y ejecuta segunda parte por favor».

Se avisó a gestión de cambios y se esperaron sus instrucciones:
- **dos PR:**
  - el 1, los componentes comunes en las listas de siempre, sin ningún cambio visible ni de comportamiento;
  - el 2, las pestañas de la ficha de persona en `/perfil` y `/personas/[id]`, "Sigo", los próximos eventos de las fichas de lugar y de artista, y "quitar desaparece al instante";
- **una sola bitácora (esta) y OL-057;**
- **cuidados:**
  - no tocar `metadata` ni `generateMetadata` de las páginas que cambia la pieza `seo-indexar`;
  - lo de quien mira se lee con su sesión, sin caché compartida entre cuentas;
  - un perfil reservado sigue sin verse;
  - sin sesión, el gesto lleva a Entrar;
  - Deshacer y mover de pestaña no apilan historial.

## PR 1 · Los renglones comunes, sin cambios a la vista
- **`RenglonLugar`** (nuevo), sacado de `ListaLugares`, como `RenglonEvento`:
  - foto cuadrada y nombre;
  - en los datos, si lo sigues, "Solo tú lo ves", la calle (con la distancia si se ordena por cercanía) y el próximo evento;
  - con acciones se desliza (`ui/Deslizable`); sin ellas es un enlace.
- **`RenglonArtista`** (nuevo), sacado de `ListaArtistas`:
  - foto redonda y nombre;
  - en los datos, si lo sigues, qué hace (con `IconoDisciplina`, que se muda aquí sin cambios) y su próxima fecha;
  - igual con o sin acciones.
- **Quién los usa:**
  - `ListaLugares` y `ListaArtistas`, con las acciones de `useSeguirEnLista`;
  - `ListaSeguidos` ("Sigo") solo cambia de dónde toma `IconoDisciplina`; pasará a los renglones comunes en el PR 2.
- **La agenda** ya usaba los comunes (`RenglonEvento` y `useAsistenciaEnLista`, de la pieza A): no cambia.
- **No se tocó ninguna página**, así que tampoco `metadata`. Sin migración ni variables nuevas.

### Evidencia del PR 1
- **lint** (el aviso viejo del script del logotipo, ajeno), **tipos**, **319 pruebas** y **build** en verde.
- **El mismo marcado.** Una prueba fuera del repo, en el scratchpad, pinta con `renderToStaticMarkup` las dos versiones de `ListaLugares` y `ListaArtistas` (la de `main` en 1d7f93f y la de la rama) con los mismos datos y compara el HTML.
  - Lugares: sin sesión, con sesión y un lugar seguido, y ordenados por cercanía.
  - Artistas: sin sesión, y con sesión y dos seguidos.
  - Los datos traen privado, sin dirección, próximo evento y próxima fecha.
  - Es igual en los cinco casos, con las clases de los CSS modules y sin `undefined`. `IconoDisciplina` se mudó sin cambiar una línea.
- **Capturas a 390×844** con el respaldo local y una sesión inventada, sin producción:
  - Artistas: "Ana de Prueba" con "Sigues" y "Trío de Prueba" abierto con Seguir;
  - Lugares: "Casa de Prueba del Centro" con "Sigues" y el aviso con Deshacer, y "Foro de Prueba" abierto con Seguir.
- **Sin simulador:** el renglón que se desliza y su marcado no cambian; el gesto se prueba en el PR 2, que trae comportamiento nuevo.

## PR 2 · Perfil, persona y fichas
Pendiente: empieza desde `main` cuando entre el PR 1.
