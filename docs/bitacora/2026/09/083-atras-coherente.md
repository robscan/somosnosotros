# 083 · Atrás coherente: "ver" no apila, la pestaña activa y el logotipo tampoco, la lista vuelve donde estaba y Atrás siempre tiene salida (OL-055)

**Fecha:** 2026-09-16 (noche) · **Rama:** `atras-coherente`, desde `main` e106f7a, adelantada antes del primer commit a 62a2643 (PR #84, que tocaba listas y fichas); al cerrar, `main` traído otra vez (PR #78 y #85) sin conflictos. Solo commits locales, sin push, sin migración. · **Pedido del founder:** "Si haz atrás coherente", sobre los cuatro hallazgos que la revisión de OL-050 dejó para esta pieza.

## Causa
1. **"ver" en las fichas** (`#eventos` en lugar, `#fechas` en artista, `#quien-va` en evento) era un ancla normal: apilaba una entrada dentro de la misma ficha, y Atrás (botón o gesto) se quedaba en la ficha, más arriba.
2. **La pestaña activa de la barra inferior** con un filtro puesto, y **el logotipo** en el inicio con algo en la consulta, apilaban otra entrada de la misma pantalla. Al volver con el gesto, `MemoriaScroll` quedaba en "vuelta pendiente" para siempre (solo miraba la ruta, no la consulta) y dejaba de guardar posiciones.
3. **"Ver más" sin desplazar:** `MemoriaScroll` guardaba la posición solo al desplazar. "Ver más" cambia la URL sin mover la página, así que la URL nueva no tenía posición y, al volver de una ficha, la lista quedaba arriba.
4. **Atrás sin salida:** decidía con un contador de pantallas y `history.length`, que cuenta también las entradas de adelante y las de otros sitios. Tras ir y volver desde una ficha abierta por enlace, Atrás pedía "volver" en la primera entrada y no pasaba nada.

## Qué se hizo
- **"ver" (1):** `ui/Salto` baja a la sección sin tocar el historial ni la URL y deja el foco en la sección (para lector de pantalla y teclado), sin marco visible: Safari lo pintaba alrededor de toda la sección. Si se llega con el ancla en la URL (enlace viejo o compartido), baja al montar. Sin JavaScript sigue siendo un ancla. En las tres fichas solo cambió el enlace "ver" y su import.
- **Pestaña activa y logotipo (2):**
  - la pestaña de la sección en la que ya se está reemplaza la entrada;
  - el logotipo reemplaza solo si ya se está en el inicio, con o sin consulta; desde otra sección sigue apilando;
  - `Logotipo` pasa a componente de cliente para saber la ruta.
- **Memoria de scroll (3):**
  - la URL de la memoria es ruta y consulta, y una vuelta dentro de la misma ruta (otro filtro) repone sin quedarse pegada;
  - al llegar a una URL sin vuelta (pantalla nueva, filtro, "Ver más") se guarda la posición de ese momento, aunque no se desplace;
  - al tocar (antes de que el enlace navegue y la página suba) y al salir de la página se guarda la posición exacta de la pantalla que se deja; con el gesto de atrás, en el aviso de vuelta;
  - nunca se guarda una posición bajo una URL que ya no está en pantalla;
  - `MemoriaScroll` va dentro de un `Suspense` en el layout porque ahora lee la consulta.
- **Atrás con salida (4):** una marca propia en el historial (`lib/historial`, la instala `Navegacion`): cada entrada que pisa la app lleva cuántas pantallas de la app tiene detrás.
  - Atrás vuelve con el historial solo si hay alguna. Si no, va a la pantalla madre **reemplazando** la entrada, para que el gesto de atrás no regrese a la ficha.
  - Una carga completa desde otra pantalla de la app (Reglas → Aviso de privacidad) cuenta como pantalla detrás; una pestaña nueva no, aunque venga de la app.
  - Cerrar (✕) de las altas usa lo mismo, también después de "¿Salir sin publicar?".
- **Dos cosas del motor que conviene saber:**
  - Next.js reescribe el estado de cada entrada del historial al navegar y al refrescar (Voy, Seguir) y no conserva lo ajeno. Por eso la marca se pone donde se escribe el historial (se envuelven `pushState` y `replaceState`): apilar suma una, reemplazar conserva la de la entrada.
  - React pinta la pantalla de destino dentro del mismo evento de atrás. Quien necesite enterarse antes (la memoria de scroll) se apunta en `alVolver` de `Navegacion`, que carga con la primera pantalla y escucha antes que el router. Se vio en la verificación: con `MemoriaScroll` dentro del `Suspense`, su propio oyente llegaba tarde y la lista volvía arriba.

## Verificación
- lint (0 errores; el aviso ajeno de siempre en `docs/diseno/logotipo/iconos-sn.mjs`), tipos, pruebas y build, antes y después de traer `main`: 290 pruebas, 10 nuevas de la marca con un historial de mentira que borra el estado como Next.js.
- **Navegador integrado a 390×844**, con el `next dev` de la rama, un respaldo local de datos inventados y sin llaves reales:
  - **Atrás:** enlace directo a una persona del panel → Atrás → Personas, reemplazando (el historial no crece). Ir a una persona, volver y Atrás en la primera entrada, con una entrada por delante → Administración.
  - **"Ver más":** en Personas, bajar a 1611 px → "Ver más" (60 filas, historial igual) → una persona → Atrás → la lista en 1611 (antes, arriba).
  - **"ver":** en la ficha de un lugar, la sección queda a 12 px, sin `#`, con el historial igual y el foco en la sección → Atrás → la lista del panel en un toque. Llegar con `#eventos` en la URL baja a la sección.
  - **Pestaña activa y logotipo:** la pestaña en `/artistas?hace=musica` lleva a `/artistas` sin apilar; el logotipo en `/?cuenta=borrada` lleva a `/` sin apilar, y desde Artistas apila.
  - **Gesto de atrás** (sin tocar Atrás):
    - la lista vuelve a 800;
    - la ficha que se dejó 30 ms después de desplazarla queda guardada en 173, y adelante la repone;
    - con la misma ruta y otra consulta apilada, atrás repone y la memoria sigue guardando después;
    - la recarga repone.
  - **Carga completa:** Reglas → Aviso de privacidad → Atrás → Reglas.
  - **✕:** en Registrar artista abierto por enlace y con un nombre escrito, "Salir y borrar" → Artistas, reemplazando.
  - Nota para repetirlo: el panel no pinta cuadros solo; tras recargar hay que tomar una captura para que se revele el contenido, o la reposición espera sin altura y se rinde.
- **Simulador (iPhone SE, iOS 26.3):**
  - **Safari**, enlace directo a la ficha de un lugar → "ver" → un evento → atrás de Safari → la ficha en su sitio, con la flecha de atrás de Safari en gris (primera entrada: "ver" no apiló) → Atrás de la app → Lugares.
  - **App instalada** desde esa ficha, que abre en la ficha sin nada detrás → "ver" → Atrás → Lugares, con la flecha de iOS en gris. Después, Lugares › Lista → un lugar → "ver" → Atrás → la lista en un toque.
  - El acceso directo de prueba se borró del simulador al terminar.

## Queda
- ~~Probar en el iPhone del founder~~: probado y firmado tras la revisión del PR #87 (abajo, **Firma**).
- ~~**Visto y sin tocar**: al saltar, la sección queda a 12 px del borde, bajo la barra pegajosa.~~ Arreglado en la revisión del PR #87 (abajo, punto 4).
- ~~**Por comprobar**: las acciones de publicar redirigen apilando.~~ Confirmado y arreglado en la revisión del PR #87 (abajo, punto 2).
- Push y PR cuando el founder lo pida (el PR #87 lo abrió gestión de cambios; los arreglos de la revisión van en commits locales).

## Revisión del PR #87 (2026-09-17, madrugada)
El chat de gestión de cambios probó la navegación con datos reales y pasa: la lista con filtro repone filtro y posición exactos, el enlace directo sale a Lugares, "ver" no toca URL ni historial y los chips siguen sin apilar. Su revisión adversarial (3 lentes, 8 agentes, ninguno refutado) pidió siete arreglos antes de mezclar.

### Qué se arregló
1. **La pantalla de error de la agenda no tenía salida (lo metía esta rama).** Sin nada detrás, Atrás hacía `router.replace("/")` estando ya en `/`, y Next.js solo quita la pantalla de error cuando cambia la ruta; en la app instalada no había cómo salir (antes, el enlace recargaba la página).
   - Ahora, si la pantalla madre tiene la misma ruta, Atrás recarga reemplazando la entrada (`location.replace`).
   - "Intentar de nuevo" usa `retry`, que vuelve a pedir la pantalla, en vez de `reset`.
2. **Publicar y guardar apilaban** (ya pasaba en `main`): `redirect()` dentro de una acción apila por defecto, así que Atrás o la ✕ volvían al formulario.
   - Publicar un evento, un lugar o un artista redirige **reemplazando** el alta.
   - Guardar una edición o el perfil, y publicar un lugar desde el alta de evento, ya no redirigen desde el servidor: devuelven a dónde volver y el formulario termina con `useTerminar`. Si la pantalla de detrás tiene la misma ruta (la ficha que se editó, Ajustes, el alta de evento), vuelve a ella con el historial y la relee; si no, reemplaza.
   - Reemplazar no bastaba en esos casos: dejaba la ficha dos veces y el primer Atrás no hacía nada (lo mismo que el punto 5).
   - Mientras vuelve, el botón sigue en "Guardando…", para no publicar dos veces.
   - Para saber de qué pantalla se vino, la marca anota también, en cada entrada, la pantalla desde la que se apiló (`somosnosotrosDesde`).
   - **Decisión sobre «Regístralo»:** la vuelta al alta de evento no reemplaza, **vuelve con el historial** a la misma alta, y el lugar nuevo llega por el borrador (`recordarLugarNuevo`), no por `?lugar=`. Volver y después cambiar la URL montaba el alta dos veces y perdía lo escrito. Si el alta de lugar no se abrió desde el alta de evento, se va a `?lugar=` como antes. Resultado: una sola ✕ (antes, tres).
3. **Pestaña nueva abierta desde la app** (Cmd+clic, "abrir en pestaña nueva"): el referente del mismo sitio contaba como pantalla detrás y, tras ir y volver, Atrás no hacía nada. Ahora cuenta solo si el historial tiene más de una entrada al llegar. Prueba nueva.
4. **"ver" dejaba la sección bajo la barra pegajosa:** `scroll-margin-top` con `--alto-barra` y el área segura de arriba en `FichaLista.module.css` y en Quién va. El título pegajoso de la lista usa el mismo alto, que en la app instalada suma el área segura.
5. **Entrar con código dejaba la ficha dos veces en el historial:** termina con `useTerminar` (vuelve a la ficha de la que se vino y la relee con la sesión nueva).
6. **La pestaña activa y el logotipo soltaban `?ciudad=`**, y con `replace` ya no había cómo volver a ella: conservan la ciudad (`raizConCiudad`, leída al tocar).
7. **`Salto`:** al perder el foco, la sección pierde `tabindex` y `outline`.

### Verificación
- lint (0 errores), tipos, 307 pruebas (con `main` traído: PR #86, sin conflictos en código) y build.
- **Navegador integrado a 390×844**, con el `next dev` de la rama y el respaldo local de datos inventados. El árbol tiene el `.env` del encargado con llaves reales; el `.env.local` temporal las dejó todas vacías, se comprobó con el cargador de variables de Next.js antes de arrancar y se borró al terminar.
  - **(1)** Con la agenda rota a propósito, `/?cuenta=borrada` → "Algo falló" → Atrás → la agenda, con el historial igual. "Intentar de nuevo" sale del error sin recargar.
  - **(2)**
    - Lugares › Lista → ficha → Editar → Guardar → la misma entrada de la ficha → Atrás → la lista.
    - Artistas → Registrar → Publicar → la ficha nueva → Atrás → Artistas.
    - Evento → Duplicar → Publicar → Atrás → el evento original.
    - Alta de evento con título → Registrar un lugar nuevo → Publicar lugar → la misma alta, con el título y el lugar elegido → una ✕ con "Salir y borrar" → la agenda.
    - Ajustes → Editar perfil → Guardar → Ajustes.
  - **(4)** "ver" en lugar y artista: la sección a 56 px, justo bajo la barra, con el día y el primer renglón a la vista. En evento, igual (con la página alargada a mano, porque la ficha de prueba es corta).
  - **(5)** Sin sesión, ficha → Seguir → Entrar con código → la misma entrada de la ficha, con Seguir aplicado.
  - **(6)** `/lugares?ciudad=madrid&vista=lista&tipo=museo`, `/artistas?ciudad=madrid&hace=musica` y `/?ciudad=madrid&dia=manana` → su raíz con `?ciudad=madrid`, sin apilar. El logotipo en `/?ciudad=madrid&x=1` → `/?ciudad=madrid`.
  - **(7)** Con clics reales (con el panel sin foco no llegan los eventos de foco): al salir de la sección se quitan `tabindex` y `outline`.

### Queda (para OL-055)
- Entrar abierto sin nada detrás hacia una página protegida: la pantalla madre es esa misma página y hace un bucle; debería ser "/".
- `MemoriaScroll`: mientras repone (0,6 a 4,6 s), un filtro o "Ver más" se toma como vuelta y no guarda.
- Al salir de la pantalla de error recargando, la entrada nueva cuenta con una pantalla detrás (el referente es la propia app). No se nota: la agenda no tiene Atrás.
- Tras Entrar, la intención (Seguir, Voy) se aplica dos veces, al reemplazar y al releer, como antes. Es idempotente.
- Los márgenes con el área segura no se probaron en un iPhone con muesca.

## Firma
- **2026-09-17:** el founder lo probó y lo firmó: «probado y te firmo». La versión probada es la de la revisión (gestión de cambios subió los commits al PR #87). Queda mezclarlo cuando lo decida gestión de cambios; lo pendiente de arriba sigue en OL-055.
