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
- Probar en el iPhone del founder, en Safari y en la app instalada, también con el gesto de atrás: en el simulador el gesto no se pudo simular y se usó la flecha de atrás de Safari.
- **Visto y sin tocar** (la regla era cambiar solo los enlaces "ver"): al saltar, la sección queda a 12 px del borde, bajo la barra pegajosa. En lugar y artista, el título pegajoso tapa la etiqueta del primer día; en Quién va, la sección no tiene margen y su título queda bajo la barra. Con el ancla pasaba igual. Arreglo probable: `scroll-margin-top` con el alto de la barra en `FichaLista.module.css` y en `.quienVa`.
- **Por comprobar** (leído en el código, no probado): las acciones de publicar redirigen apilando, así que Atrás desde la ficha recién creada podría volver al formulario.
- Push y PR cuando el founder lo pida.
