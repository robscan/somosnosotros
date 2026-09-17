# 067 · Los artistas tienen ciudad, de cualquier país: renglón en el alta y la edición, en la ficha y en la hoja del chip

**Fecha:** 2026-09-16 (noche) · **Rama:** `ciudad-de-artistas` (commit local, sin push) · **Pieza:** OL-041.

## Qué pidió el founder
"En la sección de artistas colocamos un chip de ubicación. Pero los artistas hoy no tienen ubicación. Creo que sí es importante agregar ese campo en los artistas y cambiar el disclaimer que se muestra cuando se hace tap en el chip de la ciudad dentro de artistas, para que exprese lo mismo que con lugares pero con artistas."

A media pieza cuestionó el límite de país:

> "¿Qué pasa si alguien en Costa Rica decide agregar un artista o lugar de allá? ¿O en España? ¿Por qué nos empeñamos en cerrarlo a México?"
>
> "Somos context aware, eso es diferente a limitar a un país o ciudad."

## Cómo estaba
- La base ya tenía `artistas.ciudad` (todos en San Luis Potosí). Desde la bitácora [053](053-artistas-ciudad-y-direcciones-cercanas.md) el alta la tomaba escondida de la ciudad elegida en Artistas, y editar no la cambiaba. En pantalla no se veía en ningún lado.
- La hoja del chip de ciudad en Artistas era la de Lugares: "Las ciudades donde ya hay lugares registrados…" con "58 lugares · 85 eventos".
- Un artista escrito en "Quién" al publicar un evento caía siempre en San Luis Potosí, aunque el evento fuera en otra ciudad.
- **El límite a México no era una regla de producto.** Lo puse en la bitácora [051](051-ciudad-organica.md) como parche: sin país, Mapbox ponía teatros de Madrid antes que el Teatro de la Paz de aquí. La 053 ya reordena las direcciones por distancia real, que es la solución por contexto; el parche se quedó sin razón.

## Qué se hizo
1. **Hoja del chip en Artistas.** Dice "Las ciudades donde ya hay artistas registrados. Registra un artista en otra ciudad y aparecerá aquí." y cada ciudad con sus artistas ("San Luis Potosí · 522 artistas"). La lista sale de los artistas, como la de Lugares sale de los lugares (`armarCiudadesDeArtistas`, `cargarCiudadesDeArtistas`): una ciudad aparece en cuanto alguien registra ahí un artista. La agenda y Lugares no cambian. Es el mismo componente (`components/Ciudad`): habla de lo que cuenta la lista que recibe.
2. **Renglón Ciudad en el alta y la edición**, con el dibujo del canon: pin | CIUDAD / San Luis Potosí | Cambiar, después de "Es".
   - De entrada: en el alta, la ciudad elegida en Artistas; al editar, la del artista.
   - "Cambiar" abre la hoja "Ciudad": campo "Busca la ciudad" con foco. Sin escribir, muestra las ciudades que ya tienen artistas. Al escribir, las ciudades de **cualquier país**, primero las cercanas a la ciudad que se ve: "Guadal" da Guadalajara (Jalisco) primero; "Córdoba" da España, Argentina, Veracruz, Colombia…; "Heredia" da Heredia, Costa Rica. Se piden 10 porque "San José" trae la de Costa Rica hasta el décimo lugar. Un toque elige y cierra.
   - **Fuera de México, la ciudad lleva su país** ("Córdoba, España"), para no juntarla con Córdoba, Veracruz. Las de México van sin país, como todas las que ya hay. La regla vive en `ciudadDelContexto`: vale igual para lugares y eventos cuando se abran.
   - Estados de la hoja: "Buscando…"; "No encontramos «…». Prueba con el país, como «San José, Costa Rica»."; y si Mapbox falla, "No se pudo buscar. Revisa tu conexión e intenta de nuevo."
   - El nombre se guarda igual que la ciudad de un lugar: el de Mapbox, unido a su área (Soledad → San Luis Potosí). "Mexico DF" llega de Mapbox como "Ciudad de México".
   - Editar ya guarda la ciudad. Antes no la tocaba: lo había decidido el agente de la 053, no el founder.
3. **"Ya está registrado" mira la ciudad.** La base ya lo decía: el mismo nombre no se repite en la misma ciudad. El formulario avisaba con cualquier ciudad. Ahora un "Abdiel El Andromeda" en Guadalajara no choca con el de San Luis Potosí.
4. **La ficha del artista dice de dónde es:** un renglón con el pin y la ciudad, como la dirección en la ficha de un lugar.
5. **"Quién" en el alta de evento.** Un artista nuevo escrito ahí se registra en la ciudad del evento. Si hay dos con el mismo nombre, se liga primero el de esa ciudad.

Sin migración: la columna ya existía.

## Decisiones mías para tu firma
- **Se busca por nombre, no con "Estoy aquí".** DEFINICION dice que la ubicación de la persona solo sirve para ordenar por cercanía.
- **Fuera de México, la ciudad lleva el país.** Sin él, se juntarían ciudades de países distintos.
- **El renglón va después de "Es"**: qué hace, qué es y de dónde es van juntos.
- **La hoja no lleva frase de ayuda**: el campo y la lista bastan.

## Lo que falta para lugares y eventos de cualquier país (pieza aparte, sin empezar)
- **Quitar el país** en las dos búsquedas del alta de lugar (`urlSugerir` en `buscarLugares.ts` y `urlGeocodificar` en `geocodificar.ts`). Las sugerencias por nombre deben reordenarse por distancia, como ya se hace con las direcciones.
- **La hora de los eventos (lo de verdad).** Toda la app lee y muestra las horas con el reloj de la Ciudad de México (`ZONA` en `lib/fechas.ts`). Afecta la hora, "Hoy/Mañana", cuándo se oculta un evento y el recordatorio de las 9:00:
  - Costa Rica tiene la misma hora todo el año, así que ahí saldría bien de casualidad;
  - España va 7 u 8 horas adelante, así que ahí todo saldría corrido.

  Pide guardar la zona de cada lugar o evento (migración) y usarla al leer y mostrar.
- **Ciudades con el mismo nombre en el mismo país** se juntan: tres Córdoba en Colombia; Guadalupe de Zacatecas y la de Nuevo León (esto ya pasa hoy).
- **Contexto de quien llega de fuera:** la app abre en San Luis Potosí. Se podría abrir en la ciudad aproximada de quien entra, sin pedir permiso ni guardarla. Es una decisión del founder: DEFINICION solo habla de la ubicación que se pide con un botón.

## Evidencia
- lint (un aviso viejo en `docs/diseno/logotipo/iconos-sn.mjs`, ajeno), typecheck, **211 pruebas** y build en verde. Hay 5 pruebas nuevas y 1 ampliada:
  - ciudades de Artistas a partir de los artistas;
  - URL de la búsqueda de ciudades, sin país y con 10;
  - la ciudad con país fuera de México;
  - lectura de la respuesta de Mapbox con formas reales medidas hoy: contexto, área, país sin repetir, las tres Córdoba;
  - no buscar con menos de 2 letras y decir el error;
  - la ciudad de Soledad en `validarArtista`.
- **Mirado en pantalla a 390×844**, con el build de la rama servido en local (`next start`, puerto 3107) y datos de producción, solo lectura. El `next dev` de otro chat impide levantar un segundo servidor de desarrollo: Next toma la carpeta principal como raíz.
  - La hoja del chip en Artistas dice lo de artistas, con "San Luis Potosí · 522 artistas" (coincide con "Todos 522"). La de la agenda sigue con lugares y "58 lugares · 85 eventos".
  - La ficha de Abdiel El Andromeda muestra "San Luis Potosí" con el pin, sobre la línea de fechas.
  - Alta con dos usuarios de prueba, creados y borrados al final (sin perfil ni artistas que quedaran):
    - el renglón Ciudad;
    - la hoja con San Luis Potosí marcada;
    - al elegir Guadalajara, el renglón y el campo que viaja al servidor dicen "Guadalajara";
    - con "Abdiel El Andromeda" en Guadalajara, el botón queda activo; al volver a San Luis Potosí, aparece "Ya está registrado" y el botón dice "ya está registrado";
    - ya sin límite de país: "Córdoba" da España, Argentina, Veracruz, Colombia, Venezuela…; al elegir la de España, el renglón dice "Córdoba, España"; "Heredia" da "Heredia, Costa Rica · Provincia de Heredia".
  - Consola sin errores. **No se publicó nada.**
- **Sin probar en pantalla:**
  - la edición (el usuario de prueba no puede editar fichas; usa el mismo formulario);
  - la hoja con el teclado del iPhone;
  - guardar de verdad (sería escribir en producción).

## Pregunta del founder, sin decidir: acciones al deslizar en los listados
Propuso Voy, Me interesa y calendario en eventos; Seguir y Cómo llegar en lugares; Seguir en artistas. Mi opinión, dada en el chat:
- **Sí como atajo, no como camino principal.** El gesto no se ve y no hay tutoriales. En Safari, deslizar desde el borde es "atrás", y un scroll en diagonal puede marcar sin querer. En la web del iPhone no hay vibración que lo confirme, y VoiceOver no puede usar ese gesto.
- **Primero, el renglón muestra tu estado** (vas, te interesa, sigues). Sin eso, después de deslizar no queda rastro (Evidencia).
- **Un solo atajo por lista, que se confirma con un toque:** Me interesa en la agenda; Seguir en Lugares y Artistas.
- **Voy se queda en la ficha:** es el pico del flujo, con la oferta del recordatorio. A mi calendario y Cómo llegar también: sacan de la app.
- Se ofreció un prototipo en la agenda para sentirlo en el iPhone antes de decidir.

## Firma pendiente
En el iPhone del founder:
- el chip y su hoja en Artistas;
- el renglón Ciudad en el alta y en la edición, con el teclado;
- la ficha.

Push y PR cuando el founder lo pida.
