// Congela `Date` en el proceso que lo carga (`node --require`): `RELOJ_FIJO` es el instante. La prueba (`medir-pantallas.mjs`) lo carga
// en el respaldo y en la app, y fija el mismo instante en el navegador: servidor y pantalla ven el mismo «ahora» y los mismos números
// cualquier día y a cualquier hora (los eventos del respaldo son relativos a hoy y unos pasan o entran a «Esta semana» con el reloj).
const AHORA = Date.parse(process.env.RELOJ_FIJO);
const Real = Date;
function Fijo(...args) {
  return new.target ? new Real(...(args.length ? args : [AHORA])) : new Real(AHORA).toString();
}
Fijo.prototype = Real.prototype;
Fijo.now = () => AHORA;
Fijo.parse = Real.parse;
Fijo.UTC = Real.UTC;
globalThis.Date = Fijo;
