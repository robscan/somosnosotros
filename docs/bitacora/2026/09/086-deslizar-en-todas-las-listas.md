# 086 · Deslizar en todas las listas: los mismos renglones y acciones (OL-057, pieza B)

**Fecha:** 2026-09-17 · **Ramas:** `deslizar-en-todas-las-listas` (PR 1, en producción con el [PR #91](https://github.com/robscan/somosnosotros/pull/91)) y `deslizar-en-perfil-y-fichas` (PR 2, desde `main` en c3fda3b; commit local, sin push) · **Pieza B** de deslizar; la A está en la [085](085-voy-y-me-interesa-al-deslizar.md).

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

El PR 1 pasó la verificación independiente de gestión de cambios: en 23 casos de Lugares, Artistas y Sigo, el HTML sale igual byte a byte, y el cableado de las acciones es el mismo. Está en producción ([PR #91](https://github.com/robscan/somosnosotros/pull/91)).

## PR 2 · Perfil, persona y fichas
- **La ficha de una persona** (`ActividadPersona`, nuevo, dentro de `FichaPersona`) usa en sus pestañas los renglones y gestos de las listas, siempre para quien mira:
  - los eventos, por día, con Voy y Me interesa (`RenglonEvento` y `useAsistenciaEnLista`);
  - "Sigo" y "Sigue" con Seguir: `ListaSeguidos` ahora pinta `RenglonLugar` y `RenglonArtista`, con el próximo evento de cada lugar y la próxima fecha de cada artista, como en las listas (`cargarPersona(id, { conProximos: true })`).
- **Mi perfil: quitar desaparece al instante** (decisión del founder). `lib/actividad` (con pruebas) decide qué renglón va en cada pestaña según lo que decidí ahora:
  - No voy o Ya no lo quita de su pestaña; dejar de seguir lo saca de "Sigo";
  - Voy desde "Me interesa" lo pasa a "Voy a", y al revés;
  - los números cambian con él;
  - Deshacer lo devuelve a su sitio al instante, aunque la página que llegó tras guardar ya no lo traiga (la ficha recuerda lo visto en la visita, `unirVistos`): la lista sigue en su orden, el scroll no se mueve y nada apila historial;
  - una pestaña que había al abrir se queda aunque se vacíe, con su texto ("Ya no te interesa ningún evento."), y una nueva aparece al llenarse.
- **La ficha de otra persona:**
  - "Va a" y "Sigue" son suyos y no cambian con mis gestos;
  - el sello "Vas", "Te interesa" o "Sigues" dice lo de quien mira;
  - "Van a lo mismo" sigue a mi Voy: sale con No voy y entra con Voy.
- **Lo de quien mira:**
  - Se lee con su sesión en cada render (sin `revalidate` ni `use cache` en esas rutas) y solo le llega a esa persona: `relacionDe` lo acota a lo que se ve en la ficha.
  - La propia ficha, vista como la ven los demás, no tiene gestos.
  - Un perfil reservado sigue sin pintar ni mandar sus listas; además, las reglas de la base esconden sus asistencias y seguimientos a los demás.
- **Sin sesión**, el gesto lleva a Entrar con la intención, como en la agenda.
- **Sellos donde dicen algo:** en Mi perfil y en "Van a lo mismo" no hay "Vas" ni "Sigues", porque la pestaña ya lo dice; en "Va a" y "Sigue" de otra persona, sí.
- **Un solo aviso y una sola pregunta por pantalla** (`useCanalDeListas`, nuevo): las tres listas de la ficha de persona comparten el aviso de abajo (el nuevo reemplaza al anterior, y cada uno cierra solo el suyo) y la pregunta de avisos. Los dos hooks lo aceptan como opción; las listas de siempre siguen con los suyos.
- **Fichas de lugar y de artista:**
  - sus próximos eventos (`EventosPorDia`, nuevo) traen Voy y Me interesa para quien mira, leídos con su sesión (`decididasDe`);
  - el aviso flota encima de la barra fija, que publica su alto real (`ui/useAltoBarraFija`, en `Seguir` y `Asistencia`).
- `avisosParaListas` junta los datos de la pregunta de avisos para las páginas.
- Sin tocar `metadata` ni `generateMetadata`. Sin migración.

### Evidencia del PR 2
- **lint** (el aviso viejo del logotipo), **tipos**, **329 pruebas** (10 nuevas de `lib/actividad`) y **build** en verde.
- **Navegador a 390×844** con el respaldo local y dos cuentas inventadas, sin producción.
  - **Mi perfil (Admin):**
    - arranca en "Voy a 2 · Sigo 3 · Me interesa 1", sin sellos;
    - No voy en "Lectura" la quita (Voy a 1), sigue fuera tras guardar y Deshacer la devuelve a su sitio;
    - Voy en "Guitarra" desde "Me interesa": Me interesa queda en 0 con su texto, Voy a sube a 3 y sale la pregunta de avisos; Deshacer la regresa;
    - Dejar de seguir "Foro" en "Sigo": Lugares · 1, y Deshacer;
    - No voy y enseguida Dejar de seguir en otra pestaña: se ve un solo aviso, el último;
    - **Deshacer lento:** con lo quitado ya guardado y la página refrescada, y el respaldo tardando 2,5 s, Deshacer devuelve "Lectura" (y en "Sigo", a "Ana") a su sitio a los 150 ms, y ahí sigue cuando responde.
  - **Beto en la ficha de Admin:**
    - "Va a 2 · Sigue 3 · Van a lo mismo 1", con "Vas" solo donde Beto va;
    - Voy en "Lectura": Van a lo mismo sube a 2 y sale la pregunta;
    - Seguir a Ana: "Sigues", sin una segunda pregunta;
    - No voy en "Van a lo mismo" lo quita, y Deshacer;
    - "Va a" y "Sigue" no cambian.
  - **Sin sesión:** no hay "Van a lo mismo" ni sellos, y Voy lleva a Entrar con `?accion=voy` y la intención guardada.
  - **Ficha de Foro (Beto):** Voy al deslizar "Guitarra" pone "Vas" y hace la pregunta; el aviso queda 12 px encima de la barra de Seguir (`--alto-barra-fija`: 73 px).
- **Con el dedo en el simulador** (iPhone SE, iOS 26.3, Safari, sin sesión; se apagó al final):
  - en la ficha de Admin, deslizar "Lectura" abre Voy y Me interesa pegados al borde;
  - en "Sigue", deslizar "Foro" abre Seguir;
  - tocarlo lleva a "Entra para seguir a Foro de Prueba".

## Queda
- **Firma del founder en el iPhone:** las pestañas de Mi perfil y de otra persona, quitar al instante con Deshacer, y los próximos eventos de las fichas.
- La pestaña en la que se estaba no se recuerda al volver de una ficha; ya pasaba antes y no se añadió.
- En las fichas de lugar y de artista, la barra de Seguir y la lista de eventos tienen cada una su aviso y su pregunta de avisos.
