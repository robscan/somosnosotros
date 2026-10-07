import { randomUUID } from 'node:crypto';

export async function run({ query, as, check, expectError, connection }) {
  const existe = (await query("select to_regprocedure('public.impacto_borrado_lugar_admin(uuid)') is not null ok")).rows[0].ok;
  check(existe, 'OL259: existe consulta de impacto exclusiva de administración');
  if (!existe) return;
  const hijos = (await query("select conrelid::regclass::text tabla from pg_constraint where contype='f' and confrelid='public.lugares'::regclass order by tabla")).rows.map(r=>r.tabla.replace(/^public\./,''));
  // OL-315 (bitácora 343) revisó `lugares_horarios`: es el horario del propio lugar (on delete cascade) y se va con él, como su dirección; no es
  // contenido de nadie más ni cambia el impacto que se confirma.
  check(JSON.stringify(hijos)===JSON.stringify(['agendas_invitaciones_enviadas','contactos_importados','destacados','eventos','lugares_cuentas','lugares_horarios','obras_colectivas','seguimientos']), 'impacto cubre todas las FK del lugar; una dependencia nueva requiere revisar esta operación');
  const admin = randomUUID(), otra = randomUUID(), tercero = randomUUID();
  const lugares = [], eventos = [];
  await query("insert into public.admin_correos(correo) values ('ol259-admin@example.com')");
  await query("insert into auth.users(id,email,email_confirmed_at) values ($1,'ol259-admin@example.com',now()),($2,'ol259-otra@example.com',now()),($3,'ol259-tercero@example.com',now())", [admin, otra, tercero]);
  const crear = async ({ visible = true, privado = false, autor = otra } = {}) => {
    const id = randomUUID(); lugares.push(id);
    await query("insert into public.lugares(id,nombre,tipo,direccion,lat,lng,creado_por,visible,privado) values ($1,'Lugar OL259','otro','Dirección que no se copia',22,-100,$2,$3,$4)", [id, autor, visible, privado]);
    return id;
  };
  const evento = async (lugar, autor = otra, visible = true) => {
    const id = randomUUID(); eventos.push(id);
    await query("insert into public.eventos(id,lugar_id,titulo,inicio,fin,creado_por,visible) values ($1,$2,'Evento OL259',now()+interval '1 day',now()+interval '2 days',$3,$4)", [id,lugar,autor,visible]);
    return id;
  };
  const impacto = id => as('authenticated', admin, async () => (await query('select public.impacto_borrado_lugar_admin($1) i', [id])).rows[0].i);
  const ejecutar = (id, confirmacion, motivo = 'Lugar duplicado comprobado') => as('authenticated', admin, async () => (await query('select public.borrar_lugar_excepcional_admin($1,$2,$3) r', [id,confirmacion,motivo])).rows[0].r);
  try {
    const lugar = await crear(), e1 = await evento(lugar), e2 = await evento(lugar, null, false), e3 = await evento(lugar, admin);
    await query("insert into public.asistencias(usuario_id,evento_id,estado) values ($1,$2,'voy')", [tercero,e1]);
    await query('insert into public.seguimientos(usuario_id,lugar_id) values ($1,$2)', [tercero,lugar]);
    await query('insert into public.lugares_cuentas(perfil_id,lugar_id) values ($1,$2)', [otra,lugar]);
    const jobsAntes = (await query('select count(*)::int n from public.avisos_jobs')).rows[0].n;
    const antes = await impacto(lugar);
    await connection(async c => {
      await c.query('begin');
      try {
        await c.query("set local timezone='Asia/Tokyo'");
        await c.query("select set_config('request.jwt.claim.sub',$1,true)", [admin]);
        await c.query('set local role authenticated');
        check((await c.query('select public.impacto_borrado_lugar_admin($1) i',[lugar])).rows[0].i.confirmacion === antes.confirmacion, 'confirmación estable aunque cambie la zona de la conexión');
      } finally { await c.query('rollback'); }
    });
    for (const firma of ['public.impacto_borrado_lugar_admin(uuid)', 'public.borrar_lugar_excepcional_admin(uuid,text,text)']) {
      const f = (await query("select prosecdef,proconfig,has_function_privilege('anon',oid,'execute') anon,has_function_privilege('authenticated',oid,'execute') usuario,has_function_privilege('service_role',oid,'execute') servicio,pg_get_functiondef(oid) definicion from pg_proc where oid=$1::regprocedure",[firma])).rows[0];
      check(f.prosecdef && f.proconfig.includes('search_path=""') && !f.anon && f.usuario && !f.servicio, 'RPC tiene search_path vacío y solo sesión, con guarda admin interna');
      await connection(async c => {
        await c.query('begin');
        try {
          await c.query('create schema ol259_instalacion authorization authenticated');
          await c.query('set local role authenticated');
          await c.query(f.definicion.replace(`FUNCTION ${firma.split('(')[0]}`,`FUNCTION ol259_instalacion.${firma.split('(')[0].slice(7)}`));
          check(true, 'RPC se instala sin superusuario en conexión nueva');
        } catch (e) { check(false, `instalación sin superusuario: ${e.code}`); }
        finally { await c.query('rollback'); }
      });
    }
    check(antes.eventos === 3 && antes.ajenos === 2 && antes.seguimientos === 1 && antes.cuentas === 1 && antes.permitido && /^[a-f0-9]{64}$/.test(antes.confirmacion), 'impacto cuenta todos los eventos, incluso ocultos y sin autor');
    check((await query('select count(*)::int n from public.borrados_lugares_admin')).rows[0].n === 0, 'consultar impacto no escribe auditoría');
    for (const [rol, actor] of [['anon', null], ['authenticated', otra], ['authenticated', tercero], ['service_role', null]]) {
      await as(rol, actor, () => expectError(() => query('select public.impacto_borrado_lugar_admin($1)', [lugar]), '42501', `${rol} no consulta impacto sin administración`));
      await as(rol, actor, () => expectError(() => query('select public.borrar_lugar_excepcional_admin($1,$2,$3)', [lugar,antes.confirmacion,'Motivo comprobado']), '42501', `${rol} no ejecuta sin administración`));
    }
    await expectError(() => ejecutar(lugar, antes.confirmacion, 'x'), '22023', 'motivo insuficiente rechazado');
    await expectError(() => ejecutar(lugar, '0'.repeat(64)), '40001', 'confirmación que no corresponde al impacto rechazada');
    await query("update public.eventos set titulo='Cambio mientras se confirma' where id=$1", [e1]);
    await expectError(() => ejecutar(lugar, antes.confirmacion), '40001', 'editar un evento invalida el impacto aunque no cambie el conteo');
    const nuevo = await impacto(lugar);
    const r = await ejecutar(lugar, nuevo.confirmacion);
    check(r.ok && r.eventos === 3 && !r.repetido, 'ejecución confirma tres eventos conservados');
    check((await query('select id from public.lugares where id=$1', [lugar])).rowCount === 0, 'solo el lugar elegido se elimina');
    const filas = (await query('select * from public.eventos where id=any($1::uuid[]) order by id', [[e1,e2,e3]])).rows;
    check(filas.length === 3 && filas.every(e => e.lugar_id === null && e.sitio_texto === 'Lugar OL259' && e.sitio_direccion === null && e.sitio_lat === null && e.sitio_lng === null), 'eventos conservados sin dirección ni coordenadas copiadas');
    check(filas.find(e => e.id === e2).creado_por === null && !filas.find(e => e.id === e2).visible && filas.find(e => e.id === e1).visible, 'autoría y visibilidad de eventos públicos/ocultos se conservan');
    check((await query('select 1 from public.asistencias where evento_id=$1', [e1])).rowCount === 1, 'asistencias del evento se conservan');
    check((await query('select count(*)::int n from public.avisos_jobs')).rows[0].n === jobsAntes, 'desvinculación no genera avisos masivos');
    check((await ejecutar(lugar,nuevo.confirmacion)).repetido, 'reintento devuelve el cierre sin borrar otra vez');
    const audit = (await query('select * from public.borrados_lugares_admin')).rows[0];
    check(audit.actor === admin && audit.lugar_id === lugar && audit.conteos.eventos === 3 && audit.motivo === 'Lugar duplicado comprobado', 'auditoría conserva actor, fecha, motivo y conteos');
    await as('authenticated', otra, async () => check((await query('select * from public.borrados_lugares_admin')).rowCount === 0, 'terceros no leen auditoría'));
    await as('authenticated', admin, () => expectError(() => query('delete from public.borrados_lugares_admin'), '42501', 'admin no borra auditoría por API directa'));
    for (const flags of [{visible:false}, {privado:true}]) {
      const id = await crear(flags), e = await evento(id);
      const i = await impacto(id);
      check(i.por_ocultar === 1, 'impacto advierte que preservará privacidad al desvincular');
      await ejecutar(id,i.confirmacion);
      const fila = (await query('select * from public.eventos where id=$1',[e])).rows[0];
      check(!fila.visible && fila.sitio_texto === 'Lugar retirado' && fila.sitio_lat === null, 'desvincular lugar oculto/privado no publica su nombre o pin ni activa el evento');
    }
    const bloqueado = await crear();
    await query("insert into public.contactos_importados(lugar_id,correo) values ($1,'sintetico@example.com')", [bloqueado]);
    const bloqueo = await impacto(bloqueado);
    check(!bloqueo.permitido && bloqueo.contactos === 1, 'impacto bloquea contactos importados para no borrarlos por cascada');
    await expectError(() => ejecutar(bloqueado,bloqueo.confirmacion), '23503', 'no ejecuta con dependencias históricas pendientes');
    check((await query('select 1 from public.lugares where id=$1',[bloqueado])).rowCount === 1, 'fallo conserva lugar completo');
    const conObra = await crear(), conInvitacion = await crear();
    await query("insert into public.obras_colectivas(lugar_id,nombre,cierra_en,creado_por) values ($1,'Obra sintética',now()+interval '1 day',$2)",[conObra,admin]);
    await query("insert into public.agendas_invitaciones_enviadas(lugar_id,correo_hash,tipo) values ($1,$2,'tanda')",[conInvitacion,randomUUID().replaceAll('-','').repeat(2)]);
    for (const id of [conObra,conInvitacion]) {
      const i=await impacto(id);
      check(!i.permitido && i.obras+i.invitaciones === 1, 'obra e invitación bloquean antes de ejecutar');
      await expectError(()=>ejecutar(id,i.confirmacion),'23503','no elimina obra ni historial por cascada');
    }
    // Un error al escribir la auditoría revierte también el lugar y sus vínculos.
    const reversible = await crear(), er = await evento(reversible);
    const ir = await impacto(reversible);
    await connection(async c => {
      await c.query('begin');
      try {
        await c.query("create function public.ol259_fallo_auditoria() returns trigger language plpgsql as $$ begin raise exception 'fallo_sintetico' using errcode='23514'; end $$");
        await c.query('create trigger ol259_fallo before insert on public.borrados_lugares_admin for each row execute function public.ol259_fallo_auditoria()');
        await c.query("select set_config('request.jwt.claim.sub',$1,true)",[admin]);
        await c.query('set local role authenticated');
        await c.query('savepoint antes_borrar');
        try {
          await c.query('select public.borrar_lugar_excepcional_admin($1,$2,$3)',[reversible,ir.confirmacion,'Debe revertirse todo']);
          check(false,'auditoría debe fallar en esta simulación');
        } catch (e) {
          await c.query('rollback to savepoint antes_borrar');
          check(e.code==='23514','fallo de auditoría conservado');
          check((await c.query('select lugar_id from public.eventos where id=$1',[er])).rows[0].lugar_id===reversible,'fallo de auditoría revierte desvinculación y conserva evento/lugar');
        }
      } finally { await c.query('rollback'); }
    });
    // Cambiar la composición después de confirmar debe invalidar el plan.
    const concurrente = await crear();
    await evento(concurrente);
    const i = await impacto(concurrente);
    await evento(concurrente);
    await expectError(() => ejecutar(concurrente,i.confirmacion), '40001', 'alta de evento entre impacto y ejecución obliga a revisar otra vez');
    const vigente = await impacto(concurrente);
    await connection(async c => {
      await c.query('begin');
      try {
        await c.query("select set_config('request.jwt.claim.sub',$1,true)",[admin]);
        await c.query('set local role authenticated');
        await c.query('select public.borrar_lugar_excepcional_admin($1,$2,$3)',[concurrente,vigente.confirmacion,'Cierre concurrente comprobado']);
        await query("set lock_timeout='150ms'");
        await expectError(() => evento(concurrente), '55P03', 'una nueva vinculación espera mientras se elimina el lugar');
        await c.query('commit');
      } finally { await c.query('rollback'); await query('set lock_timeout=0'); }
    });
    check((await query("select confdeltype from pg_constraint where conname='eventos_lugar_id_fkey'")).rows[0].confdeltype === 'r', 'FK de eventos sigue RESTRICT');
  } finally {
    await query('delete from public.borrados_lugares_admin where actor=$1', [admin]);
    await query('delete from public.eventos where id=any($1::uuid[])', [eventos]);
    await query('delete from public.lugares where id=any($1::uuid[])', [lugares]);
    await query('delete from auth.users where id=any($1::uuid[])', [[admin,otra,tercero]]);
    await query("delete from public.admin_correos where correo='ol259-admin@example.com'");
  }
}
