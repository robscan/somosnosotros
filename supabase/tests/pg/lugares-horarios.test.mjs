import { randomUUID } from "node:crypto";

/**
 * OL-315 (bitácora 343, migración 20261006130000): el tipo «Café, bar o restaurante», la tabla `lugares_horarios` y sus dos funciones.
 * `crear_lugar_con_horario` da de alta el lugar con su horario en una transacción (si el horario no vale, el lugar no queda) y con quien llama
 * como autor; `guardar_horario_lugar` reemplaza el horario y solo la deja quien gestiona el lugar. Leer, como el lugar.
 */
const AUTORA = randomUUID();
const OTRA = randomUUID();
const ADMIN = randomUUID();

const datos = { nombre: "Café del Jardín OL-315", tipo: "cafe_bar", direccion: "Jardín Guerrero 12", lat: 22.15, lng: -100.97, descripcion: null, redes: [], portada: null, privado: false, detalle: null, ciudad: "San Luis Potosí", zona: "America/Mexico_City" };
const franjas = [
  { dias: [1, 2, 3, 4, 5], abre: "10:00", cierra: "14:00" },
  { dias: [1, 2, 3, 4, 5], abre: "16:00", cierra: "20:00" },
];

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('horarios-admin@local.test')");
  await query("insert into auth.users (id, email) values ($1, 'horarios-autora@local.test'), ($2, 'horarios-otra@local.test'), ($3, 'horarios-admin@local.test')", [AUTORA, OTRA, ADMIN]);
  const crear = (quien, d = datos, lista = franjas) => as("authenticated", quien, async () => (await query("select public.crear_lugar_con_horario($1::jsonb, $2::jsonb) as r", [JSON.stringify(d), JSON.stringify(lista)])).rows[0].r);
  const guardar = (quien, id, lista) => as("authenticated", quien, () => query("select public.guardar_horario_lugar($1::uuid, $2::jsonb)", [id, JSON.stringify(lista)]));
  const filas = async (id) => (await query("select dias, abre::text as abre, cierra::text as cierra from public.lugares_horarios where lugar_id = $1 order by abre", [id])).rows;
  const cuantos = async (nombre) => (await query("select count(*)::int as n from public.lugares where nombre = $1", [nombre])).rows[0].n;

  try {
    // --- El tipo nuevo está en la lista cerrada, junto a los de antes.
    const def = (await query("select pg_get_constraintdef(oid) as d from pg_constraint where conname = 'lugares_tipo_check' and conrelid = 'public.lugares'::regclass")).rows[0];
    check(def?.d.includes("'cafe_bar'") && def.d.includes("'plaza'") && def.d.includes("'museo'"), "lugares_tipo_check incluye cafe_bar, plaza y museo", def);

    // --- Alta con horario: el lugar (café) y sus dos franjas, con la autora de verdad aunque `p_datos` diga otra cosa.
    const creado = await crear(AUTORA, { ...datos, creado_por: OTRA });
    check(!!creado?.id && typeof creado.slug === "string" && creado.slug.length > 0, "crear_lugar_con_horario devuelve el id y el slug", creado);
    const lugar = (await query("select tipo, creado_por, ciudad from public.lugares where id = $1", [creado.id])).rows[0];
    check(lugar?.tipo === "cafe_bar", "un café se da de alta como «Café, bar o restaurante»", lugar);
    check(lugar?.creado_por === AUTORA, "el autor es quien llama, no lo que diga p_datos", lugar);
    const dos = await filas(creado.id);
    check(dos.length === 2 && dos[0].abre === "10:00:00" && dos[1].cierra === "20:00:00" && dos[0].dias.join() === "1,2,3,4,5", "las dos franjas quedan como se capturaron", dos);

    // --- Días repetidos se guardan una vez; cerrar antes de abrir (al día siguiente) se acepta.
    const bar = await crear(AUTORA, { ...datos, nombre: "Bar de la noche OL-315" }, [{ dias: [6, 5, 5], abre: "20:00", cierra: "02:00" }]);
    const noche = await filas(bar.id);
    check(noche.length === 1 && noche[0].dias.join() === "5,6" && noche[0].cierra === "02:00:00", "días repetidos una vez y cierre pasada la medianoche", noche);

    // --- Lo que no es un horario rechaza todo: el lugar tampoco queda.
    const rechazo = async (lista, etiqueta, codigo) => {
      const nombre = `Rechazado ${etiqueta}`;
      await expectError(() => crear(AUTORA, { ...datos, nombre }, lista), codigo, etiqueta);
      check((await cuantos(nombre)) === 0, `${etiqueta}: no deja el lugar a medias`);
    };
    await rechazo([{ dias: [8], abre: "10:00", cierra: "14:00" }], "un día fuera de la semana", "23514");
    await rechazo([{ dias: [], abre: "10:00", cierra: "14:00" }], "una franja sin días", "23514");
    await rechazo([{ dias: [1], abre: "10:00", cierra: "10:00" }], "abrir y cerrar a la misma hora", "23514");
    await rechazo([{ dias: [1], abre: "diez", cierra: "14:00" }], "una hora ilegible", "22007");
    await rechazo({ dias: [1] }, "un horario que no es lista", "22023");
    await rechazo(Array.from({ length: 51 }, () => ({ dias: [1], abre: "10:00", cierra: "14:00" })), "más de 50 franjas", "22023");

    // --- Alta sin horario (lista vacía): el lugar sin filas.
    const sin = await crear(AUTORA, { ...datos, nombre: "Sin horario OL-315" }, []);
    check((await filas(sin.id)).length === 0, "con la lista vacía el lugar queda sin horario");

    // --- Reemplazar: la autora y la administración; otra cuenta no, y no toca nada.
    await guardar(AUTORA, creado.id, [{ dias: [2, 3, 4, 5, 6, 7], abre: "10:00", cierra: "18:00" }]);
    check((await filas(creado.id)).length === 1, "guardar_horario_lugar reemplaza todas las franjas");
    await expectError(() => guardar(OTRA, creado.id, []), "42501", "otra cuenta no cambia el horario");
    check((await filas(creado.id)).length === 1, "el intento ajeno no borró nada");
    await guardar(ADMIN, creado.id, [...franjas, { dias: [6], abre: "16:00", cierra: "20:00" }]);
    check((await filas(creado.id)).length === 3, "la administración cambia el horario de cualquiera");
    await guardar(AUTORA, creado.id, []);
    check((await filas(creado.id)).length === 0, "la lista vacía deja el lugar sin horario");
    await guardar(AUTORA, creado.id, franjas);

    // --- Escritura directa en la tabla: solo quien gestiona el lugar.
    await as("authenticated", OTRA, () => expectError(() => query("insert into public.lugares_horarios (lugar_id, dias, abre, cierra) values ($1, '{1}', '10:00', '12:00')", [creado.id]), "42501", "otra cuenta no inserta franjas en un lugar ajeno"));
    await as("authenticated", AUTORA, () => query("insert into public.lugares_horarios (lugar_id, dias, abre, cierra) values ($1, '{7}', '10:00', '12:00')", [creado.id]));
    check((await filas(creado.id)).length === 3, "la autora escribe directo en su lugar");

    // --- Funciones: anon no las usa.
    await as("anon", null, () => expectError(() => query("select public.crear_lugar_con_horario($1::jsonb, '[]'::jsonb)", [JSON.stringify(datos)]), "42501", "anon no da de alta lugares con horario"));
    await as("anon", null, () => expectError(() => query("select public.guardar_horario_lugar($1::uuid, '[]'::jsonb)", [creado.id]), "42501", "anon no cambia horarios"));

    // --- Lectura: como el lugar. Visible, cualquiera; oculto, su autora y la administración.
    const visibles = (quien) => as(quien ? "authenticated" : "anon", quien, async () => (await query("select count(*)::int as n from public.lugares_horarios where lugar_id = $1", [creado.id])).rows[0].n);
    check((await visibles(null)) === 3 && (await visibles(OTRA)) === 3, "el horario de un lugar visible lo lee cualquiera, también sin sesión");
    await query("update public.lugares set visible = false where id = $1", [creado.id]);
    check((await visibles(null)) === 0 && (await visibles(OTRA)) === 0, "con el lugar oculto, el horario no se lee");
    check((await visibles(AUTORA)) === 3 && (await visibles(ADMIN)) === 3, "con el lugar oculto, su autora y la administración lo siguen leyendo");

    // --- Borrar el lugar se lleva su horario.
    await query("delete from public.lugares where id = $1", [creado.id]);
    check((await filas(creado.id)).length === 0, "borrar el lugar borra su horario (on delete cascade)");
  } finally {
    await query("delete from public.lugares where nombre like '%OL-315%' or nombre like 'Rechazado %'");
    await query("delete from auth.users where id = any($1::uuid[])", [[AUTORA, OTRA, ADMIN]]);
    await query("delete from public.admin_correos where correo = 'horarios-admin@local.test'");
  }
}
