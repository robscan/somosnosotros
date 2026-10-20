# Mapeo anual de la actividad cultural y showcase en Administración: pendientes, viabilidad y propuesta

**OL-423 · bitácora 456 · 2026-10-20.** Gestor VII. Solo documento, para decisión del founder; no autoriza código. Fuentes: la base de producción (solo lectura, 20 de octubre), la página de la Agenda Cultural de la Secretaría de Cultura de San Luis Potosí, los documentos del repo y la memoria de la gestión.

## 1. Lo que pidió el founder (20 de octubre, textual)

«Me gustaría que listaras los proyectos pendientes que revisamos durante este tiempo. Hay varias investigaciones abiertas. Además de eso, ayer hicimos un artefacto con showcase. Me gustaría también que lo consideráramos para crear una sección dentro de la página que se alimente de forma dinámica para tener el estatus actualizado. Te autorizo a correr créditos de API para eso y también me gustaría ver si podemos hacer primero una investigación, a ver si es factible, pero que podamos hacer un mapeo de la actividad cultural durante todo el año, localizando las agendas culturales del resto de los meses desde enero para acá. De esa manera ampliar un poco el diagnóstico y nutrir más el showcase. Entonces revisa a ver si están localizables las agendas, además de ver si podemos revisar en los lugares que están dados de alta y los artistas que están dados de alta, los eventos que organizaron o a los que fueron invitados. […] Si es viable, entonces lo usamos para nutrir el contenido de la aplicación aunque sean eventos pasados y con esto también completar el showcase. […] el showcase me gustaría que fuera una sección dentro de administración al igual que ahorita está el grafo y pincel, entonces también evalúa qué tan viable y administrable y gobernable y escalable es y dame propuestas. Identifica vulnerabilidades, áreas de oportunidad.»

## 2. Pendientes e investigaciones abiertas (al 20 de octubre)

### 2.1 Decisiones que esperan al founder

| Tema | Qué falta decidir | Dónde está |
|---|---|---|
| Showcase | Cuántos invitados y para cuándo; si entran artistas de fuera que ya tocan aquí; correr la rúbrica con el crédito de la API; pedir nominaciones a los foros; balance consolidados/emergentes | `privado/investigaciones/showcase-2026-10-19/` y la página privada del consejo |
| Ciudades (doc 57) | Unidad ciudad ampliada con el estado como respaldo; marca «Somos Nosotrxs» también en remitente y tiendas; el Sistema de Información Cultural como primera fuente | doc 57 §5 |
| Casalo | Nada pendiente tras «acepto tus recomendaciones»; queda escribir el «qué llevarse» | `docs/investigaciones/valores-fijos-respuesta.md` |
| Letreros con «ficha» | Si se abre la pieza para los 76 textos que quedan | bitácora 447 |
| Teclado (OL-421) | Marca «arriba con teclado» también en «¿Dónde es?» y «¿Dónde está?»; el gancho en el armazón para todos los formularios; Android cuando llegue el celular | bitácora 454 |
| Ceja (OL-422) | La línea gris «Varias sedes · 7 activid…» que se corta | bitácora 455 |
| Hora (OL-418) | Nada: las cuatro recomendaciones aceptadas | bitácora 451 |
| Cuota de Supabase | Plan o tope de tráfico (402 el 3 de octubre) | memoria del gestor |
| Grafo | Píldora gris «Sitios sin ficha»; el grafo en horizontal queda bajo | registro 49 |
| Administración › Personas | Fecha de «Alta» repetida; área de toque del buscador | bitácora 445 |

### 2.2 Piezas de código en cola que no necesitan decisiones (orden de la bitácora 449)

1. Hora de las notificaciones: un recordatorio a las 9:00 am del día y silencio de 9 pm a 9 am (aceptado el 19).
2. Botones, ✕ y renglón con estados (`ui/Boton`, `ui/Cerrar`, `pasado | cancelado` en `ui/Renglon`, chip gris de Oculto).
3. Memoria y salidas rotas: plegados recordados; editar a festival permitido o apagado con razón.
4. Imágenes con `sizes` y la prueba ampliada (`--letra=2` en la CI; Tu año, historial, PDF e historias en `medir`).
5. Inicio vacío sin banner, con «Publicar un evento» y la ciudad más cercana con eventos.
6. Higiene: cuatro pruebas inestables (`documento/route` a 5 s, `AltaEvento` OL-365, `CampoLargo` teclado, «Seguir no se atenúa»), `marca.ts` dentro de la pieza «Somos Nosotrxs», `apps/identidad.json` antes de la siguiente compilación para tiendas, `.env.example`, `ANTHROPIC_MODEL_CARTEL`.
7. Artistas de fuera con evento aquí: el carril «Artistas con eventos esta semana» todavía filtra por la ciudad del artista (nota del 3 de octubre).

### 2.3 Prototipos pendientes (superficies nuevas)

Cancelar un evento antes de que pase · correo y boletín por región (doc 57 C) · compartir un evento en redes (4:5 e historia 9:16, sobre el generador de flyers del doc 52) · mini reproductor de novedades · «¿Es este?» en hoja y la portada del sistema en la cabecera (con el 56 %) · ubicación primero (doc 57 A) · Administración › Ciudades y Rutinas (doc 57 B) · blog, novedades y becas · historial pieza 5 («lo anterior a la app e integrantes»).

### 2.4 Investigaciones y documentos abiertos

| Documento | Estado | Qué queda |
|---|---|---|
| `investigaciones/artistas.md` (4 oct) | investigación y propuesta, sin aprobación | trayectoria, integrantes y presentación profesional: parte se hizo (historial, PDF); integrantes de grupos no |
| `investigaciones/eventos.md` y `eventos-modelo.md` (4 oct) | propuesta | lo central ya se construyó (clases, alta por pasos, festival en una ficha); quedan vigencia y captura con IA de agendas |
| `investigaciones/lugares.md` (4 oct) | propuesta | actividad vigente e informes: parte hecha (Informe PDF); lo demás sin aprobar |
| `investigaciones/seo.md` (4 oct) | etapa A hecha | etapas B a D y la lectura de Search Console y Analytics con dos semanas de datos |
| `investigaciones/valores-fijos-respuesta.md` (19 oct) | aceptado | las piezas de §3 (marca.ts, ciudades, identidad de apps, higiene) y el «qué llevarse» para Casalo |
| `privado/…/auditoria-gestos-2026-10-14.md` | resuelta por OL-419 | solo lo anotado como por confirmar en la bitácora 452 |
| `privado/…/showcase-2026-10-19/` (19 oct) | punto de partida | la rúbrica completa, la pasada a los 353 del CAPO con Instagram, nominaciones de foros (este documento) |
| `rediseno/44` novedades (24 sep) | parcial | blog y notificaciones a seguidores |
| `rediseno/47` app de iOS (25 sep) | en TestFlight 1.0 (5) | revisión de App Store con los textos nuevos; Android con el celular de pruebas |
| `rediseno/52` generador de flyers (5 oct) | solo propuesta | entra con «compartir en redes» |
| `rediseno/57` ciudades, ubicación y boletín (19 oct) | firmado en parte | las siete piezas |

### 2.5 Pospuestos por decisión del founder

Entrar sin salir del sitio (OL-071b) · «pedir ayuda al volver» hasta entrevistas (OL-033) · app Android hasta el celular de pruebas · la reseña con IA del PDF (el «Pronto» se quitó el 19).

## 3. Mapeo anual de la actividad cultural: ¿es viable?

**Sí, y más barato de lo que parece para la parte institucional.** Lo comprobado hoy:

### 3.1 Las agendas sí están localizables

La página de la Agenda Cultural de la Secretaría de Cultura (`cultura.slp.gob.mx/agenda-cultural/`) conserva **todas las agendas mensuales de 2026, de enero a octubre**, y también las de 2024 y 2025. Están en PDF de imágenes, sin texto extraíble, en el mismo servidor del que leímos septiembre y octubre:

| Mes 2026 | Archivo | Peso | Páginas (aprox.) |
|---|---|---|---|
| Enero | `enero.pdf` | 2,8 MB | 14 |
| Febrero | `febrero_2026_1.pdf` | 7,7 MB | — |
| Marzo | `Marzo_2026.pdf` | 7,6 MB | — |
| Semana Santa | `SS.pdf` | — | — |
| Abril | `Abril_2026.pdf` | 12 MB | — |
| Mayo | `Mayo_2026.pdf` | 8,6 MB | 40 |
| Junio | `Junio_2026.pdf` | 5,5 MB | — |
| Julio | `Julio_2026.pdf` | 6,9 MB | — |
| Agosto | `Agosto_2026-2.pdf` | 10 MB | — |
| Septiembre | `sept_2026.pdf` | 7,3 MB | ya leído (carga del 1 de octubre: 100 eventos de octubre) |
| Octubre | `oct_2026.pdf` | 13 MB | ya leído |
| Xantolo 2026 | `Programa_Xantolo_2026_2.pdf` | — | programa especial |

Estimación: entre 250 y 350 páginas de enero a agosto; a razón de lo que dio octubre (100 eventos de unas 40 páginas), **entre 600 y 900 eventos institucionales** de enero a septiembre.

### 3.2 Lo que esa fuente cubre y lo que no

- **Cubre** a las instituciones del estado y varias municipales y universitarias: CEART, Museo Cossío, Federico Silva, Laberinto, Ferrocarril, Máscara, Leonora Carrington, IPBA, Teatro de la Paz, Raúl Gamboa, casas de cultura de barrio, Caja Real, MUNI… Los 25 lugares institucionales ya están dados de alta y el importador (`scripts/instituciones/importar-eventos.ts`) ya sabe casarlos por nombre y ligar artistas con `artistas_con_nombre`.
- **No cubre** a los foros independientes que más programan: La Carrilla, Foro Sombra, Teatro El Rinoceronte Enamorado, ACHE Galería, Laboratorio Centro Histórico, Cinema 7B, Casa Motis, Cuarto Cero, Breve Espacio… Su agenda vive en Instagram. De los 71 lugares visibles, 29 tienen Instagram anotado.

### 3.3 Lo que hay en la base hoy

Nada anterior al 20 de septiembre: 383 eventos, de septiembre a diciembre de 2026, 364 cargados por la cuenta del founder (instituciones, agendas, redes). 147 eventos tienen artistas ligados. **La tabla de eventos no guarda procedencia** (ni `origen` ni `fuente_url`): hoy no se distingue lo leído de una agenda de lo publicado por una persona.

### 3.4 Cómo se haría, en tres pasos

1. **Pieza técnica chica, antes de cargar nada (migración que solo añade):** `eventos.origen` («agenda-secult-2026-03», «redes», «persona») y `eventos.fuente_url`; el importador acepta `--historico` (eventos pasados con `visible = true`: la agenda ya ignora lo pasado y el historial de artistas y lugares, «Quién fue» y el grafo sí lo cuentan); y la garantía de que una carga histórica **no dispara avisos** («nuevo evento» a quienes siguen el lugar: hay que registrar el origen en `avisos_origen` o cargar con la captura apagada; lo verifico antes del primer mes).
2. **Lectura de los nueve PDF con la API, mes por mes, desde aquí** (un script en el scratchpad, como la lectura real de carteles): cada página como imagen al modelo, salida en el formato `EventoPropuesto` del importador, simulación sin escribir (`--simular`), un informe por mes para que el founder apruebe (como el de octubre), y carga. Costo estimado: entre 3 y 6 USD en total con Sonnet (300 páginas × ~2 000 tokens de entrada), más el cruce de duplicados con `eventos_parecidos`. Tiempo: un mes por tanda, dos o tres tandas por día; todo el año en una semana sin prisa.
3. **Foros independientes por Instagram** (lo que la agenda no cubre): la rutina de redes desde el Chrome del founder, pero hacia atrás: por cada foro de la lista corta (los diez que más programan), sus publicaciones del año con cartel, leídas con el lector de carteles que ya existe. Es lo caro en tiempo humano: unas 100 a 150 publicaciones por foro al año. Propuesta: solo los diez foros, solo publicaciones con cartel, y aceptar que quedarán huecos. Alternativa que vale la pena probar primero: pedirles a esos diez foros su calendario del año (una hoja o sus propios archivos); varios lo tienen.

### 3.5 Qué aporta al showcase y a la app

- **Circulación real por artista** en diez meses, no en dos: la señal 1 de la rúbrica sale de la base sin investigar a mano.
- **Qué programa cada foro y con quién**: la señal que más importa para vincular artistas con foros, y la base para las nominaciones.
- **El historial y el informe de cada lugar y artista** se llenan hacia atrás (la pieza 5 del historial, «lo anterior a la app», deja de ser un hueco).
- **El grafo** gana aristas de todo el año.
- **Un diagnóstico del año** para el consejo: eventos por mes, disciplina y lugar; qué meses y barrios están vacíos.

**Riesgos:** nombres de artistas con variantes (el cruce tolerante de OL-413 ayuda); fichas mínimas nuevas solo para quienes se presentan (política del founder); eventos que la agenda anunció y no ocurrieron (se cargan como anunciados, igual que hoy); carga de trabajo de aprobación para el founder (nueve informes). **Recomendación:** hacerlo. Primero la pieza técnica y enero como prueba; si el informe de enero convence, el resto del año en tandas.

## 4. El showcase como sección de Administración

### 4.1 Qué sería

`/admin/showcase`, junto a Grafo y Pincel, solo para administración. Tres pantallas:

1. **Candidatos:** la lista del catálogo con la rúbrica por artista (circulación, obra y reconocimiento, actividad, vínculo), el estado (candidato · revisado · invitado · confirmado · descartado), filtros por disciplina, ciudad y estado, búsqueda con ✕, orden por puntaje. Tocar un artista abre su ficha de showcase.
2. **Ficha de showcase:** la rúbrica con cada evidencia enlazada (qué, dónde, fecha, quién la leyó: la rutina o una persona), los eventos y foros del año (de la base), las cifras de redes de la última lectura, notas privadas del consejo y el estado. Botones «Investigar» (la rutina con la API busca becas, premios, prensa, obra y presentaciones fuera, y deja propuestas de evidencia para aprobar) y «Marcar como…».
3. **Corridas:** cada corrida de la rutina con su fecha, cuántos artistas, gasto en USD, qué encontró y qué se aprobó; tope por corrida y el crédito restante a la vista.

Y una salida: **exportar la lista para el consejo** (CSV y la ficha de una página por artista, con el motor del PDF que ya existe).

### 4.2 Modelo de datos (migraciones que solo añaden)

| Tabla | Para qué |
|---|---|
| `showcase_candidatos` | artista, estado, los cuatro puntajes, notas, quién y cuándo lo cambió |
| `showcase_evidencias` | artista, señal, tipo (beca, premio, prensa, obra, presentación, redes), título, url, fecha, fuente, leída por (rutina / persona), estado (propuesta / aceptada / rechazada) |
| `rutinas_corridas` | tipo (showcase, ciudades, agendas…), parámetros, inicio y fin, gasto, resumen, estado. Compartida con Administración › Ciudades (doc 57) |
| `perfiles_lecturas_redes` (opcional) | artista, red, seguidores, publicaciones, última publicación, fecha de la lectura |

Las lecturas de Instagram no pueden hacerse desde el servidor (Instagram bloquea); entran a mano o por la rutina desde el Chrome del founder, que deja el CSV y Administración lo importa.

### 4.3 Evaluación

| Criterio | Lectura | Qué lo sostiene |
|---|---|---|
| **Viable** | Sí, con lo que ya existe | El patrón de `/admin/grafo` (solo admin, llave de servicio en el servidor, caché de 1 h, «Actualizar», panel de ayuda), el importador, `eventos_parecidos`, `artistas_con_nombre`, el motor del PDF, la lectura con la API de `cartel.ts` |
| **Administrable** | Sí, si la rutina propone y la persona aprueba | Nada entra a la rúbrica sin una evidencia con enlace y sin un «aceptar»; cada cambio de estado con autor y fecha; filtros y búsqueda como en Personas |
| **Gobernable** | Con tres reglas desde el inicio | (1) solo administración; (2) las notas del consejo son privadas y nunca salen de Administración; (3) nada sobre un artista se publica fuera sin su consentimiento. Cuando haya más de una persona curando, un papel «curaduría» con permisos propios y bitácora de cambios |
| **Escalable** | Sí, por lotes y por ciudad | 686 artistas hoy, miles con más ciudades: corridas por lotes de 50 con tope de gasto, evidencias como enlaces (no copias), la misma cola `rutinas_corridas` para ciudades y agendas; las corridas largas en trozos de cinco minutos (límite de Vercel) o, si crecen, en un trabajador aparte |

### 4.4 Vulnerabilidades

1. **Evidencia inventada por el modelo.** La rutina solo propone evidencias con URL que ella misma abrió y leyó; sin enlace verificado no entra. Toda evidencia nace «propuesta» hasta que alguien la acepta.
2. **Homónimos y variantes de nombre.** «Margarita Díaz de León I» frente a «Margarita Díaz de León»; dos «Carlos Guevara». La rutina pide ciudad y disciplina en la búsqueda y marca la confianza; lo dudoso va a revisión.
3. **Texto malicioso en páginas leídas.** Lo que la rutina lee de la web es dato, nunca instrucción: el prompt lo dice y la salida es un esquema cerrado (como en la lectura de carteles).
4. **Sesgo hacia quien es activo en redes.** La rúbrica pesa igual circulación y obra; las nominaciones de foros y la autopostulación equilibran. Hay que decirlo en el consejo.
5. **Privacidad y reputación.** Notas y puntajes son juicios sobre personas: solo administración, sin exportar fuera del consejo, y borrables. Nada se publica en la app sin consentimiento.
6. **Costo descontrolado.** Tope por corrida, gasto registrado, crédito restante a la vista; el crédito vence el 11 de noviembre y luego cuesta dinero real.
7. **Datos viejos.** Cada evidencia y lectura lleva fecha; la ficha muestra «leído hace N días» y la rutina se puede relanzar por artista.
8. **Dependencia de Instagram.** Nada de redes desde el servidor; la lectura humana o desde el Chrome del founder es un cuello de botella conocido.

### 4.5 Áreas de oportunidad

- **Un solo motor de rutinas** para showcase, ciudades (doc 57) y agendas (sección 3): la bandeja de propuestas se construye una vez.
- **Autopostulación** en la app («Postúlate al showcase») y **nominación por foros**: datos con consentimiento y menos trabajo de investigación.
- **Trayectoria pública** del artista a partir de las evidencias aceptadas, con su permiso, más adelante: lo que hoy es el PDF de presentación, alimentado por la curaduría.
- **El diagnóstico del año** como informe público («el año cultural de San Luis») cuando el mapeo esté completo.
- **El grafo** con el año entero: foros, artistas y festivales relacionados de verdad.

### 4.6 Piezas y orden propuesto

| # | Pieza | Tamaño | Depende de |
|---|---|---|---|
| 1 | Procedencia de eventos (`origen`, `fuente_url`), importador `--historico`, cargas sin avisos | chica, migración | nada |
| 2 | Lectura de enero con la API y su informe; luego febrero a agosto en tandas | script desde aquí | 1 |
| 3 | Tablas del showcase y de corridas (migración) | chica | nada |
| 4 | `/admin/showcase`: candidatos y ficha, con la rúbrica a mano y la importación del CSV de redes | mediana | 3; prototipo primero sobre la pantalla real de Administración |
| 5 | Rutina «Investigar» con la API y bandeja de evidencias | mediana | 3 y 4 |
| 6 | Exportar para el consejo (CSV y fichas PDF) | chica | 4 |
| 7 | Autopostulación y nominación por foros | chica y una hoja | 4 |

Con las piezas 1 a 4 el consejo puede trabajar en dos semanas; 5 a 7 después. El crédito de la API cubre 2 y 5 de sobra.

## 5. Para decidir

1. ¿Arranco hoy la pieza 1 y la lectura de enero como prueba del mapeo anual?
2. ¿El showcase va con prototipo primero (recomendado: es una superficie nueva de Administración) o directo a código sobre el patrón del grafo?
3. ¿Las tres reglas de gobierno de §4.3 quedan como están?
4. ¿Les pedimos su calendario del año a los diez foros independientes antes de leer sus redes?
