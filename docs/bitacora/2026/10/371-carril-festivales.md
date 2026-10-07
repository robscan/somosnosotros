# 371 · Carril «Festivales y exposiciones» en Inicio

**Pieza:** OL-342. **Rama:** `carril-festivales`, desde `origin/main` (`456a0ef9`). **Fecha:** 2026-10-07. **Operador:** Claude (agente del gestor IV). **Sin migraciones.**
**Manda:** decisión del founder del 2026-10-07, «Necesitamos un slider para festivales y galerías»; el gestor le recomendó uno solo, con las dos cosas juntas, y aceptó. Contexto: doc 55 §3 y la bitácora [351](351-agenda-por-clase.md) (OL-322, que creó «Para visitar»).
**Estado:** hecho y probado con lógica pura, con los componentes reales (Chrome) y con la app compilada contra el respaldo local (390×844); falta el iPhone del founder.

## Qué se encargó

Que el carril «Para visitar» de Inicio (solo exposiciones vigentes) pase a llamarse **«Festivales y exposiciones»** y traiga las dos clases, ordenadas por cercanía y no por tipo, cada tarjeta diciendo qué es.

## Qué hay

- **`lib/agendaPorClase.ts`:** `festivalesVigentes` (los marcos en curso o por venir, sin ventana de días; fuera el que ya pasó y el que se sabe sin actos publicados) y `porCercania` (primero lo que ya empezó, lo que termina antes; luego lo que viene, por su inicio; a igual instante, por nombre y por id). `exposicionesVigentes` no cambia.
- **`lib/inicio.ts`:** `carrilParaVisitar` pasa a `carrilFestivales` (y `TOPE_PARA_VISITAR` a `TOPE_FESTIVALES`, el mismo valor): junta `festivalesVigentes` y `exposicionesVigentes`, quita lo ya visto y el acto de un festival cargado (lo dice su marco, la regla de OL-322), ordena con `porCercania`, aplica el tope y deja como vistos lo que sale **y los actos de los marcos que salieron** (si no, al tomar el marco aquí, sus actos saldrían sueltos en «Nuevos eventos»: antes el marco no entraba en este carril y Nuevos lo plegaba). Sigue en el mismo sitio de `calcularCarrilesAgenda`: después de «Esta semana» y antes de «Nuevos eventos». Un festival con actos esa semana ya salió en «Esta semana» como su marco («3 actividades esta semana») y aquí no se repite.
- **`lib/destacados.ts`:** `Tarjeta` gana `clase` y `tarjetaConClase` la llena con `nombreDeClase` («Festival», «Exposición», los nombres que ya usa el alta). `selloDeTarjeta` la pone en el rótulo de la foto, el mismo `Chip` `sello` de «Hoy» y «1 va» (no hay otro chip de clase en la agenda ni en la ficha: allí la clase va como texto, «Parte de X · Festival»). Va como «Día 2 de 3»: sola, o tras «Hoy» («Hoy · Festival»), y cede ante «Te interesa». Solo la llevan las tarjetas de este carril: las de los demás no cambian.
- **La línea de fecha** no tiene texto nuevo: es `cuandoDeTarjeta` de OL-322. Festival: «sáb 31 de oct» (un día) o «Del 16 al 18 de oct» (`rangoDelPeriodo`, con la regla de la ficha: un fin guardado a las 00:00 locales cierra el día anterior). Exposición: «Hasta el mar 27 de oct», o sus días si todavía no abre. La segunda línea: el programa del festival («Programa registrado: 3 actividades») o el sitio de la exposición.
- **Inicio** (`app/page.tsx`, `Inicio.tsx`, `CarrilAgenda.tsx`, `EstadoCarriles.tsx`): título «Festivales y exposiciones»; `slotParaVisitar` → `slotFestivales`, `parte="paraVisitar"` → `"festivales"`, memoria `inicio-para-visitar` → `inicio-festivales` (cambiarlo tocaba una línea de la prueba de componentes; el nombre viejo ya no decía lo que hay). Comentario de cabecera de `Inicio.tsx` al día. «Ver la agenda» va a `/agenda` sin filtro (ver decisión 2).
- **Vacío:** sin festivales ni exposiciones el carril no se pinta (el colapso de siempre de `Destacados`), y cuenta para «Inicio vacío» y «Más adelante» como antes.

## Decisiones del operador (por confirmar)

1. **Tope:** se queda en 20 (`TOPE_FESTIVALES = TOPE_ESTA_SEMANA`, el que ya tenía «Para visitar»). El encargo decía «el mismo o súbelo a 8», pero 8 sería bajarlo. En una ciudad hay pocas exposiciones vigentes y menos festivales a la vez; el tope solo frena un catálogo grande, y bajarlo dejaría fuera lo que cierra después sin otro sitio en Inicio. El carril es una tira que se desliza: 20 tarjetas no ocupan más alto que 3.
2. **«Ver la agenda» → `/agenda` sin filtro («Todo»).** La agenda no tiene un «Qué» que junte festivales y exposiciones, y el encargo pide no añadirlo. En «Todo» los festivales salen como bloques en sus días y las exposiciones en «Para visitar hoy». Antes iba a «Qué → Exposiciones». **Por confirmar con el founder** si prefiere un «Qué» nuevo o que el enlace elija uno de los dos.
3. **Ventanas distintas:** las exposiciones siguen con la de OL-322 (abiertas o que abren en los próximos 7 días); los festivales, sin ventana (todo lo que la agenda trae y no ha pasado). Un festival se anuncia con semanas y hay pocos: con 7 días, «Electric Universe Festival» del 31 de octubre no saldría hasta el 24. **Por confirmar.**
4. **Un festival sin actos publicados no sale** (`programa.registrados === 0`: doc 55 §3, «un marco sin actos no sale; no promete nada»). Si no se pudo contar su programa (falló esa lectura), sí sale. **Por confirmar** si el founder quiere ver también los marcos vacíos.
5. **«Te interesa» tapa el rótulo de clase** (regla H-02 del doc 50: un solo rótulo sobre la foto, lo tuyo primero). La línea de fecha («Hasta el…» frente a «Del … al …») y la del programa siguen diciendo qué es.
6. **Foto antes que cercanía:** `Destacados` pone las tarjetas con foto antes de las que no tienen (`ordenarTarjetasPorFoto`, regla de todos los carriles); el orden por cercanía se cumple dentro de cada grupo. No lo cambié aquí: es de todos los carriles. Con la primera captura, un festival en curso sin foto salió el último; en la que va en el repo tiene foto. **Por confirmar** si en este carril la cercanía debe mandar sobre la foto.

## Pruebas

- `npm run lint` (0 errores; 1 aviso que ya estaba, `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (181 archivos, todas en verde), `npm run inventario` (sin novedades) y `npm run medir` (35 pantallas × 4 anchos, sin novedades: en el respaldo el festival y la exposición siguen ocultos, así que ninguna medida cambia).
- Unitarias nuevas en `lib/agendaPorClase.test.ts` (describe «Festivales y exposiciones (OL-342)», 8): el orden mezclado (festival en curso que cierra el 7 → exposiciones en curso por cierre → lo que viene por inicio); un festival en curso antes que una exposición que abre después; el acto de un festival cargado no sale (y sin su marco, sí); ni festival pasado ni sin actos (y sí sin poder contarlo); vistos en los dos sentidos; los actos de un marco que salió quedan vistos para Nuevos; tope y vacío; la tarjeta («sáb 31 de oct», «Del 5 al 7 de oct» con el fin a las 00:00 del 8, «Hasta el sáb 31 de oct») y su rótulo («Exposición», «Hoy · Festival», «Te interesa»). Ajustadas: las dos del carril viejo (la de `vistos` gana el festival que viene; la de los carriles juntos comprueba que el marco con actos en la semana queda en «Esta semana» y que uno sin actos esa semana sale aquí, el último).
- Componentes (Playwright, Chrome de la Mac): `inicio/Inicio.componentes.test.mjs` 8 de 8, con el carril nuevo después de «Esta semana», sin «Voy» y con el rótulo de cada tarjeta («Exposición», «Festival», «Exposición»); `AgendaPorClase` y `Destacados` 25 de 25.

## Capturas (`docs/rediseno/capturas-371/`, 390×844 a 2×)

App compilada contra el respaldo local del repo, con una copia en el scratchpad que pone a la vista la exposición «Ecos de papel» y el «Festival de Cine de Invierno» de OL-321 (con tres de sus actos) y añade un festival en curso inventado, «Festival de Danza Contemporánea» (del 6 al 10 de oct, un acto ya pasado). Reloj fijo: miércoles 7 de oct, 10:00.

- `01-inicio-festivales-y-exposiciones.png`: «Esta semana» arriba (el concierto de hoy con «Hoy», la charla de mañana con «1 va») y debajo **«Festivales y exposiciones»** con «Ver la agenda»: primero «Festival de Danza Contemporánea» con el rótulo **Festival**, «Del 6 al 10 de oct», «Programa registrado: 1 actividad»; asoma «Ecos de papel» con el rótulo **Exposición**, «Hasta el mar 27 de oct». Sin botón «Voy». Después, «Lugares con eventos esta semana».
- `02-carril-desplazado.png`: el mismo carril deslizado: el final de «Ecos de papel» («… UASLP») y el «Festival de Cine de Invierno» con **Festival**, «Del 16 al 18 de oct» (su fin está guardado a las 00:00 del 19: el cierre del 18) y «Programa registrado: 3 actividades».

En las dos el carril va justo después de «Esta semana»; la consola sin errores y «Ver la agenda» lleva a `/agenda`. «Nuevos eventos» no sale (no llega a 3 candidatos con estos datos).

## Qué falta

- Probarlo en el iPhone del founder (Safari) con la vista previa de la rama.
- Las seis decisiones de arriba, por confirmar.
