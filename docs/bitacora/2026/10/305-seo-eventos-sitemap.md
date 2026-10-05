# 305 · URL de eventos y errores del sitemap

**Fecha:** 4 de octubre de 2026. **OL:** OL-278. **Rama:** `seo-eventos-sitemap`.
**Operador:** Codex. **Worktree:** `.claude/worktrees/seo-eventos-sitemap`.
**Base inicial:** `a5ad0838d4de06fa79f6fb9161edb918abc24d46`; conciliada con `origin/main` en `90f136b4d74ce5af746051f927270c8fee5c4bbe` antes de los controles del candidato.

## Autorización y límites

El founder pidió entregar al gestor la auditoría SEO, guardarla con las investigaciones, presentar un plan y empezar únicamente con su luz verde. Gestor de cambios III autorizó D0 / OL-277 y A / OL-278. D0 se entregó en `f73fca03`, rama `investigacion-seo`, cuatro archivos; el gestor la aceptó y la mantiene congelada para publicación en su canal.

A empieza después de entregar D0: rama propia desde `origin/main`, bit305; A1 solo pasa el slug existente a `jsonLdEvento`. A2 responde con error 5xx si falla cualquiera de las cuatro consultas y conserva las páginas generales si no hay cliente configurado. Archivos reservados: ficha de eventos, `lib/eventos.test.ts`, `app/sitemap.ts`, `lib/sitemap.ts`, `lib/sitemap.test.ts` y documentación propia OL-278/bit305. El gestor amplió expresamente **solo pruebas** a `app/eventos/[id]/page.test.ts`, porque una regresión del serializador no detectaría volver a omitir el argumento en la página real.

El script comprobó bit305 libre. OL-278 ya aparecía reservado al comprobar todas las ramas; no se tomó otro número. Sin ayudantes, topes/paginación, nuevos datos estructurados, UI, datos reales, SQL, cuentas/DNS, analítica ni publicación. B se presenta como propuesta técnica después de cerrar A; C/D siguen pendientes.

## Cambios y regresión

- **A1:** una línea `slug: e.slug` en la llamada de la ficha. Event.url queda igual que canonical; la redirección permanente de UUID y las guardas de dirección pública no cambian.
- **A2:** después de las cuatro consultas, cualquier `error` provoca una excepción genérica antes de serializar. No se produce un sitemap parcial exitoso. Sin cliente se devuelve el respaldo existente; un catálogo vacío válido sigue siendo una respuesta correcta. Se precisó el comentario de topes sin cambiar consultas ni introducir paginación.
- Pruebas del sitemap llaman a la ruta real con cliente simulado: éxito, vacío, ausencia de cliente y cada consulta fallando por separado, con y sin datos parciales. No se añadió un helper de producto para poder probarlo; `lib/sitemap.ts` permanece intacto.
- Prueba de la página real compara Event.url y canonical. Se conserva la prueba de redirección y se añade un evento activo reservado cuya sesión recibe dirección privada autorizada: la ficha puede mostrarla a esa sesión, pero los datos estructurados no emiten Event ni contienen esa dirección. Prueba del serializador verifica slug y respaldo UUID.

**Reproducción previa:** 9 fallos y 81 pruebas correctas en los tres archivos focalizados: 8 rechazos ausentes del sitemap y 1 diferencia UUID/slug en la página. El nuevo caso reservado y el contrato del serializador ya pasaban antes. **Después:** 90/90 correctas; la regresión cambia de rojo a verde por los arreglos, no por debilitar aserciones.

## Comprobaciones del candidato local

| Comprobación | Resultado |
| --- | --- |
| Focalizadas | 90/90 en tres archivos, 1,37 s |
| Unitarias completas | 1.902/1.902, 137 archivos, 10,82 s, sobre base `90f136b4` |
| Tipos | `next typegen` y TypeScript correctos |
| Lint | 0 errores; aviso previo de variable `page` en VisorImagen.componentes:171, fuera de alcance |
| Build | Correcto contra respaldo local sintético; `/sitemap.xml` dinámica |
| Inventario CSS | Sin novedades, presupuestos y producto visual intactos |

Se comprobó la aplicación compilada con el respaldo inventado existente y un proxy temporal local de errores, sin variables reales, cuentas o servicios de producción. Nueve observaciones HTTP:

| Caso | Resultado |
| --- | --- |
| Todas las consultas correctas | HTTP 200, XML completo, 35 URL del fixture |
| Falla de lugares | HTTP 500, sin XML parcial |
| Falla de eventos | HTTP 500, sin XML parcial |
| Falla de artistas | HTTP 500, sin XML parcial |
| Falla de artistas_cuentas | HTTP 500, sin XML parcial |
| Backend recuperado | HTTP 200, mismas 35 URL |
| Evento público, agente humano | HTTP 200; Event.url igual a canonical con slug |
| Mismo evento, Googlebot | HTTP 200; misma igualdad en HTML |
| Enlace antiguo UUID con `nuevo=si` | HTTP 308 al slug, parámetro conservado |

Los 35 enlaces son datos sintéticos y no se comparan con las 891 URL observadas en producción durante la auditoría. El respaldo sin cliente está cubierto por la prueba unitaria de la ruta; no se presenta como el caso del build configurado. No cambió UI: no corresponde una aprobación visual nueva ni prueba física de Safari por este delta. La CI del PR deberá ejecutar también sus comprobaciones de SQL, componentes y medición existentes, sin saltarlas.

## Actualización de datos del festival por el gestor

El gestor precisó al aceptar D0 que corrigió **dos** eventos con autorización del founder: «Apertura: Juana» y «El diablo fuma…». El primero tenía «Bicenteario»; el segundo, una `т` cirílica en «Bicenтenario». Ambos apuntan ahora al CC200. Se registra su intervención, no como cambio de este operador ni como permiso para editar otros registros. La lectura pública propia comprobó que Apertura ya emite Event con dirección pública del CC200; su URL UUID era todavía la versión anterior al arreglo A1.

## Entrega

Candidato local para PR sin unir, con base conciliada, SHA, CI completa y vista previa. Sin migraciones ni variables nuevas. El gestor revisa y publica con el permiso aplicable del founder; esta pieza no promete aumento de ranking o tráfico. El informe D0 y las propuestas posteriores conservan su estado separado.
