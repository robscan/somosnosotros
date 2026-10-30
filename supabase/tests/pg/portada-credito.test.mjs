// OL-491 (bitácora 523): el crédito de la portada de lugares y artistas (migración 20261029300000_portada_credito.sql). La columna se lee y se
// escribe como `portada`: la lee quien ve la ficha (anónimo incluido, si es visible y pública) y la escribe quien la edita (su autor, su cuenta
// ligada y la administración); nadie más. Texto corto en una línea: de 1 a 160, sin saltos. Datos sintéticos en una transacción que se deshace.
const id = (n) => `00000000-0000-4000-8000-00000491${String(n).padStart(4, '0')}`;
const CREDITO = 'Pablo Pérez · CC BY-SA 4.0 (https://commons.wikimedia.org/wiki/File:Prueba_OL491.jpg)';

export async function run({ as, check, expectError, query }) {
  await query('begin');
  try {
    const [admin, autora, ligada, otra] = [1, 2, 3, 4].map(id);
    await query("insert into public.admin_correos (correo) values ('ol491-admin@local.test')");
    for (const [u, correo] of [[admin, 'ol491-admin'], [autora, 'ol491-autora'], [ligada, 'ol491-ligada'], [otra, 'ol491-otra']]) {
      await query('insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())', [u, `${correo}@local.test`]);
    }

    // ---------- la columna: texto opcional en las dos tablas ----------
    const { rows: cols } = await query(
      "select table_name, data_type, is_nullable from information_schema.columns where table_schema = 'public' and column_name = 'portada_credito' order by table_name",
    );
    check(JSON.stringify(cols) === JSON.stringify([
      { table_name: 'artistas', data_type: 'text', is_nullable: 'YES' },
      { table_name: 'lugares', data_type: 'text', is_nullable: 'YES' },
    ]), 'lugares y artistas tienen portada_credito, texto y opcional', cols);

    const lugar = id(10), oculto = id(11), privado = id(12), artista = id(20), artistaOculto = id(21);
    await query(
      `insert into public.lugares (id, nombre, tipo, lat, lng, ciudad, creado_por, portada, visible, privado) values
        ($1, 'Museo OL491', 'museo', 22.15, -100.98, 'Banco OL491', $4, null, true, false),
        ($2, 'Galería oculta OL491', 'galeria', 22.15, -100.98, 'Banco OL491', $4, null, false, false),
        ($3, 'Cochera privada OL491', 'otro', 22.15, -100.98, 'Banco OL491', $4, null, true, true)`,
      [lugar, oculto, privado, autora],
    );
    await query(
      `insert into public.artistas (id, nombre, disciplina, ciudad, creado_por, portada, visible) values
        ($1, 'Artista OL491', 'musica', 'Banco OL491', $3, null, true),
        ($2, 'Artista oculta OL491', 'musica', 'Banco OL491', $3, null, false)`,
      [artista, artistaOculto, autora],
    );
    await query('insert into public.lugares_cuentas (lugar_id, perfil_id) values ($1, $2)', [lugar, ligada]);
    await query('insert into public.artistas_cuentas (artista_id, perfil_id) values ($1, $2)', [artista, ligada]);
    const nada = await query('select portada_credito from public.lugares where id = $1', [lugar]);
    check(nada.rows[0]?.portada_credito === null, 'sin crédito de entrada (nula)', nada.rows[0]);

    for (const [tabla, fila, ocultaFila] of [['lugares', lugar, oculto], ['artistas', artista, artistaOculto]]) {
      const escribir = (quien, valor, cual = fila) => as('authenticated', quien, () => query(`update public.${tabla} set portada_credito = $1 where id = $2 returning portada_credito`, [valor, cual]));
      const leer = (rol, quien, cual = fila) => as(rol, quien, () => query(`select portada_credito from public.${tabla} where id = $1`, [cual]));

      // ---------- quién lo escribe: lo mismo que la portada ----------
      const porAutora = await escribir(autora, CREDITO);
      check(porAutora.rowCount === 1 && porAutora.rows[0].portada_credito === CREDITO, `${tabla}: su autora escribe el crédito`, porAutora.rows);
      const porLigada = await escribir(ligada, 'Ana López · CC BY 4.0');
      check(porLigada.rowCount === 1, `${tabla}: la cuenta ligada también`, porLigada.rows);
      const porOtra = await escribir(otra, 'Me lo robo · CC0');
      check(porOtra.rowCount === 0, `${tabla}: otra cuenta no lo toca`, porOtra.rows);
      const porAnon = await as('anon', null, () => query(`update public.${tabla} set portada_credito = 'Anónimo' where id = $1 returning id`, [fila]));
      check(porAnon.rowCount === 0, `${tabla}: anónimo no lo toca`);
      const porAdmin = await escribir(admin, CREDITO);
      check(porAdmin.rowCount === 1 && porAdmin.rows[0].portada_credito === CREDITO, `${tabla}: la administración sí`, porAdmin.rows);

      // ---------- quién lo lee: quien ve la ficha ----------
      const anon = await leer('anon', null);
      check(anon.rowCount === 1 && anon.rows[0].portada_credito === CREDITO, `${tabla}: anónimo lee el crédito de una ficha visible`, anon.rows);
      const otraLee = await leer('authenticated', otra);
      check(otraLee.rows[0]?.portada_credito === CREDITO, `${tabla}: cualquier cuenta también`);
      await escribir(admin, 'Crédito de la oculta', ocultaFila);
      const ocultaAnon = await leer('anon', null, ocultaFila);
      check(ocultaAnon.rowCount === 0, `${tabla}: el de una ficha oculta no lo lee anónimo`);
      const ocultaAutora = await leer('authenticated', autora, ocultaFila);
      check(ocultaAutora.rows[0]?.portada_credito === 'Crédito de la oculta', `${tabla}: su autora sí`, ocultaAutora.rows);

      // ---------- la forma: de 1 a 160, en una línea ----------
      // (como dueña de la base y con un punto de guardado: el error deshace solo ese intento; la regla es la misma para cualquiera)
      const rechaza = async (valor, etiqueta) => {
        await query('savepoint antes_del_error');
        await expectError(() => query(`update public.${tabla} set portada_credito = $1 where id = $2`, [valor, fila]), '23514', etiqueta);
        await query('rollback to savepoint antes_del_error');
      };
      await rechaza('x'.repeat(161), `${tabla}: 161 letras no caben`);
      await rechaza('', `${tabla}: vacío no (nulo es «sin crédito»)`);
      await rechaza('Pablo\nPérez', `${tabla}: con salto de línea no`);
      const justo = await escribir(autora, 'é'.repeat(160));
      check(justo.rowCount === 1, `${tabla}: 160 letras (con acento) sí`);
      const borrar = await escribir(autora, null);
      check(borrar.rowCount === 1 && borrar.rows[0].portada_credito === null, `${tabla}: se borra con nulo`);
    }

    // Un lugar privado: su crédito solo lo ve quien ve el lugar.
    await query("update public.lugares set portada_credito = 'Privado · CC BY' where id = $1", [privado]);
    const privAnon = await as('anon', null, () => query('select portada_credito from public.lugares where id = $1', [privado]));
    check(privAnon.rowCount === 0, 'el crédito de un lugar privado no lo lee anónimo');
    const privOtra = await as('authenticated', otra, () => query('select portada_credito from public.lugares where id = $1', [privado]));
    check(privOtra.rowCount === 0, 'ni otra cuenta');
  } finally {
    await query('rollback');
  }
}
