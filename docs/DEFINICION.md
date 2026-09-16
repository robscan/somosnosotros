# somosnosotros — definición (una página)

**Qué es.** Una plataforma sin fines de lucro para que la gente de una ciudad se entere de dónde están sus centros culturales, qué pasa en ellos, y conozca a otras personas locales. Empieza en **San Luis Potosí**.

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

**Qué NO es.** No es un pasaporte ni una colección de lugares visitados. No es red social de likes ni ranking. No es app de tienda: es web móvil, instalable en el inicio del teléfono (la app de iPhone en la tienda se decidió y se detuvo el 2026-09-16).

**Reglas simples.**
- Español. Mobile first. Tema claro.
- Publican el administrador y los usuarios registrados por su cuenta; el administrador puede editar u ocultar cualquier cosa.
- Todo lo publicado tiene autor visible y se puede corregir o borrar por su autor.
- Un lugar es un lugar: mismo nombre a menos de 150 m es el mismo (no se duplica).
- Un lugar es un espacio cultural, no un negocio: bares, cafés y foros de conciertos comerciales no entran, aunque tengan programa cultural.
- Un evento tiene fecha y hora. Sin fecha no se publica.
- Ubicación del usuario solo si la pide con un botón; sirve para ordenar por cercanía, nada más.
- Lo vacío se dice ("aún no hay eventos"), no se rellena.

**Stack.** Next.js (web, PWA) · Supabase (base de datos, usuarios, fotos) · Mapbox GL JS (mapa) · Vercel (hosting, somosnosotros.org) · GitHub (`robscan/somosnosotros`, público: ningún secreto en el repo).
