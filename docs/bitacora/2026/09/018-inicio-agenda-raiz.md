# 018 · Inicio como agenda raíz, shell nuevo (2026-09-14)

Rama `inicio-agenda`. Implementa el prototipo v2.2 del inicio ([02-inicio-flujo-y-estados.md](../../../rediseno/02-inicio-flujo-y-estados.md)) tras la firma del founder en lo esencial, con dos decisiones que llegaron durante la implementación: pantallas interiores con regreso a la izquierda y logotipo al centro, y agenda agrupada por día.

## Qué quedó

- **Shell.** `ui/Barra` con dos modos: raíz (SMSNSTRS a la izquierda, `Sesion` a la derecha: Entrar como acción primaria o solo el avatar) e interior (regreso a la izquierda, SMSNSTRS al centro). `NavInferior` fija con Agenda · Lugares · Artistas (icono y etiqueta; activo en color de texto y 700). `Publicar` flotante, oscuro, en la zona del pulgar, encima de la nav. Clase `.raiz` en `globals.css` con el tono de contenido (`--fondo-contenido`) y tokens de alturas (`--alto-barra`, `--alto-nav`, `--alto-cabecera-agenda`).
- **Agenda (`/`).** `AgendaInicio`: cabecera pegajosa con chip de fecha (es el campo nativo, filtra ese día) y chip de ciudad (hoja con las ciudades con eventos); pestañas de texto Todos · Cercanos · Siguiendo · Nuevos con línea indicadora y sin hueco con el contenido; grupos por día (Hoy, Mañana, "dom 22 de ago de 2027") con títulos pegajosos; renglón con foto a la izquierda (evento o lugar; sin foto, cuadro discreto), título e iconos de hora, lugar, asistentes ("1 va") y costo. Vacíos por causa: Cercanos pide la ubicación con un botón y explica que no se guarda; Siguiendo pide entrar o seguir; Nuevos dice "Nada nuevo esta semana". Lógica pura en `lib/agenda.ts` (agrupar por día, distancia por haversine, filtros) con pruebas.
- **Lugares (`/lugares`).** Lista · Mapa como dos vistas; el mapa ya no es raíz. `Mapa` admite `presentacion="caja"`. La búsqueda por nombre aparece a partir de 8 lugares. La ficha de lugar vuelve a `/lugares?lugar=…&vista=mapa`.
- **Artistas (`/artistas`).** Dice lo que va a ser y no se rellena; invita a publicar.
- **Borrado:** `Panel`, `Sheet`, `Pestanas`, `Agenda` (vieja) e `InstalarAviso` (el aviso de instalar pasa al flujo de "Voy", OL-008; Mi perfil ya explica cómo instalar).
- `fechas.ts`: `diaCorto`, `diaLargo`, `horaCorta`; `formatearCuando` los reutiliza.

## Verificación (390×844, servidor local, base real, usuario desechable borrado)

- Inicio sin sesión (Entrar en rojo) y con sesión (solo avatar); Lugares en lista y en mapa; Artistas; ficha de evento con la barra interior.
- Siguiendo con sesión y sin seguir a nadie muestra su vacío.
- Lint, typecheck, 56 pruebas y build en verde. Sin errores en consola.

## Fuera de este PR

Consentimiento de avisos por canal y hoja de instalar tras el "Voy" (OL-008). Diseño propio de Lugares, ficha de evento y Artistas.
