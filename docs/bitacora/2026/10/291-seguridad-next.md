# 291 · Next con parches de seguridad (OL-264 / H14)

**Fecha:** 2026-10-03. **Estado:** publicado y comprobado en producción (PR311 / `7eef8bc5`).

Reserva del Gestor de cambios III en PR310/39fd313f: rama `seguridad-next`,
base `39fd313f`, después del cierre documental PR309/d5b7365b de OL-263.
Worktree `/Users/apple-1/somosnosotros-seguridad-next`. Numeración comprobada:
291/OL264 libres. Sin subagentes. Continúa autorización del founder para publicar
entregas probadas y revisadas por el gestor. No se toca el checkout principal.

## Aviso identificado antes de cambiar dependencias

`npm audit` detectaba Next16.3.5 con aviso crítico
[GHSA-vcvr-r3jv-pc5j](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j).
Afecta16.2.0–16.3.5: ejecución remota en ImageResponse de `next/og` sobre Node si
recibe contenido SVG controlado por un atacante. Mínimo corregido16.3.6 según
[el release oficial](https://github.com/vercel/next.js/releases/tag/v16.3.6).
Búsqueda en src/scripts/config sin usos de `next/og`, `ImageResponse` ni
`@vercel/og`; actualización preventiva, sin afirmar explotación del proyecto.

Se elige16.3.8, último parche16.x del registro al comprobarlo, para incluir además
[las correcciones posteriores del release](https://github.com/vercel/next.js/releases/tag/v16.3.8).
Entre ellas está [GHSA-cjq9-62q9-8jv4 / CVE-2026-94483](https://github.com/vercel/next.js/security/advisories/GHSA-cjq9-62q9-8jv4),
SSRF del optimizador cuando el atacante controla DNS de un origen permitido.
El proyecto permite solo su host Supabase, sin redirecciones; no se amplía esa
lista. El advisory todavía mostraba `16.3.?`; el release16.3.8 identifica
expresamente el parche. No se confunde esa inconsistencia editorial con una
versión mínima publicada distinta.

## Cambio acotado

- `next` y `eslint-config-next`:16.3.5→16.3.8, conservando el rango16.x y lock exacto.
- Solo12 entradas de versiones cambian en el lock: ambos paquetes y la familia
  `@next` (env, plugin ESLint y binarios SWC). No se actualiza React/Vitest ni el
  package.json independiente de iOS; sin `npm audit fix` ni cambios mayores.
- Patrón `html-bots.js` comparado con16.3.5; se conserva el patrón y la adición
  Googlebot. Comentario de `next.config.ts` actualizado para dejar la revisión.
- Sin SQL, cambios de producto, Auth, Storage ni migraciones. Configuración de
  imágenes de OL-263 intacta (TTL30d,6anchos,q75,host/bucket restringidos).

## Verificación

Correctos:1822 unitarias/133archivos, tipos, build e inventario; lint0errores y
un aviso anterior (`page` sin usar en VisorImagen.componentes). Medir24 pantallas
por4anchos (96), sin novedades ni cambios de presupuesto. Suite completa de
componentes214/214 en110,01segundos reales (109753ms del runner). No se añaden
pruebas que solo repitan la versión instalada; se usan contratos y recorridos.

La primera suite completa encontró `process is not defined` al importar
Next/Image dentro del bundle esbuild de HojaLugares. Reproducido también con
Next16.3.5 en el worktree de OL263 (`hoja-antes.log`), fuera de las39 pruebas
seleccionadas entonces. La aplicación compilada pasa medir; falla el montaje de
pruebas sin entorno Next. Se detuvo esa ejecución al repetir el mismo timeout.
El gestor aceptó ampliar OL264 solo a los consumidores sin doble de Next/Image.
El grafo de imports, descontando dobles existentes, identifica dos:
HojaLugares.componentes y AgendaNuevos.componentes. Ambos reciben el mismo doble
img de las pruebas de layout; no cambia ninguna aserción ni componente de producto.
Imagen.componentes conserva Next/Image real para DPR, lazy y recuperación.
La suite completa214/214 posterior valida el arreglo. Gestor adelantó H12 (CI de
componentes) para ejecutar justo después de OL264.

Capturas locales390×844/DPR3 de Inicio, Agenda, ficha y Entrar revisadas completas:
carriles con carteles, filas de agenda con fotos56px, portada/KPIs/acciones de ficha
y formulario de correo visibles sin nueva alteración. Todas200 y sin pageerror.
El mapa de la ficha se bloqueó deliberadamente en este fixture; no se declara
validado aquí. Entrar local solo correo porque el fixture no configura proveedores.
La comprobación posterior confirmó que la preview oculta Apple/Google por la
política existente de dominios registrados; se comprobaron en producción sin
iniciar sesión. Googlebot recibe
título y canonical dentro de head (bots.json); patrón upstream idéntico16.3.5/8.

Evidencia persistente:
`/Users/apple-1/.codex/visualizations/2026/10/02/01a0fece-65fd-79e3-a64d-296a4b8fa13c/seguridad-next/`.
Revisión del gestor, CI y preview completadas; cierre detallado debajo.
No se crean cuentas, no se inicia sesión de producto ni se escriben datos reales.

`npm audit --omit=dev` devuelve0 vulnerabilidades. La auditoría completa deja0 críticos y ya no lista Next. Quedan8 entradas
(6 altas/2 moderadas) de herramientas de desarrollo: cadenas braces/brace-expansion
y Vitest/mocker. No se ocultan ni se aplican recomendaciones que bajarían Next a14
o subirían Vitest a5 fuera de este alcance. Se comunican al gestor.

Rollback: revertir la actualización de paquetes y reconstruir. No requiere
restaurar datos, pero devuelve una dependencia con el aviso crítico conocido;
no es el estado normal deseado.

## Publicación y cierre (2026-10-03, hora de México)

El gestor aceptó el candidato `4fb1462f6a1733956006bd4799a9dafe1e943065`
y cedió la ventana al quedar CI y preview correctas. PR [311](https://github.com/robscan/somosnosotros/pull/311)
unido en `7eef8bc570005edc38a9ff7d7044b9636ac63e7e`, a las 01:49:14 UTC del 4 de octubre.
CI del PR37168916332 **success antes del merge**; CI de main37169160909 también
success. Deployment Production6835582058 success sobre el mismo SHA.

Preview6835543402 sobre el candidato: Inicio, Agenda, ficha Susurros y Entrar
revisados completos a 390×844. La preview muestra correo y oculta proveedores por
la política de dominios de `botonesProveedor`; no es una regresión de esta pieza.
En `somosnosotros.org/entrar`, Apple, Google y correo visibles; enlaces Apple/Google
con retorno interno a Perfil. No se inicia sesión ni se envía código.

Comprobación del dominio real y capturas completas a 390×844:

- Inicio, Agenda y ficha Susurros responden 200 y muestran imágenes optimizadas.
  La ficha carga el mapa real; la ausencia deliberada del mapa en el fixture local
  no se usa como evidencia de producción.
- `/_next/image`: WebP de 192 px, 6942 bytes, dos respuestas HIT y
  `Cache-Control: public, max-age=2592000, must-revalidate` (30d).
- Cinco entradas no permitidas devuelven 400: dominio ajeno, otro bucket,
  query en el origen, ancho 193 y calidad 80.
- Googlebot recibe título y canonical en head en el dominio real.

Evidencia en la carpeta persistente indicada arriba: `preview-*.png`,
`produccion-*.png`, `produccion.json`, `bots-produccion.json` y `ci-pr311.log`.
Navegador automatizado Chrome; Safari físico sigue pendiente del founder.
Servidores y pestañas de prueba propios cerrados; sin SQL ni escrituras reales.

OL264/H14 resuelto. Siguiente pieza acordada: H12, suite de componentes en CI,
con reserva de rama/OL/bitácora a cargo del gestor antes de iniciar código.
Las ocho entradas de herramientas de desarrollo y el plan de Vercel sin confirmar
quedan comunicados; Supabase Pro sí fue confirmado por el founder. No se contrata
ni cambia ningún plan, y no se programa monitoreo automático.
