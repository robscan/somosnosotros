# somosnosotros — definición (una página)

**Qué es.** Una plataforma sin fines de lucro para que la gente de una ciudad se entere de dónde están sus centros culturales, qué pasa en ellos, y conozca a otras personas locales. Empieza en **San Luis Potosí**. Cada evento publicado deja constancia de quién participó, dónde y con quién. Con el tiempo, la agenda arma sola el mapa de la cultura de la ciudad y la trayectoria de sus artistas: eso es el **grafo cultural** (founder, 2026-09-21).

**Para quién.**
- **Público local**: quiere saber qué hay cerca hoy o esta semana, y encontrar gente con intereses parecidos.
- **Gestores de centros culturales**: quieren dar de alta su espacio y publicar sus eventos en un minuto desde el teléfono.
- **Administrador** (el founder): registra lugares y eventos, verifica y corrige lo que publican los demás.

**Qué hace, en orden.**
1. Registro de **usuarios**.
2. Registro de **lugares** culturales (con mapa).
3. Registro de **eventos** en esos lugares (agenda).
4. **Comunidad**: decir "voy" a un evento y ver quién más va; seguir lugares y artistas; recibir avisos.
5. **Artistas y grupos locales**: quiénes hacen la cultura de la ciudad, en qué eventos se presentan; cualquier persona con sesión los registra y el artista real puede reclamar o retirar su nombre.

**Qué NO es.** No es un pasaporte ni una colección de lugares visitados. No es red social de likes ni ranking; los destacados sí entran: lo que elige el administrador, lo que tiene eventos esa semana, lo que tiene más asistentes y lo que más se ve (founder, 2026-09-21: «Los lugares se destacan según si tienen eventos esa semana o si los eventos en los que participan, los contenidos que publican se ven mucho y por que admin destaca, no por conexiones aunque si se relaciona»; sustituye a «sin contar visitas» del 2026-09-16). Las vistas se cuentan por ficha, nunca por persona. Hoy no es app de tienda: es web móvil, instalable en el inicio del teléfono (la app de iPhone en la tienda se decidió y se detuvo el 2026-09-16). La app nativa llegará después: «eventualmente desarrollaremos nativo (una vez que la versión esté cerrada y suficiente testeada)» (founder, 2026-09-21).

**Cómo se guarda lo que sabemos (grafo cultural).** Firmado por el founder el 2026-09-21 («acepto todas tus propuestas y plan de implementación»), con sus anotaciones; análisis en [`rediseno/24-grafo-cultural.md`](rediseno/24-grafo-cultural.md).
- Todo lo que se publica es una ficha (artista o grupo, lugar, evento, obra) y toda ficha se conecta con otras. Una ficha sin conexiones es la excepción, no la norma.
- Cada conexión dice de qué tipo es (participa, organiza, ocurre en, forma parte de) y de dónde salió (una persona, un cartel leído, una agenda enviada). Lo que propone la IA se confirma antes de publicarse como hecho.
- El grafo es de lo público. Las personas que asisten no son fichas del grafo: se cuentan. Para entender la participación (por ejemplo, si una persona va a muchos eventos) se usa un identificador sin nombre, solo en Administración y solo con lo que la persona declaró (Voy, Me interesa, Seguir); nunca su ubicación ni lo que navega.
- Las conexiones se muestran, no se puntúan: no hay ranking de artistas ni de lugares, y nada se destaca por tener más conexiones (los criterios para destacar están en «Qué NO es»).
- Cada ficha tiene una dirección propia, legible y que no cambia.

**Reglas simples.**
- Español. Mobile first. Tema claro.
- Publican el administrador y los usuarios registrados por su cuenta; el administrador puede editar u ocultar cualquier cosa.
- Todo lo publicado tiene autor visible y se puede corregir o borrar por su autor.
- Un lugar es un lugar: mismo nombre a menos de 150 m es el mismo (no se duplica).
- Un lugar es un espacio cultural, no un negocio: bares, cafés y foros de conciertos comerciales no entran, aunque tengan programa cultural.
- Un evento tiene fecha y hora. Sin fecha no se publica.
- Ubicación: se pide con un toque de la persona, en el momento en que le sirve, y se usa para ayudarle (ordenar por cercanía, encontrar direcciones, centrar el mapa). Vive en su teléfono, aproximada y por poco tiempo: nunca se guarda en nuestra base ni se asocia a su cuenta. Puede viajar a Mapbox, aproximada, para buscar direcciones. (Founder, 2026-09-21: «si es necesario cambiar reglas de privacidad entonces lo hacemos pero el usuario agradecerá la ayuda»; sustituye a «sirve para ordenar por cercanía, nada más».)
- Capacidades del teléfono: hoy, las del navegador (cámara, micrófono, movimiento y orientación, con permiso y solo cuando ahorran trabajo a la persona) y las que suma la app instalada en el inicio (avisos push, globo en el icono). Lo que la web del iPhone no ofrece (NFC, vibración) espera a la app nativa (founder, 2026-09-21: se aprueba «cámara, nfc, micrófono, acelerómetro, haptics»).
- Lo vacío se dice ("aún no hay eventos"), no se rellena.

**Stack.** Next.js (web, PWA) · Supabase (base de datos, usuarios, fotos) · Mapbox GL JS (mapa) · Vercel (hosting, somosnosotros.org) · GitHub (`robscan/somosnosotros`, público: ningún secreto en el repo).
