# 380 · Prototipo: una cabecera distinta para exposición, taller y festival (oscura arriba o ficha oscura entera)

**Pieza:** OL-351. **Rama:** `prototipos-mapa-y-cabecera`, base `origin/main` (`04fd92bc`), después de OL-350. **Fecha:** 2026-10-08. **Operador:** Claude (agente del gestor V).
**Estado:** prototipo con las dos variantes y las tres clases (más «Hoy» para comparar), probado en Chrome de la Mac (390×844 y 320). **Sin código de la app y sin migración.** Falta que el founder elija.

## Qué pidió el founder (textual)

«La ficha de Exposición · Taller · Festival debe ser diferente, puede ser una versión Dark». El gestor le recomendó diferenciar la **cabecera** y no toda la pantalla (la app es de tema claro, `DEFINICION.md`: «Tema claro», y una ficha oscura completa duplica el sistema visual); él aceptó verlo en prototipo con las dos opciones.

## El prototipo

[`docs/rediseno/prototipos/cabecera-clases.html`](../../../rediseno/prototipos/cabecera-clases.html). Mismo armazón que `exposicion-festival-taller.html` (tokens de `globals.css`, Bricolage de Google Fonts, la tira oscura). En la tira, dos selectores: **variante** (A · Cabecera oscura, B · Ficha oscura completa, Hoy · como está) y **clase** (Festival · CINEMA, Exposición · MUNI, Taller · cianotipia). La barra se vuelve compacta al pasar la portada, como hoy.

Datos de producción (lectura pública de somosnosotros.org el 2026-10-08): «CINEMA: XV Festival de Cine México-Alemania» (11 actos, gratis, 7 sedes, del 29 de sep al 24 de oct; programa de los días 14, 16 y 17 de oct; sus siete sedes); «Esencialismo, exposición de Filippo Giusti» en el MUNI (hasta el mié 2 de dic, gratis, horario por confirmar, inauguración el vie 2 de oct a las 19:00); «Taller de cianotipia sobre papel: el símbolo como herramienta visual» en Foro lunaria (jue 8 de oct, 17:00, $50; la descripción dice «Cupo limitado»). **El taller es hoy un evento puntual de una sesión**: aquí se pinta como taller. Las portadas son dibujos de relleno (en la app es el cartel, con su texto encima, que pide más velo).

- **A · Cabecera oscura:** la portada a sangre (4:3, llena toda la celda aunque el título crezca), un velo que baja hasta el color de la banda (`#141414`), encima la etiqueta de la clase (el chip de hoy), el título a 26 px en 800 y la línea de la clase («Del 29 de sep al 24 de oct · Programa registrado: 11 actividades», «Hasta el mié 2 de dic · Horario por confirmar», «jue 8 de oct · 17:00 · Foro lunaria»); debajo, en la misma banda, los tres números de la clase en tarjetas translúcidas: festival **Actos · Costo · Sedes**, exposición **Hasta · Costo · Horario**, taller **Sesiones · Costo · Cupo**. Desde las acciones hacia abajo, el cuerpo claro de hoy sin cambios.
- **B · Ficha oscura completa:** la ficha de hoy (héroe 3:2 con el título a 19 px, números en el cuerpo, renglones, «Dónde», pastillas) con todos los tokens de color en oscuro. El violeta pasa a `#b69cf5` porque el `#6d34c8` da 2,6:1 sobre `#111`; las sombras se vuelven bordes. El mapa de «Dónde» se deja claro a propósito: es la imagen de Mapbox `light-v11`, y así se vería salvo que se pague otro estilo.
- **Hoy:** la ficha de hoy, para comparar.

## Qué cuesta cada una

**A — una piel de la cabecera:**
- `ui/Heroe` gana una opción (la clase o `banda`) y `Ficha.module.css` una variante del héroe (portada 4:3 estirada, velo hasta `--banda`, título a `--letra-2xl`, la meta visible) y un área de rejilla para los números bajo el héroe. Unas 40 líneas de CSS.
- `ui/Kpi` gana una piel `sobreBanda` (fondo, borde y gris translúcidos: tres declaraciones).
- Cuatro tokens nuevos en `globals.css`: `--banda`, `--sobre-banda`, `--sobre-banda-borde`, `--sobre-banda-suave`.
- `eventos/[id]/page.tsx`: con clase ≠ puntual, la etiqueta y la línea (`lineaDeExposicion`, `cuandoClase`) pasan al héroe y los `Kpis` a la banda. La barra compacta ya es oscura: no cambia. Nada más se duplica: renglones, hojas, mapa, pastillas y avisos son los de siempre.
- Desde 1048 (ficha de dos columnas: portada a la izquierda, título en tinta a la derecha) hace falta decidir dónde va la banda (propuesta: la columna derecha, título y números, sobre la banda). Un bloque en la media query que ya existe.
- `npm run medir`: unos nodos más en las fichas de festival y exposición (los números cambian de sitio, no de cantidad).

**B — un segundo tema para una parte de la app:**
- Un par oscuro para cada token de color: de las 137 propiedades de `globals.css`, unas 40 son colores (fondos, textos, borde, violeta y su suave, verde, rojo, naranja, vidrio, velos, siete sombras, asa, mandos). Un segundo violeta de marca para sobre negro.
- 23 colores escritos a mano en 6 módulos CSS que habría que pasar a tokens (de 116 módulos, 71 ya leen `--fondo`/`--texto`/`--borde` y seguirían solos).
- Las imágenes «sin foto» (`sin-foto.png`, `sin-foto-ancha.png`: el símbolo gris sobre claro) en versión oscura, y el mapa: el estático pediría otro estilo de Mapbox y el mapa a pantalla completa de OL-350 también (la cuenta del founder solo tiene `FLOWYA_Light`).
- Lo que se pinta por portal (`ui/Hoja`, las hojas de la ficha; el visor del cartel de `Cartel`; los avisos de `ui/Confirmacion`; `ui/ListaFlotante`) sale del ámbito del tema y quedaría claro sobre la ficha oscura salvo que cada portal herede el atributo.
- El color de la barra de estado del iPhone (`theme-color`) cambiaría por página, y al ir de Inicio (claro) a la ficha (oscura) y volver hay un salto de luz.
- Contradice «Tema claro» de `DEFINICION.md`; el founder tendría que cambiar esa regla.

## Recomendación: A

1. **Se distingue a la primera:** lo que se ve al abrir la ficha es la cabecera, casi la mitad de la pantalla; A la hace oscura, con el título grande y los números de la clase, y ningún evento puntual se ve así.
2. **Un solo sistema visual:** de las acciones hacia abajo todo es lo de siempre (los renglones, «Dónde», las hojas, las pastillas, el mapa). B obliga a mantener dos versiones de cada pieza, para siempre.
3. **Lo largo se lee mejor en claro:** el programa de un festival (11 actos en CINEMA) y la descripción ocupan casi toda la ficha; en B esa lectura va en gris sobre negro y el mapa claro deslumbra dentro de la tarjeta oscura (captura 09).
4. **El título sobre un cartel con texto** se lee mejor en A: el velo termina en negro sólido y no a medias.
5. **Cuesta una piel y cuatro tokens**, no un tema.

## Preguntas para que firme el founder

1. **¿A o B?** (o A con algo de B, p. ej. las pastillas oscuras).
2. **La línea bajo el título en A:** en la exposición repite lo que dicen los números («Hasta el mié 2 de dic · Horario por confirmar» junto a «Hasta» y «Horario»). ¿Se queda la línea de hoy o en la exposición y el taller pasa a decir dónde («MUNI Museo Universitario UASLP»)?
3. **El tercer número del taller:** «Cupo» no existe en el modelo (la cianotipia lo dice en su descripción). ¿Se agrega el dato (una migración que solo añade y un renglón en el alta) o el taller sigue con «Van» como hoy?
4. **En escritorio (desde 1048)**, ¿la banda oscura va detrás de la columna derecha (título y números) y la portada a la izquierda como hoy?

## Verificación

- Playwright con el Chrome de la Mac (`playwright-core` en el scratchpad, servido con `python3 -m http.server`): sin errores de página ni de consola, sin respuestas ≥ 400; Bricolage cargada.
- Las 9 combinaciones (A, B y Hoy por tres clases) sin desbordes a 390 ni a 320 y sin el título encima de los números. A 320 la primera pasada dejaba una costura clara bajo la portada (el título crecía más que la imagen) y luego una portada más ancha que la pantalla: la portada ahora se estira a la celda con su ancho al 100 %; medido a 390 y 320 en las tres clases (la portada y el bloque del título terminan en el mismo píxel).

## Capturas (`docs/rediseno/capturas-380/`, 390×844 a 2× salvo las de 320)

Cada una abierta y mirada:

- `01-a-festival.png`: A, CINEMA: el carrete de relleno a sangre, «FESTIVAL», el título en dos líneas a 26 px, la línea del programa y «Actos 11 · Costo Gratis · Sedes 7» en la banda; debajo, claro, las acciones y «Programa».
- `02-a-exposicion.png`: A, Esencialismo: «EXPOSICIÓN», «Hasta el mié 2 de dic · Horario por confirmar» y «Hasta mié 2 dic · Costo Gratis · Horario Por confirmar»; cuerpo claro con «Horario» e «Inauguración».
- `03-a-taller.png`: A, cianotipia: «TALLER», «jue 8 de oct · 17:00 · Foro lunaria», «Sesiones 1 · Costo $50 · Cupo Limitado»; «Sesiones» abajo y las pastillas «Me interesa» y «Voy».
- `04-b-festival.png`, `05-b-exposicion.png`, `06-b-taller.png`: B, las tres: la ficha de hoy en oscuro; la etiqueta en vidrio oscuro con violeta claro; acciones en círculos oscuros con borde.
- `07-a-festival-cuerpo.png`: A desplazada: la barra compacta oscura con el título (la de hoy) y el programa y «Dónde» en claro.
- `08-b-festival-cuerpo.png`: B desplazada: el programa en oscuro; el mapa estático claro dentro de la tarjeta oscura.
- `09-b-exposicion-donde.png`: B más abajo: «Horario», «Dónde» con el mapa claro que deslumbra y «Sobre el evento» en gris claro sobre negro.
- `10-hoy-festival.png`, `11-hoy-exposicion.png`, `12-hoy-taller.png`: la ficha de hoy de las tres, para comparar.
- `13-a-exposicion-320.png`, `14-a-festival-320.png`: A a 320: «Por confirmar» parte en dos líneas dentro de su tarjeta; la cuarta acción («Cartel») baja de fila, como hoy; sin costura bajo la portada.
