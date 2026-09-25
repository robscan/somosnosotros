# 231 · Auditoría del shell en el iPhone y propuesta de barras nativas (OL-202)

**2026-09-25.** Fase 1 de la adaptación del shell a iPhone nativo: solo auditoría, documento y prototipo — **sin
código de la app**. Operador nuevo (Sonnet), rama `shell-ios`, base `origin/main` del día. Sin subagentes, council
ni workflows.

## Qué leí

- `CLAUDE.md` completo.
- `docs/rediseno/47-app-ios.md` (el plan de la app en las tiendas: por qué Capacitor en iOS, permisos, avisos,
  enlaces profundos, guías de Apple citadas).
- La bitácora [228](228-app-ios-capacitor.md) **en la rama `app-ios-capacitor`** (no en `main`): el envoltorio
  Capacitor de OL-194, su `capacitor.config.ts` (`appendUserAgent: "SomosNosotrosApp"`, `allowNavigation`), el
  plugin `EntrarSistemaPlugin.swift` (cómo intercepta `shouldOverrideLoad` y usa `ASWebAuthenticationSession`), y
  las correcciones del gestor sobre el PR #234 (sin unir todavía).
- `docs/ops/OPEN_LOOPS.md`: la reserva de OL-202/231 y las decisiones «Decidido» de memoria de pantalla
  (2026-09-15/OL-021), filtrar no es navegar (2026-09-17/OL-050), color primario violeta `#6d34c8` (2026-09-23),
  iconos en las acciones de fichas (2026-09-16/OL-046).
- `docs/diseno/LINEA_GRAFICA.md`: Bricolage Grotesque, el violeta, las tres franjas del shell, el regreso como
  píldora.
- El shell actual en el código: `src/components/NavInferior.tsx` (+ `.module.css`), `src/components/ui/Cabecera.tsx`,
  `src/components/ui/Barra.tsx` (+ `.module.css`, las tres variantes: raíz, interior, alta), `src/components/ui/Atras.tsx`
  y `src/components/Navegacion.tsx` (la marca propia del historial, `lib/historial.ts`), `src/components/ui/Hoja.tsx`,
  `src/components/ui/EntradaFicha.tsx`, `src/app/template.tsx` (fundido entre secciones), `src/components/ui/CargandoRaiz.tsx`
  y `SimboloCargando.tsx`, `src/components/ui/Ficha.module.css` (acciones secundarias, barra pegajosa), `src/components/ui/CompartirFicha.tsx`.
- `globals.css`: tokens de espacio, `--alto-nav`, `--alto-barra`, el `font-size: max(16px, …)` de campos, el
  `html, body { background: var(--fondo) }`.

## Fase A — Auditoría en el simulador

Dos simuladores propios, creados con `xcrun simctl create` para no chocar con otro chat: `OL-202 iPhone 17 Pro`
(iOS 26.3) y `OL-202 iPhone SE` (3ª generación, sin muesca, botón de inicio). La app se compiló desde un árbol de
trabajo aparte, fuera del repo (`git worktree add <scratchpad>/app origin/app-ios-capacitor`), sin tocar el
worktree de esta pieza: `apps/ios` tiene su propio `package.json` con `@capacitor/cli`; hizo falta
`npm install --no-save typescript@5.6` ahí (Capacitor 8 ya no trae su propio cargador de `.ts` con TypeScript 7 en
Node 22, ver el error `no longer provides the compiler API`) — **`--no-save`, comprobado con `git status --short
package.json package-lock.json` que quedó limpio**, y `npx cap sync ios` antes de `xcodebuild`. Build verde con
`xcodebuild -scheme App -configuration Debug CODE_SIGNING_ALLOWED=NO`. Instalación y capturas con `xcrun simctl
install`/`io screenshot` (nunca la pantalla de la Mac); la navegación dentro de la app se hizo con el simulador
adjunto (tap/swipe/long-press por coordenadas), comprobando cada paso con una captura antes del siguiente.

**Disco lleno a media auditoría:** el volumen de la Mac llegó a quedarse en ~300 MB libres (compartido con otras
sesiones); `xcrun simctl delete unavailable` (borra solo simuladores de runtimes que ya no existen, no toca
dispositivos de otro chat) liberó espacio sin arriesgar el trabajo de nadie más. No se tocó ningún simulador ajeno.

**Sin sesión, a propósito:** Ajustes y el alta de evento piden entrar; sin credenciales (regla del encargo), se
auditó el portón «Entra para publicar» / «Entrar» en su lugar, que comparte exactamente el mismo patrón de barra
(`.pagina` + `ui/Barra` con `volver`) que las 8 pantallas reales de alta/edición — así que lo que se ve ahí (el
problema 1) es el mismo problema que tendría el alta de evento de verdad.

### Las 22 capturas, descritas

Todas en [`docs/rediseno/capturas-231/`](../../../rediseno/capturas-231/), abiertas una por una:

1. **`01-inicio-pro.png`** — Inicio, sin sesión: SMSNSTRS y «Entrar» arriba, chip de ciudad y lupa, tarjeta «Sigue
   lugares y artistas», el carril «Destacados esta semana» con la foto del IPBA, botón flotante «Publicar evento»
   y la nav inferior con Inicio activo. Carga la web real de producción dentro del `WKWebView`. Sin doble barra,
   sin hueco raro arriba.
2. **`02-agenda-pro.png`** — Agenda tras tocar la pestaña: pestañas «Todos · Siguiendo», «Hoy · 15», renglones de
   evento con hora, lugar, «1 va», precio y el botón «+» redondo. La cabecera compacta.
3. **`03-ficha-evento-pro.png`** — Ficha de «El rey sin traje»: barra interior «‹ Atrás · SMSNSTRS · ···», foto,
   título, renglones con icono (hora, lugar con dirección, «Nadie ha dicho que va todavía», precio), mapa
   estático abajo y la barra pegajosa «☆ Me interesa · ✓ Voy». Zona segura respetada arriba y abajo.
4. **`04-hoja-menu-pro.png`** — Tras tocar «···»: hoja con un solo renglón, «Reportar», fondo oscurecido detrás.
5. **`05-lugares-mapa-pro.png`** — Lugares › Mapa: pestañas por tipo («Todos 59 · Casa de cultura 16 · Museo 13 ·
   Foro 9»), el mapa de Mapbox cargado con los pines (tamaño y color según haya evento esta semana, sin doble
   círculo), «Ver en lista» y «Registrar lugar» flotantes, botón de ubicación. El mapa responde al tacto (pellizco,
   arrastre) dentro del `WKWebView` sin fricción notoria.
6. **`06-ficha-lugar-pro.png`** — Ficha de «Casa de Cultura del Barrio de San Miguelito»: mismo patrón de barra
   interior, dirección, «Nadie lo sigue todavía», «Próximo: mar 29 de sep · 19:30 · ver», mapa y «+ Seguir».
7. **`07-seleccion-texto-pro.png`** — Mantener el dedo sobre «Cultura» en el título saca el menú nativo de iOS
   **«Copy · Look Up · Translate»** con la selección azul y las asas de arrastre. Es contenido de la app, no un
   campo editable: se siente a navegador, no a app (problema 4 del informe).
8. **`08-artistas-pro.png`** — Artistas: 581 en total, índice alfabético lateral (#, A, B, C…), renglones con
   avatar redondo, disciplina y tipo, botón «Registrar artista» flotante.
9. **`09-ficha-artista-pro.png`** — Ficha de «Abdiel El Andromeda»: avatar con el círculo «Compartir» sobre la
   esquina, enlaces (Facebook, Instagram, YouTube) como círculos de 56 px con etiqueta, «Se presenta en» con
   «Publicar una fecha», «+ Seguir» abajo.
10. **`10-hoja-compartir-pro.png`** — Hoja «Compartir»: título fijo arriba, «Cualquiera con el enlace ve esta
    ficha», QR grande, campo con el enlace corto y «Copiar», «Descargar QR» / «Descargar letrero», botón
    «Compartir» (el `navigator.share` nativo no abrió nada visible en el simulador — comportamiento normal cuando
    no hay app instalada que registre el share sheet en ese entorno, no se investigó más a fondo por ser un detalle
    menor).
11. **`11-hoja-ciudad-pro.png`** — Hoja «Dónde»: «San Luis Potosí · 59 lugares · 54 eventos» y «Ciudad de México ·
    2 eventos».
12. **`12-entrar-doble-padding-pro.png`** — «Entrar»: hueco vacío notorio entre la barra de estado y la barra
    «‹ Atrás · SMSNSTRS», más grande que en las fichas (problema 2 del informe; comparar con la captura 3, sin
    ese hueco).
13. **`13-teclado-barra-tapada-pro.png`** — El mismo «Entrar», con el teclado abierto sobre el campo de correo: **el
    logotipo y «Atrás» quedan encimados con la hora y el indicador de red**, prueba directa del problema 1 (el
    más grave de la auditoría).
14. **`14-esqueleto-carga-pro.png`** — Relanzando la app en frío y tocando Inicio de inmediato: los bloques grises
    del esqueleto de carga del carril de Destacados (`ui/Esqueleto`), con «Publicar evento» y la nav ya pintados.
    El cargador con el símbolo SN (`CargandoRaiz`) no se alcanzó a fotografiar: la red del simulador resuelve la
    ruta raíz en el mismo fotograma (mismo límite que documentó OL-194 al no poder cortar la red del Mac sin
    afectar a otro chat).
15. **`15-inicio-se.png`** — Inicio en el iPhone SE: sin muesca ni isla dinámica, «Operador» arriba a la izquierda
    del reloj (normal de iOS sin app de operador simulada), las tres franjas del shell igual de limpias.
16. **`16-ficha-evento-se.png`** — Misma ficha de «El rey sin traje» en el SE: la barra «Voy» pegada al borde de
    verdad (sin indicador de inicio que reservar). Sin problemas.
17. **`17-aviso-salir-pro.png`** — Tocar «Instagram» en la ficha de Abdiel abre primero el aviso propio de la web:
    «Vas a salir de Somos Nosotros» / «instagram.com» / «Ese sitio no es de Somos Nosotros: tiene sus propias
    reglas», con «Continuar», «Quedarme aquí» y «No volver a avisarme».
18. **`18-enlace-externo-safari-pro.png`** — Tras tocar «Continuar»: **Safari completo** (no una hoja dentro de la
    app) cargando instagram.com, con «‹ Somos Nosotros» arriba a la izquierda para volver — ese botón de vuelta lo
    pone el propio iOS, no la app.
19. **`19-prototipo-inicio.png`**, **20. `20-prototipo-ficha-artista.png`**, **21. `21-prototipo-alta-evento.png`**,
    **22. `22-prototipo-completo.png`** — el prototipo de la Fase C, descritas en esa sección.

Resumen de lo que se ve bien sin necesidad de captura aparte: el gesto de deslizar desde el borde izquierdo para
volver **no hizo nada** al probarlo dentro de una ficha (comprobado en el código de la rama `app-ios-capacitor`:
`@capacitor/ios` nunca activa `allowsBackForwardNavigationGestures`, que Apple trae apagado por omisión en
`WKWebView`); las transiciones entre pestañas (fundido 200 ms) no mostraron doble barra; los campos de formulario
ya usan `font-size: max(16px, …)` así que no hay zoom automático al enfocarlos (visible en la propia captura 13:
el texto no cambia de tamaño); `Info.plist` permite orientación portrait y landscape (plantilla de Capacitor sin
restringir) pero no se pudo forzar el giro en este entorno sin interfaz gráfica del Simulator — queda anotado en
el doc 48 como algo a decidir, no como algo visto roto.

## Fase B — Propuesta

Documento completo: [`docs/rediseno/48-shell-ios.md`](../../../rediseno/48-shell-ios.md). Resumen de las cinco
recomendaciones:

1. **Barra de pestañas → nativa** (`UITabBarController`). Conserva memoria de pantalla y «tocar la activa sube
   arriba» a través de un plugin propio que avisa a la web y viceversa (mismo mecanismo `notifyListeners` de
   Capacitor que ya usa `EntrarSistemaPlugin.swift`).
2. **Barra de navegación → se queda web, por ahora.** El «Atrás» de hoy consulta una marca propia del historial
   (`lib/historial.ts`) que un `UINavigationBar` nativo no puede replicar sin duplicar esa lógica en Swift; se deja
   para una segunda vuelta.
3. **Acciones de ficha (Voy/Seguir/Compartir) → se quedan web.** Ya resuelven en CSS/React reglas finas (estado
   marcado, reparto por intención) que no ganan nada en `UIToolbar`.
4. **Hojas → se quedan web.** `ui/Hoja.tsx` ya iguala lo que da `UISheetPresentationController` (asa, altura,
   teclado) sin nada roto en la auditoría.
5. **Arreglos CSS activados solo en la app** (clase en `<html>` cuando `Capacitor.isNativePlatform()`):
   `-webkit-touch-callout`/`-webkit-user-select` contra el menú de selección (problema 4), y
   `-webkit-tap-highlight-color` en los enlaces de texto que aún no lo tienen. El hueco doble (problemas 1 y 2) es
   en realidad un bug de CSS de `.pagina` + `Barra.interior` duplicando `env(safe-area-inset-top)`, que también
   existe en la web instalada del iPhone (no es exclusivo del envoltorio) — se deja para una pieza propia, chica.

El puente web↔nativo (sección 4 del doc) y el orden de piezas de código (sección 6) están detallados ahí; no se
repiten aquí.

## Fase C — Prototipo

[`docs/rediseno/prototipos/shell-ios.html`](../../../rediseno/prototipos/shell-ios.html): HTML estático
autocontenido (Bricolage Grotesque de Google Fonts, las tres capturas reales incrustadas en base64, sin
dependencias sueltas), tres filas a 390×844 con «hoy» (la captura real) y «propuesta» (la misma captura con las
barras nativas dibujadas encima, en tipografía del sistema para distinguirlas de la web) para Inicio, la ficha de
Abdiel El Andromeda y el alta de evento. Capturado con Chrome real (no el navegador de esta sesión) vía
`playwright-core` instalado en el scratchpad (`npm install playwright-core`, sin tocar `package.json` del repo),
esperando `document.fonts.ready` antes de cada captura para que Bricolage Grotesque ya esté cargada (evita el
error de la fuente que faltó otras veces, memoria «Captura de PNG real»).

- **`19-prototipo-inicio.png`** — Los dos iPhone de Inicio lado a lado: a la derecha, la nav inferior reconstruida
  como barra de pestañas con vidrio traslúcido e iconos de trazo (casa, calendario, pin, estrella), «Inicio» en
  violeta activo.
- **`20-prototipo-ficha-artista.png`** — A la derecha, una barra de navegación con «‹ Artistas» en violeta, el
  título centrado «Abdiel El Andromeda» en tipografía del sistema y un icono de compartir a la derecha, también en
  violeta (el tinte de acento de la app en un control nativo).
- **`21-prototipo-alta-evento.png`** — El más útil de los tres: a la izquierda, la captura real con un recuadro
  rojo punteado marcando dónde se encima el logotipo con la hora («se tapa con el teclado»); a la derecha, la
  misma pantalla con una barra nativa de formulario («Cancelar · Nuevo evento · Publicar») que ya no choca con la
  zona segura —porque la resuelve UIKit, no la web— aunque el teclado esté abierto.
- **`22-prototipo-completo.png`** — Las tres filas juntas con la introducción y la leyenda de colores (Bricolage
  vs. tipografía del sistema vs. lo que se rompe hoy).

## Verificación

Esta pieza no toca código de la app: `git status --short` en la rama `shell-ios` solo muestra
`docs/rediseno/48-shell-ios.md`, `docs/rediseno/capturas-231/` y `docs/rediseno/prototipos/shell-ios.html` — sin
`npm run lint/typecheck/test/build` porque no hay nada que compilar. En el árbol de trabajo aparte donde se
compiló la app (`app-ios-capacitor`, sin comitear nada ahí), el build de Xcode quedó verde
(`xcodebuild … BUILD SUCCEEDED`) antes de empezar el recorrido.

## Qué queda

- La firma del founder sobre el doc 48 antes de tocar código nativo.
- El arreglo del hueco doble de zona segura (`.pagina` + `Barra.interior`) es una pieza chica y aparte, no de
  shell — se puede pedir en cuanto el founder la priorice.
- El orden de piezas de código de la sección 6 del doc 48, cada una con su propia prueba y captura.
- No probado por falta de sesión: el alta de evento real y Ajustes/Perfil con datos de una cuenta (se auditó el
  portón «Entrar», que comparte el mismo patrón de barra).
- No se pudo forzar la orientación horizontal en este entorno (sin interfaz gráfica del Simulator); queda como
  pregunta abierta en el doc 48, no como hallazgo.
