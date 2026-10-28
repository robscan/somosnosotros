# 494 · Festival «Cultura Mística» y un cargador de propuestas desde JSON (OL-462)

**Fecha:** 2026-10-27. **Rama:** `cargar-propuestas`, base `origin/main` (`b3fbdddb`). **Operador:** agente de la pieza (Gestor VII), sin otros
agentes. **Estado:** en código y con los datos listos; la carga real la corre el gestor desde la carpeta principal (comandos al final). **Sin
migración** ni variables nuevas: la base ya tenía todo lo que hacía falta.

## El pedido

- El founder mandó los carteles del festival y pidió: «revisa este festival de varios días con sus eventos y créalo en la plataforma».
- Encargo del gestor: un cargador reutilizable (`proponer`) que lea un `propuestas.json` y deje una corrida con sus propuestas, con la misma forma
  de `datos` que las rutinas, para aceptarla con `aceptar-corrida` (OL-453) sin tocarlo; y el JSON del festival, leído de los carteles.

## El guion: `scripts/instituciones/proponer.ts`

`node scripts/instituciones/correr.mjs proponer <carpeta> --autor <id del admin> [--simular] [--salida <carpeta>]` (añadido a `correr.mjs`).

1. Lee `<carpeta>/propuestas.json`, la ciudad por su slug, las fichas de artista visibles y los lugares de la ciudad, y los festivales vigentes.
   Si la ciudad ya tiene propuestas con esa `fuente`, se detiene y da el id de esa corrida (correrlo dos veces no repite nada).
2. Arma las propuestas (`armarPropuestas`, función pura) con la forma de la rutina de agendas:
   - **lugar** `{ nombre, tipo, detalle?, direccion?, lat?, lng?, ciudad, redes, url?, leida }`; uno que ya está en el directorio no se propone.
   - **artista** `{ nombre, disciplina, detalle?, tipo, ciudad, redes, url?, leida, municipio?, obra? }`; uno con ficha en la ciudad (mismo nombre
     normalizado) no se propone y sus eventos se ligan a esa ficha.
   - **evento** `{ titulo, inicio, fin?, lugar, precio?, descripcion?, clase, ciudad, url?, imagen?, leida, artistas? }`; el precio pasa por
     `precioDeAgenda` como en la rutina.
   - **Festival con actos** (como `hacerActo` en `agendas.ts`): el festival es un marco `{ clase: "festival", actos, termina, programa }`; cada
     acto lleva `marco_propuesto` (el id de la propuesta del festival), `programa`, `espera` y su clase sin ser festival (`claseDeActo`). Un acto
     de un festival ya registrado en la ciudad lleva `marco { id, titulo }`. **No hizo falta extender nada para el festival:** `prepararEvento`,
     `ligarFicha` y `aceptar-corrida` (festivales antes que sus actos) ya lo soportaban; con `aceptar-corrida`, el festival se publica primero y
     cada acto cuelga de él (`evento_padre_id`) con su cartel.
3. Las imágenes locales del JSON (`"imagen": "./cartel.jpg"`) se preparan como un cartel del teléfono (`prepararCartel`: lado de 2000, JPEG en el
   tope del bucket), se suben una vez cada una como JPEG público a `fotos/lugares/<autor>/propuesta-<uuid>.jpg` (`almacenDeSupabase`) y su URL
   sustituye a la local. Al aceptar el evento, `ponerCartel` la baja de ahí y la pone de cartel (`lugares/<autor>/evento-<uuid>.jpg`).
4. Comprueba cada propuesta como la bandeja, sin escribir: `validarLugar`, `validarArtista` y `prepararEvento` (un acto, como evento suelto: su
   festival aún no existe; un lugar propuesto en el mismo JSON tampoco, así que un evento en él necesita `lat`/`lng`). Con `--simular`, la base
   va envuelta en `soloLectura` (de `cartelera-cdmx.ts`): nada se escribe aunque algo lo intente.
5. Sin `--simular` y si nada falló: sube las imágenes y escribe la corrida (`rutinas_corridas`: tipo `agendas`, la ciudad, `estado='terminada'`,
   `tope_usd` 0,01, `gasto_usd` 0, `parametros { carga: "manual", fuente }`, `resumen { fuente: "carga manual", archivo, lugares, artistas,
   eventos, festivales, actos, imagenes, propuestos }`) y todas sus propuestas de una vez. Si las propuestas no se guardan, borra la corrida y las
   imágenes subidas. Si algo falla antes, no escribe nada. Informe en `scripts/instituciones/salida/proponer-*.md` (y los ids, para deshacer).

### Lo único que se extendió: los artistas de un evento

Las propuestas de evento no tenían cómo decir quién se presenta (OL-440 liga desde la propuesta del artista, con ids de eventos que ya existen;
aquí los eventos aún no existen). Lo mínimo, sin migración:

- `datos.artistas` = `[{ nombre, id? | propuesta? }]` (`artistasDeDatos` en `formaEvento.ts`): `id`, la ficha que ya existe; `propuesta`, la
  propuesta de artista de la misma corrida que la crea al aceptarse.
- `prepararEvento` resuelve las fichas (`fichasDeArtistas`: la de `id`, la que creó su propuesta si ya se aceptó, y sin ninguna de las dos la del
  mismo nombre en la ciudad; solo visibles) y `insertarEvento` las liga en `eventos_artistas` en su orden; si no se pueden guardar, el evento no
  queda a medias (como las sesiones). Vale para la bandeja, para `aceptar-corrida` y para los actos que esperaban a su festival.
- Como `aceptar-corrida` acepta artistas antes que eventos, todo queda ligado. En la bandeja, un evento aceptado antes que su artista se publica sin
  esa liga (no falla).

## La forma del JSON

```json
{
  "ciudad": "san-luis-potosi",
  "fuente": "Carteles del festival, enviados por el founder",
  "url": "https://… (opcional)",
  "lugares": [{ "nombre": "…", "tipo": "foro", "detalle": "…", "direccion": "…", "lat": 22.15, "lng": -100.97, "redes": ["https://…"] }],
  "artistas": [{ "nombre": "…", "disciplina": "musica", "detalle": "≤ 40 letras", "tipo": "solista", "redes": ["https://…"] }],
  "eventos": [
    { "titulo": "Festival", "clase": "festival", "fecha": "2026-10-30", "hora": "16:00", "lugar": "Aurora Co-Lab", "precio": "Entrada libre",
      "descripcion": "…", "imagen": "./cartel.jpg", "artistas": ["…"] },
    { "titulo": "Acto", "festival": "Festival", "clase": "taller", "fecha": "2026-10-30", "hora": "18:30", "hora_fin": "20:30",
      "lugar": "Aurora Co-Lab", "precio": "$100 (cooperación)", "imagen": "./programa.jpg", "artistas": ["…"] }
  ]
}
```

Horas de la ciudad; una `hora_fin` menor o igual que la de inicio es del día siguiente (`fecha_fin` para más); `festival` es el título de un
festival del archivo o de uno registrado. Lo que está mal (hora que no se entiende, fin antes del inicio, festival que no está, imagen que no
está, disciplina o tipo que no existen, detalle de más de 40, el mismo título dos veces el mismo día, un acto antes que su festival) se lista y no
se escribe nada.

## Lo que se leyó de cada cartel

Los carteles están en `~/Proyectos/somosnosotros/privado/gestor/cargas/cultura-mistica/` (fuera del repo), con el JSON junto a ellos.

- **`cartel-festival.jpg`** (el del festival): «1er. emisión», Cultura Mística, 30 y 31 de octubre (viernes y sábado, a partir de las 4:00 pm) y 1
  de noviembre (domingo, desde las 11:00 am), entrada libre, Xicoténcatl 410, San Miguelito, Centro. Logotipos: Recurrente · Arte, Memoria y
  Acción A.C., Aurora Co-Lab, Ballroom San Luis Potosí, Mujer Alquimia y Mano Azul (@mano_azul_). Va de cartel del festival.
- **`cartel-general-con-lista.jpg`**: lo mismo con la lista de actividades: meditación guiada, lecturas de tarot, venta de plantas, DJ Afalefe,
  ballroom femme, herbolaria medicinal, usos del huevo de obsidiana, escritura del futuro, taller de sahumerios, cosmética natural, Sunday music,
  yoga, Cerdito Encantado y **taller de pigmentos salvajes**. «Cosmética natural» cabe en «productos naturales»; el **taller de pigmentos
  salvajes no sale en ningún programa del día** (sin día ni hora): no se cargó. No se usa como cartel (el limpio es mejor).
- **`programa-viernes-30-oct.jpg`**: 5:30–6:15 pm meditación «Percepciones interiores», «una guía para conectar con el corazón», Martha Franco,
  coop. voluntaria · 6:30–8:30 pm taller de escritura y micro abierto «Futuro: escritura, invocación e hiperstición», Gustoño, coop. $100 ·
  9:00–10:00 pm charla/lectura abierta de tarot «La mujer que ilustró el Rider-Waite», Irma Hermoso «Luna», sin costo. Abajo: no se permite entrar
  con alimentos ni bebidas; desde las 4:00 pm venta de plantas, productos naturales, bebidas, consultas de tarot y más.
- **`programa-sabado-31-oct.jpg`**: 5:00–6:00 pm clase de yoga «Meditación en movimiento», Rafa Becerra, coop. voluntaria · 6:00–6:30 pm muestra de
  trabajo «Sesión de escucha», Laboratorio de Exploración Sonora, sin costo · 6:30–8:30 pm clase ballroom «Categoría Vogue Femm abre en 5… 4..
  3…», Quetzal 007, coop. $80, cuota preferencial a comunidad ballroom · 9:30 pm–1:00 am música, DJ Afalefe, sin costo.
- **`programa-domingo-1-nov.jpg`** («¡de cruda!»): 11:00 am–1:00 pm en promo «Miches, clamatos y ceviche veggie» · desde las 12:00 pm música
  tranki a cargo de «Sunday» · 1:00–2:00 pm charla «Herbolaria y magia de guerrilla», coop. voluntaria · «Lena.» · 2:30–3:30 pm taller
  «Elaboración de sahumerios intencionados», coop. $130, incluye materiales · 4:00–5:00 pm conversatorio «Sanación de útero con huevo de
  obsidiana», Eirene Ortal, sin costo. Abajo: desde las 11:00 am lo mismo que los otros días.
- **`cerdito-encantado.jpg`**: «Participa en el Cerdito Encantado», «$$$ regresa por triplicado», los tres días con los mismos horarios. No es un
  acto: va en la descripción del festival.

## Lo que se cargará (JSON)

- **11 artistas propuestos** (San Luis Potosí): Martha Franco (otro · Meditación guiada), Gustoño (letras · Escritura y micro abierto), Rafa Becerra
  (otro · Yoga), Laboratorio de Exploración Sonora (música · colectivo), Quetzal 007 (danza · Ballroom, vogue femme), DJ Afalefe (música · DJ),
  Sunday (música · Música tranquila), Lena (otro · Herbolaria), Eirene Ortal (otro · Huevo de obsidiana), Mujer Alquimia (otro · colectivo) y Mano
  Azul (otro · colectivo, con su Instagram). No se buscó ningún Instagram: solo el de Mano Azul, que dice el encargo y el logotipo.
- **El festival** «Cultura Mística» en Aurora Co-Lab (ya existe; no se propone), entrada libre, cartel del festival, con Ballroom SLP (ficha que
  ya existe), Mujer Alquimia y Mano Azul. Descripción con lo transversal: el mercado desde las 4:00 pm (vie/sáb) y 11:00 am (dom), la promo del
  domingo, el Cerdito Encantado, «no se permite entrar con alimentos ni bebidas» y quiénes organizan.
- **11 actos**, cada uno con su hora de inicio y fin, su costo, sus artistas y el programa de su día como cartel. Costos como los lee
  `costoDeAgenda`: «Cooperación voluntaria» → cooperación; «Sin costo» y «Entrada libre» → gratis; «$100 (cooperación)», «$80 (cooperación; cuota
  preferencial a la comunidad ballroom)» y «$130 (cooperación, incluye materiales)» → el precio y el texto al final de la descripción («Costo: …»).
  Los dos talleres con clase `taller`; lo demás, `puntual`. DJ Afalefe termina a la 1:00 del domingo.

Ensayo sin red (el JSON real, sobre una base en memoria con Aurora Co-Lab, Irma Hermoso, Luna Hermoso, Ballroom SLP y Lena Vurma como fichas):
23 propuestas (11 artistas, 12 eventos), todas pasan la comprobación; `aceptar-corrida` aceptó las 23, 12 eventos con cartel, el festival como
marco y los 11 actos colgados de él, con sus artistas ligados (el taller de sahumerios sin artista, ver abajo).

## Decisiones por confirmar

- **Irma Hermoso, no Luna Hermoso.** El cartel dice Irma Hermoso «Luna». La ficha «Irma Hermoso» (del CAPO, teatro) tiene como enlace el sitio
  de Recurrente A.C. (`recurrenteeac.wordpress.com`), que organiza el festival: es ella. «Luna Hermoso» puede ser la misma persona dada de alta
  otra vez: conviene revisarla y, si lo es, unirlas.
- **Lena, aparte de Lena Vurma.** No hay nada en los carteles que diga que «Lena» sea «Lena Vurma» (no se encontró esa ficha en ningún dato a la
  mano): se propone «Lena» como artista nueva. Si es la misma, rechazar la propuesta («duplicado») y ligar la charla a «Lena Vurma» a mano.
- **Lena da la charla, no el taller.** En el cartel del domingo cada nombre va debajo del título de su actividad (Martha Franco, Gustoño, Irma,
  Eirene Ortal); «Lena.» queda debajo del título de la charla «Herbolaria y magia de guerrilla» y antes de la etiqueta «Taller». Se liga a la
  charla; el taller de sahumerios queda **sin artista** (es probable que también sea suyo, pero el cartel no lo dice).
- **El Cerdito Encantado no es acto** (ni el mercado ni la promo del domingo): van en la descripción del festival. No tiene hora propia, ni
  artista, ni dice qué es más allá de «participa» y «$$$ regresa por triplicado»; un acto así no diría nada. Su cartel no se sube.
- **«Recurrente · Arte, Memoria y Acción A.C.» es una sola organización** (así lo dice su logotipo; el encargo la listaba como dos). Se nombra en
  la descripción; no se propone como artista (no lo pedía el encargo y es una asociación).
- **Organizadores como artistas del festival:** Ballroom SLP, Mujer Alquimia y Mano Azul se ligan al marco (son fichas de artista); Ballroom SLP
  también a la clase de ballroom, con Quetzal 007.
- **El periodo del festival:** al publicarse sus actos, la app lo recalcula de su primer acto al último (`recalcular_festival`): saldrá del
  viernes 5:30 pm al domingo 5:00 pm, no «desde las 4:00 pm». El «desde las 4:00 pm / 11:00 am» queda en la descripción.
- **Títulos:** el tipo de actividad y el nombre del cartel entre comillas («Meditación «Percepciones interiores»», «Clase ballroom «Categoría
  Vogue Femm abre en 5… 4… 3…»»); los que son una persona, su nombre («DJ Afalefe», «Música tranki con Sunday»).
- **El taller de pigmentos salvajes** de la lista general no se cargó: no sale en los programas del día.
- **Sin migración.** Los artistas de un evento propuesto se ligan desde TypeScript (`insertarEvento`), igual que las sesiones.

## Verificación

- `npm run lint` (0 errores), `npm run typecheck`, `npm test` (291 archivos, **4 723 pruebas**), `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control
  npm run test:db` (**2 556 pruebas, 0 fallaron**), `npm run inventario` (sin novedades), `npm run medir` (60 pantallas × 4 anchos, sin
  novedades), `npm run test:componentes` (**730**, 0 fallaron).
- Pruebas nuevas: `scripts/instituciones/proponer.test.ts` (la forma de cada propuesta, un acto de un festival registrado, lo que está mal, y de
  punta a punta: proponer → `aceptar-corrida` sin tocarlo → festival con sus actos colgados, carteles y artistas ligados);
  `publicarEvento.test.ts` (`fichasDeArtistas` y la liga al insertar) y `formaEvento.test.ts` (`artistasDeDatos`).
- Sin pantalla nueva ni cambiada: no hay captura.
- `correr.mjs proponer` compila con esbuild y, sin `.env`, se detiene con «Falta NEXT_PUBLIC_SUPABASE_URL». No se tocó la base de producción.

## Comandos para el gestor

Desde la carpeta principal, **con esta rama unida a `main`** (o con `cargar-propuestas` en la carpeta principal): sin el código de la rama,
`aceptar-corrida` publica los eventos pero no liga a sus artistas. `<id del admin>` es la cuenta de administración que firma lo cargado.

```
cd /Users/apple-1/Proyectos/somosnosotros/somosnosotros
# 1. Simular la carga (lee la base, no escribe; dice qué artistas ya tienen ficha y si algo falla)
node scripts/instituciones/correr.mjs proponer ../privado/gestor/cargas/cultura-mistica --autor <id del admin> --simular
# 2. Cargar (sube 4 imágenes y crea la corrida con 23 propuestas; imprime el id de la corrida)
node scripts/instituciones/correr.mjs proponer ../privado/gestor/cargas/cultura-mistica --autor <id del admin>
# 3. Simular la aceptación y aceptar (artistas, luego el festival, luego sus actos)
node scripts/instituciones/correr.mjs aceptar-corrida <corrida_id> --autor <id del admin> --simular
node scripts/instituciones/correr.mjs aceptar-corrida <corrida_id> --autor <id del admin>
```

En la simulación del paso 1, mirar la sección «Notas»: si «Lena», «Sunday» u otro ya tienen ficha con ese nombre, no se proponen y se ligan a la
ficha. Para deshacer el paso 2 antes de aceptar: borrar la corrida (sus propuestas se van con ella) y las imágenes `fotos/lugares/<id del
admin>/propuesta-*.jpg` del informe.
