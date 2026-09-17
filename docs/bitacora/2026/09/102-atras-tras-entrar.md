# 102 · Atrás tras entrar con Apple o Google: el botón ya no sale del sitio; el atrás de Safari no se puede gobernar (OL-071)

**Fecha:** 2026-09-17 · **Rama:** `atras-tras-entrar`, desde `origin/main` a59d676 y al cerrar sobre 670f7fa (PR #97 y #98) (árbol de trabajo propio). Commit local, sin push, sin migración. · **Pedido del founder:** «Al entrar a mi cuenta usando google, me lleva a perfil, luego al seleccionar atrás me regresa a validación de identidad en google :(. Se rompe navegación, pensé que habíamos abordado en ajustes de "atrás coherente" cuestiona y propon soluciones». Alcance elegido por él: **A+B** (botón y gesto), coordinado con gestión de cambios (rama, números y condiciones).

## Causa (medida, no supuesta)

Antes de tocar nada se montó fuera del repo una cadena igual a la nuestra (`/entrar` → 303 al proveedor → POST de vuelta a `/auth/google` → relevo → `/auth/google/fin` → 303 al destino) y se midió en el navegador:

| paso | entradas del historial |
|---|---|
| en Entrar | 3 |
| en la pantalla del proveedor | 4 |
| ya en el destino | **5** |

1. **La vuelta entera deja una sola entrada.** El relevo (`paginaRelevo`, `src/lib/entrarCon.ts`) se reenvía con `document.forms[0].submit()` **antes de que el documento termine de cargar**, y entonces el navegador reemplaza su entrada en vez de apilarla; el 303 de `/fin` tampoco apila. Resultado: lo que queda pegado detrás del destino **es la pantalla del proveedor**.
2. **La marca mentía.** Al aterrizar, `document.referrer` es `https://somosnosotros.org/auth/google` — del mismo sitio —, así que `marcaDeLlegada` (`src/lib/historial.ts`) concluía «hay una pantalla mía detrás» y el botón Atrás usaba el historial: se iba al proveedor.

No es un caso nuevo: la bitácora [083](083-atras-coherente.md) lo dejó anotado en «Queda (para OL-055)» con estas palabras — *«al salir de la pantalla de error recargando, la entrada nueva cuenta con una pantalla detrás (el referente es la propia app). No se nota: la agenda no tiene Atrás»*. Con Apple y Google sí se nota, y es peor de lo que decía la nota: detrás no hay una pantalla nuestra mal contada, hay un sitio ajeno. Afecta igual a Apple y a Google. El código por correo **no** está afectado: nunca sale del sitio y termina con `useTerminar`.

## Qué se hizo

- **A — La marca dice la verdad al volver de fuera** (`src/lib/historial.ts`): un referente de una ruta técnica del propio sitio (`/auth/…`) ya no cuenta como pantalla de la app detrás. Sin esto, Atrás salía al proveedor; con esto, al menos va a la pantalla madre.
- **B — Se repone la pantalla de la que se vino** (`src/lib/historial.ts` + `src/components/Navegacion.tsx`): al aterrizar de un proveedor, la entrada que ocupa el destino pasa a ser la pantalla de origen y el destino se apila encima con el estado que Next.js ya le había puesto. Así queda una pantalla nuestra de por medio y Atrás vuelve a donde estaba la persona, en vez de a la pantalla madre.
  - La entrada repuesta no lleva la pantalla guardada de Next.js (`__NA`) porque no la tenemos, es de otra ruta. Su router, al volver a una entrada así, **recarga** — está escrito en `node_modules/next/dist/client/components/app-router.js` — y esa recarga es justo lo que queremos: la pantalla llega entera y `MemoriaScroll` repone la posición, como en cualquier recarga. Para que Next.js no le copie lo suyo al crearla, el estado lleva `_N`, que su envoltorio de `pushState`/`replaceState` respeta.
- **De dónde se vino** (`src/app/entrar/FormularioEntrar.tsx`): la pantalla de Entrar lo apunta en el almacén de la pestaña (`sessionStorage`) **al llegar**, no al tocar el botón — en el simulador se vio que un toque antes de que hidrate hace que Entrar se cargue entera; el toque también refresca la hora, porque el apunte caduca a los 10 minutos como el intento de entrar. El origen sale de la marca del historial (`somosnosotrosDesde`) y, si no la hay (carga completa, enlace compartido), del referente. Si no se sabe de dónde se vino, no se apunta nada y Atrás hace lo de siempre.
- **El apunte sirve una sola vez**, caduca a los 10 minutos, solo vale si la carga es la vuelta que esperaba, y su ruta pasa por `rutaSegura`: cualquier cosa que no sea una ruta del sitio se cambia por el inicio.
- Se decidió **no** tocar el servidor: ni `auth/[proveedor]/route.ts` ni `entrarCon.ts` ni la URL del destino. Al principio el origen iba a viajar en un parámetro (`?volver=`); el apunte en la pestaña toca menos y no ensucia la dirección. Aprobado por gestión de cambios.

## Lo que NO se pudo arreglar: el atrás de Safari

**En Safari de iPhone, el atrás del navegador (su flecha o el gesto) sigue yendo a la pantalla del proveedor.** No es que no se intentara:

- Con A+B puestos, la reposición **sí se ejecuta** en Safari: la traza dice `repuso=/lugares` y `history.length` pasa de 4 a 5, o sea que `pushState` **sí apila**.
- Y aun así la flecha de atrás salta esa entrada y aterriza en el proveedor, **sin pedir nada al servidor** (la restaura de su caché de páginas).
- Se probó también reponiendo después del evento `load`, por si era la heurística de «antes de cargar»: mismo resultado.
- **Conclusión medida: el atrás de Safari retrocede al documento anterior, no a la entrada anterior**, así que ninguna entrada que añada la página se interpone. En Chromium sí funciona: ahí el atrás cae en la pantalla de origen (medido a 390×844).

Lo que sí queda arreglado en Safari es **el botón Atrás de la app**, que es el caso que reportó el founder. El gesto solo se arregla no saliendo del sitio para entrar (OL-071 en «Después»).

## Verificación

- lint (0 errores; el aviso ajeno de siempre en `docs/diseno/logotipo/iconos-sn.mjs`), tipos, **379 pruebas** (8 nuevas de esta pieza) y build, con `origin/main` traído al cerrar (670f7fa; el único choque, la cabecera de `OPEN_LOOPS.md`, resuelto poniendo el trozo nuevo delante y la cadena de `main` detrás tal cual: 66 trozos, ninguno repetido).
- **Control negativo**, que pedía gestión de cambios: quitando el filtro de rutas técnicas fallan 2 pruebas; quitando la reposición falla la integradora. Y en la cadena montada fuera del repo, sin el arreglo, el atrás cae en el proveedor.
- Pruebas nuevas en `src/lib/historial.test.ts`: el relevo no cuenta como pantalla detrás (y `/authores` sí, para que el filtro no se pase de listo); el origen por referente; el apunte de un solo uso, caducado y para otra carga; **el apunte no puede mandar fuera del sitio** (`https://`, `http://`, `//`, `/\`, `javascript:`, y con espacios, tabuladores y saltos de línea delante); **sin almacén, con el almacén bloqueado (modo privado) o sin apunte, el historial se queda como estaba** y Atrás decide con la marca de siempre; la integradora sobre el historial de mentira, que reproduce el historial medido (proveedor detrás del destino).
- **Simulador FLOWYA iPhone SE, iOS 26.3, Safari, con el dedo** (`next dev` de la rama en su propio puerto, `.env.local` con todas las llaves vacías: sin tocar producción; el proveedor, un servidor de mentira en el scratchpad que hace lo mismo que Apple y Google — `form_post` con `state` —, porque las llaves reales no están en el árbol):
  - Lugares → Entrar → **Continuar con Apple** → «Verifica que eres tú» → Continuar → el destino → **botón Atrás → Lugares**, la pantalla desde la que se tocó Entrar. Antes, salía al proveedor. Captura hecha.
  - El mismo recorrido con **la flecha de atrás de Safari**: cae en el proveedor (lo de arriba).
  - Google se probó igual en el navegador integrado: mismo camino y mismo resultado (la mecánica es la misma; en local los dos proveedores van al mismo servidor de mentira).
- **Navegador integrado a 390×844**, con el mismo servidor: el recorrido entero con Google, `apunte: null` al llegar (se consumió), `desde: /lugares`, marca 1, `referente: …/auth/google`; **botón Atrás → Lugares** y **atrás del navegador → Lugares**.
- **El resto de la app, igual**: la pestaña "Lista" de Lugares sigue sin apilar (`history.length` no crece) y el atrás vuelve a la pantalla anterior real; una llegada por dirección directa sigue con marca 0.
- Los parches locales de prueba (proveedor de mentira, botones sin Supabase, destino sin sesión, trazas) se quitaron antes del commit; `git status` solo muestra los cuatro archivos de la pieza. `CLAUDE.md`, que Next 16.3 reescribe al correr `next dev`, quedó restaurado.

## Queda

- Revisión de gestión de cambios, push y PR cuando el founder lo pida.
- **Firma del founder en su iPhone**, sabiendo lo que hay: el botón Atrás arreglado, el atrás de Safari no.
- Decidir si quiere la pieza que lo arregla del todo (OL-071 en «Después»: entrar sin salir del sitio).
- Números: gestión de cambios había reservado la bitácora 100 y OL-069, pero al cerrar el script decía 102 y OL-071 (otros chats los tomaron mientras tanto); se toman los siguientes, como manda la regla 4.
