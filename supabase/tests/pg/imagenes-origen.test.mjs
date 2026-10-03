import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { tablas } from '../../../scripts/ops/auditoria-ui/respaldo-local/fixture.mjs';

const STORAGE = 'https://viesoxgrfvftkgpjbnml.supabase.co/storage/v1/object/public/fotos/';
const EXTERNA = 'https://externa.example/foto.jpg';
const GOOGLE = 'https://lh3.googleusercontent.com/a/foto';
const casos = JSON.parse(readFileSync(new URL('../imagenes-origen.json', import.meta.url), 'utf8'));

export async function run({ query, check, as, expectError }) {
  const persona = randomUUID(), otra = randomUUID(), admin = randomUUID();
  const artista = randomUUID(), lugar = randomUUID(), evento = randomUUID();
  const altas = [];
  await query("insert into public.admin_correos(correo) values ('imagenes-admin@local.test')");
  await query("insert into auth.users(id,email) values ($1,'imagenes-persona@local.test'),($2,'imagenes-otra@local.test'),($3,'imagenes-admin@local.test')", [persona, otra, admin]);
  const campos = [['artistas','foto',artista],['artistas','portada',artista],['lugares','portada',lugar],['eventos','imagen',evento],['perfiles','foto',persona]];
  const guardar = (tabla, campo, id, valor) => query(`update public.${tabla} set ${campo}=$1 where id=$2 returning id`, [valor,id]);
  try {
    await as('authenticated', persona, async () => {
      await query("insert into public.artistas(id,nombre,creado_por) values ($1,'Imágenes H05',$2)", [artista,persona]);
      await query("insert into public.lugares(id,nombre,tipo,lat,lng,creado_por) values ($1,'Lugar imágenes H05','foro',22.13,-100.98,$2)", [lugar,persona]);
      await query("insert into public.eventos(id,titulo,lugar_id,inicio,creado_por) values ($1,'Evento imágenes H05',$2,now()+interval '1 day',$3)", [evento,lugar,persona]);
      for (const [tabla,campo,id] of campos) {
        await expectError(() => guardar(tabla,campo,id,EXTERNA), '23514', `${tabla}.${campo}: escritura directa externa rechazada`);
        await guardar(tabla,campo,id,`${STORAGE}pruebas/foto.jpg`);
        check((await query(`select ${campo} imagen from public.${tabla} where id=$1`,[id])).rows[0].imagen===`${STORAGE}pruebas/foto.jpg`, `${tabla}.${campo}: Storage propio admitido`);
        await guardar(tabla,campo,id,null);
      }
      const id=randomUUID(); altas.push(id);
      await query('insert into public.artistas(id,nombre,creado_por,foto,portada) values ($1,$2,$3,$4,$5)',[id,`Foto propia ${id}`,persona,`${STORAGE}foto.jpg`,`${STORAGE}portada.jpg`]);
      check((await query('select id from public.artistas where id=$1',[id])).rowCount===1,'INSERT propio admite foto y portada juntas');
      for (const campo of ['foto','portada']) {
        const id = randomUUID(); altas.push(id);
        await expectError(() => query(`insert into public.artistas(id,nombre,creado_por,${campo},origen) values ($1,$2,$3,$4,'capo')`,[id,`Alta ${id}`,persona,EXTERNA]), '23514', `INSERT artistas.${campo}: origen=capo no evade la regla`);
      }
      await expectError(() => query("insert into public.eventos(titulo,lugar_id,inicio,creado_por,imagen) values ('Alta imagen',$1,now()+interval '1 day',$2,$3)",[lugar,persona,EXTERNA]), '23514', 'INSERT eventos.imagen rechaza externo');
      await expectError(() => query("insert into public.lugares(nombre,tipo,lat,lng,creado_por,portada) values ('Alta lugar imagen','foro',22.3,-100.6,$1,$2)",[persona,EXTERNA]), '23514', 'INSERT lugares.portada rechaza externo');
    });

    const existe = (await query("select to_regprocedure('public.imagen_origen_permitido(text,boolean,boolean)') f")).rows[0].f;
    check(!!existe, 'función de frontera instalada');
    if (!existe) return; // permite registrar primero la reproducción sobre la base anterior
    for (const caso of casos) {
      const url = caso.url?.replace('{storage}', STORAGE) ?? null;
      const r = (await query('select public.imagen_origen_permitido($1,false,false) normal, public.imagen_origen_permitido($1,true,false) admin, public.imagen_origen_permitido($1,false,true) perfil',[url])).rows[0];
      check(r.normal===caso.normal && r.admin===caso.admin && r.perfil===(caso.perfil??caso.normal), 'gramática compartida TS/PG', caso.url);
    }
    // La autoridad permitida es exacta; no depende de nombres parecidos, puertos o GUC.
    for (const url of [STORAGE.replace('.supabase.co/', '.supabase.co.evil.example/'), STORAGE.replace('.co/', '.co:8443/'), STORAGE.replace('/fotos/', '/obras/'), STORAGE.replace('https://', 'https://usuario@')]) {
      await as('authenticated',persona,()=>expectError(()=>guardar('artistas','foto',artista,`${url}foto.jpg`),'23514','autoridad o bucket ajenos rechazados'));
    }
    await as('authenticated',persona,async()=>{
      await query("select set_config('request.jwt.claims','{\"role\":\"service_role\"}',false)");
      await expectError(()=>guardar('artistas','foto',artista,EXTERNA),'23514','claims sueltos no sustituyen al rol efectivo');
      await query("select set_config('request.jwt.claims','',false)");
      await guardar('perfiles','foto',persona,GOOGLE);
      await expectError(()=>guardar('artistas','foto',artista,GOOGLE),'23514','Google limitado a perfiles');
    });
    for (const [rol,uid] of [['authenticated',admin],['service_role',null]]) {
      await as(rol,uid,async()=>{
        const id=randomUUID(); altas.push(id);
        await query("insert into public.artistas(id,nombre,creado_por,origen,foto,portada) values ($1,$2,$3,'capo',$4,$4)",[id,`Importación ${id}`,uid,EXTERNA]);
        check((await query('select id from public.artistas where id=$1',[id])).rowCount===1,`${rol}: importación con ambas imágenes externas admitida`);
        for (const [tabla,campo,id] of campos) {
          await guardar(tabla,campo,id,`${EXTERNA}?rol=${rol}`);
          await expectError(()=>guardar(tabla,campo,id,'http://externa.example/foto'),'23514',`${rol}: tampoco admite HTTP en ${tabla}.${campo}`);
          await expectError(()=>guardar(tabla,campo,id,'https://usuario@externa.example/foto'),'23514',`${rol}: tampoco admite credenciales`);
        }
      });
    }
    await as('authenticated',persona,async()=>{
      for (const [tabla,campo,id] of campos) {
        await query(`update public.${tabla} set ${campo}=${campo} where id=$1`,[id]);
        await expectError(()=>guardar(tabla,campo,id,`${EXTERNA}?nueva=1`),'23514',`${tabla}.${campo}: histórica idéntica sí, nueva externa no`);
      }
      await query("update public.artistas set descripcion='Descripción editada' where id=$1",[artista]);
      await expectError(()=>query('update public.artistas set foto=$1,portada=$2 where id=$3',[`${STORAGE}nueva.jpg`,EXTERNA,artista]),'23514','cambio mixto de foto/portada se rechaza entero');
      check((await query('select foto from public.artistas where id=$1',[artista])).rows[0].foto.includes('?rol=service_role'),'fallo mixto no guarda parcialmente');
      for (const [tabla,campo,id] of campos) await guardar(tabla,campo,id,'');
    });
    for (const rol of ['anon','authenticated']) {
      await as(rol,otra,async()=>{
        for (const [tabla,campo,id] of campos) {
          check((await guardar(tabla,campo,id,`${STORAGE}otra.jpg`)).rowCount===0, `${rol}: no modifica imagen ajena aunque sea permitida`);
        }
      });
    }
    // Definer interno llamado por una cuenta no debe heredar la excepción de servicio.
    await query("create function public.ensayo_imagen_definer(i uuid) returns void language sql security definer set search_path='' as $$ update public.artistas set foto='https://externa.example/definer.jpg' where id=i $$");
    await as('authenticated',persona,()=>expectError(()=>query('select public.ensayo_imagen_definer($1)',[artista]),'23514','SECURITY DEFINER no convierte a una cuenta en servicio'));
    await query('drop function public.ensayo_imagen_definer(uuid)');

    // Fila anterior a la migración: sembrar un legado inválido en esta BD efímera, nunca en producción.
    await query('alter table public.artistas disable trigger artistas_imagen_origen');
    try { await guardar('artistas','foto',artista,'http://archivo.example/antigua.jpg'); }
    finally { await query('alter table public.artistas enable trigger artistas_imagen_origen'); }
    await as('authenticated',persona,async()=>{
      await query("update public.artistas set descripcion='Legado conservado',foto=foto where id=$1",[artista]);
      check((await query('select foto from public.artistas where id=$1',[artista])).rows[0].foto==='http://archivo.example/antigua.jpg','histórico HTTP sin cambio también se conserva');
      await expectError(()=>guardar('artistas','foto',artista,'http://archivo.example/otra.jpg'),'23514','cambiar un legado exige la regla nueva');
      await expectError(()=>query('alter table public.artistas disable trigger artistas_imagen_origen'),'42501','cuenta normal no puede desactivar la frontera');
    });

    for (const [foto,esperada] of [[GOOGLE,GOOGLE],[`${STORAGE}perfil.jpg`,`${STORAGE}perfil.jpg`],[EXTERNA,null],['javascript:alert(1)',null],[null,null]]) {
      const id=randomUUID(); altas.push(id);
      await query('insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)',[id,`${id}@local.test`,JSON.stringify({full_name:'Nombre conservado',avatar_url:foto,role:'admin'})]);
      const p=(await query('select nombre,foto,rol from public.perfiles where id=$1',[id])).rows[0];
      check(p.nombre==='Nombre conservado' && p.foto===esperada && p.rol==='usuario','registro conserva identidad/rol y sanea avatar sin abortar');
    }
    // Fixtures de QA no ejecutan SQL: comprobar aquí sus URLs con la frontera real del servicio.
    let imagenesQA=0;
    for (const [tabla,campo] of [['artistas','foto'],['artistas','portada'],['lugares','portada'],['eventos','imagen'],['perfiles','foto']]) {
      const urls=tablas[tabla].map(f=>f[campo]).filter(Boolean);
      imagenesQA+=urls.length;
      await as('service_role',null,async()=>{
        for (const url of urls) check((await query('select public.imagen_origen_permitido($1,true,$2) ok',[url,tabla==='perfiles'])).rows[0].ok,`fixture QA ${tabla}.${campo} compatible con servicio`);
      });
    }
    check(imagenesQA>0,'el control de compatibilidad recorrió imágenes reales del fixture');
    const permisos=(await query("select proname,prosecdef,proconfig,has_function_privilege('anon',oid,'execute') anon from pg_proc where oid=any(array['public.imagen_origen_permitido(text,boolean,boolean)'::regprocedure,'public.proteger_imagen_origen()'::regprocedure])")).rows;
    check(permisos.length===2 && permisos.every(p=>!p.prosecdef && !p.anon && p.proconfig.includes('search_path=""')),'frontera invoker, search_path vacío y sin RPC anónima');
  } finally {
    await query('delete from public.eventos where lugar_id=$1',[lugar]);
    await query('delete from public.lugares where creado_por=$1',[persona]);
    await query('delete from public.artistas where id=any($1::uuid[])',[[artista,...altas]]);
    await query('delete from auth.users where id=any($1::uuid[])',[[persona,otra,admin,...altas]]);
    await query("delete from public.admin_correos where correo='imagenes-admin@local.test'");
  }
}
