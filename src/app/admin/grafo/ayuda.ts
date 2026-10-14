import type { DiccionarioAyuda } from "@/components/ui/useAyuda";

/**
 * Lo que dice el panel de ayuda del grafo y, con las mismas palabras, su manual (OL-402, bitácora 433). Una sola fuente: el panel enseña `titulo` y
 * `texto` de la entrada que el ratón (o el dedo, en el modo ayuda) señala con `data-ayuda="clave"`; la página del manual lista todas, agrupadas por
 * `BLOQUES`, y añade `detalle`. Aquí viven los textos que antes estaban sueltos en la pantalla (qué es Mapa y Red, las notas de Ajustes y de Tiempo, los
 * subtítulos de las lentes, la leyenda de las líneas): la pantalla se quedó con los nombres y los controles. `texto` mide dos o tres líneas;
 * lo que sobre va en `detalle`, con su ancla `manual`.
 */
export const AYUDA: DiccionarioAyuda = {
  // ---------- La barra ----------
  pantalla: {
    titulo: "Grafo cultural",
    texto: "Lugares, artistas y asistentes como puntos, y las líneas que los unen. Arrastra para girar; pellizca para acercar.",
    detalle:
      "Cada lugar está en su sitio real; los artistas, sobre el lugar donde más tocan, y los asistentes (anónimos), cerca de los lugares a los que van. Solo la ve Administración. Un asistente no tiene nombre, perfil ni foto: lo único que se sabe de él es a qué eventos dijo «Voy» o «Me interesa» y a quién sigue. Los eventos en un sitio sin ficha de lugar son un punto gris en el suelo, para que ningún acto quede suelto. Con el dedo: uno gira, dos acercan y mueven. Con el ratón: arrastra para girar y la rueda acerca. Con el teclado: las flechas giran e inclinan, + y − acercan y alejan, Inicio vuelve al centro y Esc suelta lo elegido.",
    manual: "pantalla",
  },
  cifras: {
    titulo: "Cuentas de la barra",
    texto: "Cuántos puntos y cuántas conexiones hay a la vista, y de qué tipo. Plegar una capa cambia la cuenta.",
  },
  fps: { titulo: "Cuadros por segundo", texto: "Qué tan fluido va el dibujo mientras algo se mueve. En reposo no dibuja y lo dice." },
  tema: { titulo: "Claro / Oscuro", texto: "Cambia el fondo de la pantalla entre oscuro (el de siempre) y claro. Solo cambia los colores, no los datos." },
  manual: { titulo: "Manual", texto: "Todo lo que dice este panel, completo y por secciones, en una página." },
  actualizar: {
    titulo: "Actualizar",
    texto: "Vuelve a leer la base ahora. El grafo se calcula una vez por hora para no gastar lecturas; esto fuerza una lectura nueva.",
    detalle: "Úsalo después de un cambio que quieras ver en el grafo (por ejemplo, un seguimiento nuevo). La cámara y lo elegido vuelven a empezar; las capas plegadas y «Yo» se recuerdan.",
    manual: "actualizar",
  },

  // ---------- Lecturas ----------
  mapa: {
    titulo: "Mapa",
    texto: "Cada lugar en su sitio real, a escala. Dos puntos juntos están juntos en la ciudad, no necesariamente relacionados.",
    detalle:
      "Cada lugar en su sitio real, a escala; los artistas flotan sobre el lugar donde más tocan y los asistentes, debajo, cerca de los lugares a los que van. Dos puntos juntos están juntos en la ciudad, no necesariamente relacionados. La escala es 1 unidad = 10 m desde el centro de los lugares; cada anillo del suelo es 1 km. Lo que está a más de 10 km se acerca en logaritmo, así que ya no está a escala.",
    manual: "mapa",
  },
  red: {
    titulo: "Red",
    texto: "La posición la dan las conexiones, no el sitio: lo que se relaciona se junta y lo más conectado queda al centro.",
    detalle:
      "La posición la dan las conexiones, no el sitio: lo que se relaciona se atrae y lo más conectado queda al centro; los cúmulos sueltos quedan aparte y los lugares sin ninguna línea, en el anillo de fuera. La cercanía deja de ser la de la ciudad y pasa a ser la relación.",
    manual: "red",
  },
  arriba: {
    titulo: "Desde arriba",
    texto: "Mira la escena como un plano, de frente al suelo. Sirve para ver qué zonas quedan vacías. Otro toque vuelve al 3D.",
  },

  // ---------- Lentes ----------
  lentes: {
    titulo: "Lentes de diagnóstico",
    texto: "Seis preguntas ya hechas sobre la red. Elegir una enfoca la escena y deja la respuesta en la lista, lista para copiar.",
    detalle:
      "Una lente cambia el filtro y la lectura, mueve la cámara y escribe su respuesta en la lista (en el teléfono, en la hoja «Lista»). Si necesita una capa que estaba plegada, la despliega y lo avisa bajo el título de la lista. Para quitarla, vuelve a tocarla o elige un filtro.",
    manual: "lentes",
  },
  "lente-zonas": {
    titulo: "¿Qué zonas no tienen un lugar a 2 km?",
    texto: "Mapa desde arriba con las zonas de la ciudad, en naranja, donde el lugar más cercano queda a más de 2 km.",
    detalle: "Se mira dentro de 7 km del centro, en cuadros de 1 km por lado. La lista dice el rumbo y el tamaño de cada zona.",
    manual: "lente-zonas",
  },
  "lente-islas": {
    titulo: "¿Qué lugares no comparten artista con nadie?",
    texto: "Islas: lugares con eventos, pero ningún artista suyo toca en otro lugar ni comparten festival.",
    detalle: "Aparte, en gris, la lista también trae los lugares que no tienen ningún evento.",
    manual: "lente-islas",
  },
  "lente-mismo-sitio": {
    titulo: "¿Qué artistas tocan siempre en el mismo sitio?",
    texto: "Artistas con dos o más fechas, todas en un solo lugar.",
  },
  "lente-puentes": {
    titulo: "¿Quién une lugares distintos?",
    texto: "Pasa a la lectura Red: artistas que tocan en más de un lugar, con los lugares que unen.",
  },
  "lente-festivales": {
    titulo: "¿Qué festivales conectan sedes?",
    texto: "Lugares unidos por un festival, con las líneas del color del lugar entre ellos.",
  },
  "lente-por-conectar": {
    titulo: "¿Cuántos faltan por conectar, por disciplina?",
    texto: "Artistas sin ningún evento, por disciplina: la lista para invitar.",
  },

  // ---------- Filtrar ----------
  filtrar: {
    titulo: "Filtrar",
    texto: "Deja a la vista solo un tipo de punto; lo demás se apaga. Quita la lente que estuviera puesta.",
  },
  "filtro-todo": { titulo: "Todo", texto: "Todos los puntos de las capas a la vista. El número es cuántos son." },
  "filtro-lugares": { titulo: "Lugares", texto: "Solo los lugares, con ficha o sin ella (los sitios sin ficha). El número es cuántos hay." },
  "filtro-tipo": { titulo: "Tipo de lugar", texto: "Solo los lugares de ese tipo. El número es cuántos hay." },
  "filtro-artistas": { titulo: "Artistas", texto: "Solo los artistas. El número es cuántos hay." },
  "filtro-con-lugar": {
    titulo: "Con lugar",
    texto: "Artistas con al menos un evento en un lugar con ficha: flotan sobre el lugar donde más tocan.",
  },
  "filtro-disciplina": { titulo: "Disciplina", texto: "Solo los artistas de esa disciplina. El número es cuántos hay." },
  "filtro-libres": {
    titulo: "Solo en sitios libres",
    texto: "Artistas cuyos eventos son todos en sitios sin ficha de lugar; flotan sobre el sitio, unidos a él.",
  },
  "filtro-sitios": {
    titulo: "Sitios sin ficha",
    texto: "Solo los sitios con eventos que aún no tienen ficha de lugar: cada uno es un lugar por dar de alta. El número es cuántos hay.",
    detalle: "Es un subfiltro de «Lugares». Para dar de alta uno, elígelo y usa el enlace de su tarjeta.",
    manual: "filtro-sitios",
  },
  "filtro-sin-conexion": {
    titulo: "Sin conexión",
    texto: "Artistas sin ningún evento ni lugar. Normalmente van resumidos en un solo punto; aquí se despliegan.",
  },
  "filtro-asistentes": {
    titulo: "Asistentes",
    texto: "Anónimos: quienes dijeron «Voy» o «Me interesa» a algún evento, o siguen a un lugar o a un artista.",
  },

  // ---------- Capas y Yo ----------
  "capa-lugar": {
    titulo: "Capa Lugar",
    texto: "Los lugares y los sitios sin ficha, en su posición real. Tócala para plegarla: se van sus puntos y las líneas que los tocan.",
    detalle:
      "Plegar una capa quita de la escena sus puntos y todas las líneas que los tocan, y también de la lista, de las cuentas del árbol y de las de la barra; el tamaño de lo que queda no cambia. Se recuerda en este aparato. Una lente que necesita una capa plegada la despliega.",
    manual: "capas",
  },
  sitio: {
    titulo: "Sitio sin ficha",
    texto: "Un sitio donde hay eventos pero que aún no tiene ficha de lugar. Gris, en el suelo; une a sus artistas y asistentes.",
    detalle:
      "Los eventos sin lugar y con coordenadas que quedan a 50 m o menos unos de otros son el mismo sitio (así 30 m de diferencia no los parte en dos). El nombre es el que más se repite entre sus eventos; sin nombre, «Sitio sin ficha». Tiene tamaño de lugar (sus asistencias) y, en su tarjeta, un enlace para dar de alta ese lugar con el nombre y el punto ya puestos. Cuando se da de alta y sus eventos pasan al lugar, el punto gris desaparece y sus líneas pasan al lugar nuevo. Los sitios van con la capa Lugar.",
    manual: "sitios",
  },
  "capa-artista": {
    titulo: "Capa Artista",
    texto: "Los artistas, sobre el lugar donde más tocan. Tócala para plegarla, junto con el punto «por conectar».",
  },
  "capa-asistente": {
    titulo: "Capa Asistente",
    texto: "Los asistentes, anónimos y en una posición inventada: la base no guarda dónde está nadie.",
    detalle:
      "Su posición sale de los lugares a los que van, nunca de una ubicación; quien solo sigue, queda entre los lugares que sigue y donde más tocan los artistas que sigue. Desde el 13 de octubre de 2026 (decisión del founder, solo para Administración) basta un «Voy» o un «Me interesa» para que salgan sus líneas, y quien solo sigue ya es un punto con sus líneas «sigue a». Siguen sin nombre, perfil ni foto.",
    manual: "asistentes",
  },
  yo: {
    titulo: "Yo",
    texto: "Marca tu propio punto entre los asistentes con un anillo y la palabra «Tú»; los demás siguen anónimos.",
    detalle: "Sin asistencias ni seguimientos tuyos no hay punto: el interruptor queda apagado. El navegador solo recibe el número de tu punto, nunca de qué cuenta es cada uno.",
    manual: "yo",
  },

  // ---------- Tiempo ----------
  tiempo: {
    titulo: "Tiempo",
    texto: "Una línea está activa si tiene un evento dentro de la ventana que termina en «Hasta»; lo demás se apaga.",
    detalle: "«Sigue a» no tiene fecha, así que se queda activa siempre; un punto que solo tiene líneas de ese tipo se apaga fuera del periodo. Para comparar dos momentos, mueve «Hasta» y mira cómo cambian el diagnóstico y la nube. El control cubre desde el primer evento de la base hasta el último.",
    manual: "tiempo",
  },
  ventana: { titulo: "Ventana", texto: "Cuánto tiempo hacia atrás cuenta desde «Hasta»: dos semanas, un mes, tres meses o todo." },
  hasta: { titulo: "Hasta", texto: "El día donde termina la ventana. Muévelo para ver cómo estaba la red en otro momento." },

  // ---------- Ajustes ----------
  ajustes: { titulo: "Ajustes", texto: "Solo cambian cómo se ve la escena. No tocan ningún dato." },
  "ajuste-tamano": {
    titulo: "Tamaño de las esferas",
    texto: "Agranda o encoge todas las esferas. El tamaño de cada una sale de sus seguidores y asistencias.",
  },
  "ajuste-altura": {
    titulo: "Altura de las capas",
    texto: "Separa más o menos las capas en vertical: artistas arriba, lugares en el suelo y asistentes debajo.",
  },
  "ajuste-sueltos": {
    titulo: "Mostrar sin conexión",
    texto: "Dibuja en el anillo de fuera a los artistas sin evento ni lugar. Apagado, van resumidos en un solo punto.",
  },
  "ajuste-lineas": {
    titulo: "Todas las líneas, tenues",
    texto: "Dibuja siempre todas las líneas, muy tenues; las del punto elegido van encima, más fuertes. Apagado, solo se ven las del elegido.",
  },

  // ---------- Cámara ----------
  "camara-izq": { titulo: "Girar a la izquierda", texto: "Gira la escena alrededor de su centro. Mantenlo pulsado para seguir girando." },
  "camara-der": { titulo: "Girar a la derecha", texto: "Gira la escena alrededor de su centro. Mantenlo pulsado para seguir girando." },
  "camara-arriba": { titulo: "Inclinar hacia arriba", texto: "Sube la cámara para ver más desde arriba. Mantenlo pulsado para seguir." },
  "camara-abajo": { titulo: "Inclinar hacia abajo", texto: "Baja la cámara para ver más de lado. Mantenlo pulsado para seguir." },
  "camara-mas": { titulo: "Acercar", texto: "Acerca la cámara. También puedes pellizcar o usar la rueda." },
  "camara-menos": { titulo: "Alejar", texto: "Aleja la cámara. También puedes pellizcar o usar la rueda." },
  "camara-centro": { titulo: "Volver al centro", texto: "Regresa la cámara a donde empezó, mirando el centro de la escena." },

  // ---------- Lo elegido ----------
  tarjeta: {
    titulo: "Tarjeta del punto elegido",
    texto: "Nombre, tipo y cuentas del punto que tocaste: seguidores, asistencias, eventos y cuántas conexiones tiene.",
    detalle:
      "«A dos pasos» cuenta los puntos que se alcanzan pasando por uno de sus vecinos. El resto de la escena se apaga para que se vean sus vecinos. Para soltarlo: la ✕, la tecla Esc o un toque en el vacío.",
    manual: "tarjeta",
  },
  lineas: {
    titulo: "Las líneas",
    texto: "Blancas entre tipos distintos; del color del tipo entre iguales; «sigue a», finas y tenues. Más gruesas, más eventos en común.",
    detalle:
      "Una línea está activa si tiene un evento dentro de la ventana de Tiempo. Las de una persona salen desde un solo «Voy» o «Me interesa» a un evento (al lugar o sitio, y a sus artistas). «Sigue a»: de una persona a un artista o a un lugar que sigue; es delgada, del color de persona atenuado, vale 1 y no tiene fecha. Entre iguales: las de dos lugares o sitios, el mismo festival; las de dos artistas, tocar juntos; las de dos asistentes, coincidir en eventos. Un sitio sin ficha se une a sus artistas, a sus asistentes y, si comparte festival, a otros lugares.",
    manual: "lineas",
  },
  "por-conectar": {
    titulo: "Punto «por conectar»",
    texto: "Un solo punto gris que resume a los artistas sin evento ni lugar: la lista para la siguiente tanda de invitaciones.",
    detalle: "«Mostrar sin conexión», en Ajustes, los dibuja uno por uno en el anillo exterior; el filtro «Sin conexión» los lista.",
    manual: "por-conectar",
  },

  // ---------- Diagnóstico ----------
  diagnostico: {
    titulo: "Diagnóstico",
    texto: "Frases con números de hoy sobre toda la red: artistas sin eventos, concentración, cúmulos aislados, zonas vacías, seguidores y sitios por dar de alta.",
    detalle:
      "La primera cuenta los artistas sin ningún evento registrado. La segunda, qué parte de los eventos con sede ocurre en solo cinco lugares y cuántos lugares no tienen ninguno. La tercera, cuántos cúmulos forman los lugares con eventos que no comparten ni un artista ni un festival entre sí. La cuarta, cuántas zonas de la ciudad no tienen un lugar a menos de 2 km. Si hay personas que siguen, otra frase dice cuántas siguen a alguien y cuántas solo siguen, sin haber dicho «Voy»; si hay sitios sin ficha, otra dice cuántos son y cuántos eventos tienen (cada uno es un lugar por dar de alta). Los sitios sin ficha no cuentan como lugares en las cuatro primeras. Si la ventana de Tiempo no es «Todo», una última frase cuenta las conexiones activas de ese periodo.",
    manual: "diagnostico",
  },
  lista: { titulo: "Lista", texto: "Abre el diagnóstico y la lista de lo que está a la vista o de la lente. Tocar un renglón elige ese punto." },
  renglon: { titulo: "Renglón de la lista", texto: "Toca para elegir ese punto en la escena: la cámara va a él. El número es cuántas conexiones tiene." },
  "datos-de": {
    titulo: "Datos de…",
    texto: "Cuándo se leyó la base para calcular lo que ves, y cuántos eventos, seguimientos y asistencias tenía entonces.",
  },
  copiar: { titulo: "Copiar lista", texto: "Copia el título y los renglones de la lista, en texto, para pegarlos donde quieras." },
};

/** Cómo se agrupan en el manual, en orden. Cada clave del diccionario va en un solo bloque. */
export const BLOQUES: { id: string; titulo: string; claves: string[] }[] = [
  { id: "barra", titulo: "La barra", claves: ["pantalla", "cifras", "fps", "tema", "manual", "actualizar"] },
  { id: "lecturas", titulo: "Lecturas", claves: ["mapa", "red", "arriba"] },
  { id: "lentes", titulo: "Lentes", claves: ["lentes", "lente-zonas", "lente-islas", "lente-mismo-sitio", "lente-puentes", "lente-festivales", "lente-por-conectar"] },
  {
    id: "filtrar",
    titulo: "Filtrar",
    claves: ["filtrar", "filtro-todo", "filtro-lugares", "filtro-tipo", "filtro-artistas", "filtro-con-lugar", "filtro-disciplina", "filtro-libres", "filtro-sitios", "filtro-sin-conexion", "filtro-asistentes"],
  },
  { id: "capas", titulo: "Capas y Yo", claves: ["capa-lugar", "sitio", "capa-artista", "capa-asistente", "yo"] },
  { id: "tiempo", titulo: "Tiempo", claves: ["tiempo", "ventana", "hasta"] },
  { id: "ajustes", titulo: "Ajustes", claves: ["ajustes", "ajuste-tamano", "ajuste-altura", "ajuste-sueltos", "ajuste-lineas"] },
  { id: "camara", titulo: "Cámara", claves: ["camara-izq", "camara-der", "camara-arriba", "camara-abajo", "camara-mas", "camara-menos", "camara-centro"] },
  { id: "elegido", titulo: "Lo elegido", claves: ["tarjeta", "lineas", "por-conectar"] },
  { id: "diagnostico", titulo: "Diagnóstico", claves: ["diagnostico", "lista", "renglon", "copiar", "datos-de"] },
];

/** La ruta del manual. */
export const RUTA_MANUAL = "/admin/grafo/manual";

/** Lo que pinta la página del manual: los bloques en orden, cada uno con sus entradas del diccionario y el `id` de su sección (el ancla del panel, o la clave). */
export function seccionesManual() {
  return BLOQUES.map((b) => ({
    id: `bloque-${b.id}`,
    titulo: b.titulo,
    entradas: b.claves.map((clave) => {
      const e = AYUDA[clave];
      return { id: e.manual ?? clave, titulo: e.titulo, texto: e.texto, detalle: e.detalle };
    }),
  }));
}
