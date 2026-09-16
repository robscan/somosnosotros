# 046 · Líneas del skeleton, hoja de borrado, pasada de maquetación e icono de la app

**Fecha:** 2026-09-16 (mediodía) · **Base:** cuatro observaciones del founder tras la bitácora 045 · **PR:** por abrir (junto con 045).

## Lo que pidió el founder
1. Al cargar una sección se ven líneas flotando, como divisiones que se quedaron ahí (los skeletons y el "Cargando…" sí gustan).
2. Otra pasada de maquetación: sobreanidaciones y objetos basura; pulir y simplificar todas las composiciones.
3. La confirmación de borrado en hoja con la composición del estado vacío de `/borrado`: icono, textos centrados y los dos botones de siempre.
4. El icono de la app se ve con degradado y un borde con relieve; lo quiere plano, plasta negra.

## Qué se hizo
- **Skeleton sin rayas** (`ui/Cargando.module.css`). La espera de las pantallas raíz dibujaba un divisor bajo cada renglón y otro bajo la cabecera; con los bloques tan pálidos, las rayas parecían líneas sueltas. Fuera los divisores; se quedan los bloques que laten y el "Cargando…".
- **Hoja de borrado** (`components/Borrar`). "Borrar el evento / el lugar / la ficha / mi cuenta" ya no abre una caja gris dentro del menú: abre una hoja con el icono de lo que se borra (calendario, pin, estrella, persona), "¿Borrar el evento?", qué se pierde y "No se puede deshacer.", centrados, y debajo **Sí, borrar** (rojo) y **Cancelar** como estaban. Los cuatro usos pasan `icono`.
- **Pasada de maquetación** (informe de 40 hallazgos de un agente de solo lectura; se aplicaron 27, los claros):
  - Hojas: `ui/Hoja` dibuja el asa con `::before` (ya no hay un div vacío) y estiliza el título y su texto de apoyo como hijos directos (`:where(.hoja) > h3`, `> h3 + p`, sin especificidad). La hoja de ciudades de la agenda y la hoja "Instala Somos Nosotros" ya no traen su propia copia del fondo, la hoja, el asa y la ✕: usan `ui/Hoja`. "Dónde está", "Dónde es" y "Perfil" dejaron sus `.titulo` propios.
  - Renglones con grid y áreas en vez de envoltorios: los pasos de "Instalar" (glifo | número, qué, dónde, muestra), "Después", el estado "✓ Voy / Me interesa / Sigues" (icono | texto, nota), "Publicado. Ya está en…" (título, texto | botón), el interruptor "Solo yo lo veo" y el de "Reservado". El texto suelto ocupa la celda libre del grid (comentado en el CSS).
  - Fuera los envoltorios sin función: `<span />` de la barra del alta (ahora `.alta` coloca logotipo y ✕ por columna), `<span key>` de "Ya está registrado" (Fragment), `<span className={canon.opciones}>` con un solo botón en Publicar evento, Registrar artista y Editar perfil (`.accionIcono` ya lleva `grid-area: accion`), `<div className={styles.dia}>` en la ficha de persona y en Seguidos (la clase va en el `h3`), `<section>` dentro de `<section>` en Artistas.
  - CSS repetido a un solo sitio: `Lista.module.css` (conteo, vacío y registrar de Lugares y Artistas), `ui/FichaLista.module.css` (nota, lista por día y publicar de la ficha de lugar y la de artista, antes dos módulos idénticos), `.ubicame` de las hojas de mapa en `Mapa.module.css`, el campo con lupa de "Dónde está" es `canon.campo`, la palanca de "Reservado" es la de Ajustes.
  - Basura: `ficha.primariaChico` (clase inexistente, pintaba `undefined`), `.voyChico`, `--acento`, `--acento-texto`, `--sombra-suave`, `.detalle` del admin; los divisores de los resultados del mapa ya no pisan el borde de la caja (`li + li`).
  - Medido en la ficha de evento tras la pasada: 64 nodos dentro de `main`, profundidad 4, un solo `span` sin clase (el resumen de "Quién va").
- **Icono de la app: es iOS 26, no el archivo.** `apple-touch-icon.png` es plano: hueso `#F6F5F1` y tinta `#1A1A1A`, sin degradado ni borde (medido píxel a píxel). El degradado y el relieve que se ven en la pantalla de inicio los pone iOS 26 ("Liquid Glass") a todos los iconos, también a los de las apps web, y no hay forma de pedirle que no lo haga desde el manifiesto ni desde `apple-touch-icon`. Lo único que cambiaría algo es que el founder elija el estilo de iconos "Claro/Oscuro" en Personalizar (mantener presionada la pantalla de inicio › Editar › Personalizar); "Tintado" o "Transparente" acentúan el vidrio. No se tocó el archivo.

## Segunda vuelta (misma tarde, "Aceptado, ejecuta")
- **Botón con enlace** (`ui/Boton`). Con `href` pinta un enlace con el mismo dibujo. Registrar un lugar, Registrar un artista, Registrar a «…», Publicar un evento aquí, Publicar una fecha y Ver más ya son `Boton` secundario: se fueron `.registrar`, `.publicar` y `.verMas` como dibujos propios (el borde pasa de tinta a `--borde`, el del botón secundario de la app).
- **Renglón de sugerencia común** (`ui/Sugerencia.module.css`): la caja con borde y el renglón icono o foto | nombre / detalle, con variantes con foto (40 px), con miniatura redonda (28 px) y sin icono. Lo usan el alta de lugar, Dónde está, Dónde es (lugares y atajos), Quién (artistas y "Crear a") y los resultados del mapa de Lugares; cada uno conserva solo lo suyo (la sombra, el margen, las miniaturas especiales). En Quién el nombre pasa a negrita como en los demás.
- Evidencia: lint, typecheck y 145 pruebas en verde; capturas a 390 de Dónde es, Quién con "banda" (dos artistas y Crear a), resultados del mapa con "casa", Ver más en Artistas y Publicar una fecha en la ficha de artista.

## Lo que queda de la pasada (va en un PR aparte, con captura de la agenda para firmar)
- Tres tiras de pestañas con el mismo dibujo (agenda, Lugares, ficha de persona): un `ui/Pestanas`.
- Los chips de la cabecera de la agenda sobre el CSS de `ui/Chip`.
- No se toca: `.sobreMapa > *` / `> div` en el mapa de Lugares (funciona y no se ve; solo si se vuelve a tocar esa pantalla).

## Evidencia
- lint, typecheck y 145 pruebas en verde; el buscador de clases muertas ya no encuentra ninguna real.
- Navegador integrado (390 de ancho): skeleton raíz sin rayas; hoja "¿Borrar mi cuenta?" con icono, textos centrados y los dos botones (usuario desechable, sin confirmar, borrado al final); hoja "Instalar" con los pasos planos; ficha de evento con "Publicado." en grid; fichas de lugar y artista con el módulo común; ✓ Voy con el grid nuevo.

## Firma
Firmado por el founder en el iPhone (2026-09-16, tarde): "Te firmo todo".
