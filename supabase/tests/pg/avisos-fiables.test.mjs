import { randomUUID } from "node:crypto";

export async function run({ as, query, check, expectError, connection }) {
  const AUTHOR = randomUUID(), USER = randomUUID(), OTHER = randomUUID(), ROOT = randomUUID();
  await query("insert into public.admin_correos values('outbox-root@local.test')");
  await query(`insert into auth.users(id,email) values ($1,'outbox-author@local.test'),($2,'outbox-user@local.test'),
    ($3,'outbox-other@local.test'),($4,'outbox-root@local.test')`, [AUTHOR, USER, OTHER, ROOT]);
  const datos = { titulo: "Outbox", inicio: new Date(Date.now()+3*86400000).toISOString(), fin: null,
    lugar_id: null, sitio_texto: "Zona publica", sitio_lat: null, sitio_lng: null, sitio_reservado: true,
    sitio_revelar_desde: new Date(Date.now()+2*86400000).toISOString(), ciudad: "Outbox", zona: "America/Mexico_City",
    descripcion: null, imagen: null, precio: null, enlace: null };
  const privado = { direccion: "NO DEBE VIAJAR", lat: 22.123456, lng: -100.98765, indicaciones: "SECRETO", revelar_desde: datos.sitio_revelar_desde };
  const artist = (await as("authenticated", AUTHOR, () => query(`insert into public.artistas(nombre,disciplina,creado_por)
    values('Outbox artista','musica',auth.uid()) returning id`))).rows[0].id;
  const op = randomUUID();
  const rpcSql = "select public.guardar_evento_con_avisos($1,$2::jsonb,$3::jsonb,$4::jsonb,$5,$6) as r";
  const guardar = (id, payload=datos, address=privado, revision=null, operation=op, quien=[{ id: artist, nombre: "Outbox artista" }]) =>
    as("authenticated", AUTHOR, () => query(rpcSql,[id,JSON.stringify(payload),JSON.stringify(address),JSON.stringify(quien),revision,operation]));
  const jobs = async (id) => (await query("select *,revision::text as revision from public.avisos_jobs where evento_id=$1 order by creado_en,id", [id])).rows;
  const servicio = (sql, args) => as("service_role", null, () => query(sql, args));
  const expandir = async () => { for(let n=0; n<100; n++) if (!(await servicio("select public.avisos_expandir() as r")).rows[0].r) return; throw new Error("expansion no termina"); };
  const tomar = async () => (await servicio("select public.avisos_tomar() as r")).rows[0].r;
  const autorizar = async (c) => (await servicio("select public.avisos_autorizar($1,$2) as r",[c.id,c.token])).rows[0].r;
  const terminar = async (c, result="enviada") => (await servicio("select public.avisos_terminar($1,$2,$3,'prueba') as r",[c.id,c.token,result])).rows[0].r;
  // Los datos de bancos anteriores no se envian; solo se aisla su cola en esta DB efimera.
  await query("update public.avisos_jobs set estado='obsoleto',expandido=true");

  check(!(await query("select capturar or entregar or corte is not null or recordatorios_desde is not null as activo from public.avisos_config")).rows[0].activo,
    "migracion deja captura, entrega y recordatorios apagados");
  await expectError(()=>guardar(null),"55000","app nueva falla cerrada antes de activar captura");
  check((await jobs(op)).length===0 && !(await query("select id from public.eventos where id=$1",[op])).rowCount,"corte apagado revierte evento y job");
  await query("update public.avisos_config set capturar=true,corte=clock_timestamp()+interval '1 hour'");
  await expectError(()=>guardar(null),"55000","frontera futura no admite guardados prematuros");
  await query("update public.avisos_config set corte=clock_timestamp()");
  const legacy=(await as("authenticated",AUTHOR,()=>query("insert into public.eventos(titulo,inicio,sitio_texto,creado_por) values('Legacy',clock_timestamp()+interval '2 days','Sitio',auth.uid()) returning id"))).rows[0].id;
  check((await jobs(legacy)).length===0,"deployment viejo no encola durante convivencia");
  await as("authenticated",AUTHOR,()=>query("update public.eventos set inicio=inicio+interval '1 hour' where id=$1",[legacy]));
  check((await jobs(legacy)).length===0,"edicion legada conserva exclusivamente su after");
  await query("delete from public.avisos_origen where evento_id=$1",[legacy]);

  const bad = randomUUID();
  await expectError(() => guardar(null,datos,privado,null,bad,[{id:randomUUID(),nombre:"No existe"}]),"42501","fallo final de artistas revierte todo");
  check((await jobs(bad)).length===0 && (await query("select * from public.avisos_origen where evento_id=$1",[bad])).rowCount===0,
    "rollback no deja job ni consume cuota");
  await as("authenticated", AUTHOR, async () => {
    await query("begin");
    try {
      await query(rpcSql,[null,JSON.stringify(datos),JSON.stringify(privado),JSON.stringify([{id:artist,nombre:"Outbox artista"}]),null,op]);
      await connection(async (c) => check((await c.query("select * from public.avisos_jobs where evento_id=$1",[op])).rowCount===0,
        "otro worker no ve el job antes del commit"));
      await query("commit");
    } catch(e) { await query("rollback"); throw e; }
  });
  const inicial = (await jobs(op))[0];
  check((await jobs(op)).length===1 && inicial.tipo==='nuevo_evento',"evento y privado coalescen en un solo job de alta");
  check((await query("select actualizado_en=$2::timestamptz as ok from public.eventos where id=$1",[op,inicial.revision])).rows[0].ok,
    "revision del job incluye el cambio privado final");
  check((await guardar(null)).rows[0].r.repetido && (await jobs(op)).length===1,"reintento de alta no duplica job");
  check((await query("select coalesce(current_setting('app.avisos_outbox',true),'')<>'on' as r")).rows[0].r,"wrapper restaura marca transaccional");
  await as("anon",null,()=>expectError(()=>query(rpcSql,[null,JSON.stringify(datos),JSON.stringify(privado),'[]',null,randomUUID()]),'42501','anon no invoca wrapper'));
  await as("authenticated",OTHER,()=>expectError(()=>query(rpcSql,[op,JSON.stringify(datos),JSON.stringify(privado),'[]',inicial.revision,randomUUID()]),'42501','wrapper conserva permisos del evento ajeno'));

  await query("update public.perfiles set avisos_correo=true,avisos_push=true where id=$1",[USER]);
  await query("insert into public.seguimientos(usuario_id,artista_id) values($1,$2),($3,$2)",[USER,artist,AUTHOR]);
  const key=Buffer.concat([Buffer.from([4]),Buffer.alloc(64)]).toString("base64url"), auth=Buffer.alloc(16).toString("base64url");
  await as("authenticated",USER,()=>query(`insert into public.suscripciones_push(endpoint,usuario_id,p256dh,auth)
    values('https://fcm.googleapis.com/fcm/send/outbox1',auth.uid(),$1,$2),('https://fcm.googleapis.com/fcm/send/outbox2',auth.uid(),$1,$2)`,[key,auth]));
  await expandir();
  const deliveries=(await query("select * from public.avisos_entregas where job_id=$1",[inicial.id])).rows;
  check((await query("select contenido_en>=creado_en and contenido_en<vence as r from public.avisos_jobs where id=$1",[inicial.id])).rows[0].r,"texto relativo queda anclado a materializacion, no al guardado");
  check(await tomar()===null,"captura habilitada no autoriza entrega");
  await query("update public.avisos_config set entregar=true");
  check((await servicio("select public.avisos_recordatorios() as r")).rows[0].r===0,"recordatorios requieren habilitacion separada");
  await query("update public.avisos_config set recordatorios_desde=clock_timestamp()");
  check(deliveries.length===3 && deliveries.every(d=>d.usuario_id===USER),"artista final llega al worker; autor excluido; correo y dos endpoints separados");
  const snapshot=JSON.stringify((await jobs(op))[0].contenido);
  check(!snapshot.includes(privado.direccion) && !snapshot.includes(privado.indicaciones) && !snapshot.includes(String(privado.lat)),"ningun campo privado entra al payload");

  const c1=await tomar(), c2=await tomar(), c3=await tomar();
  await query("update public.avisos_config set entregar=false");
  check(await autorizar(c1)===null,"desactivar entrega cerca claims ya tomados antes de HTTP");
  await query("update public.avisos_config set entregar=true");
  check(new Set([c1.id,c2.id,c3.id]).size===3 && await tomar()===null,"claims sin repetir una entrega");
  for (const c of [c1,c2,c3]) {
    const d=await autorizar(c);
    if(d.canal!=='push') continue;
    await query('begin');
    try {
      await query('delete from public.suscripciones_push where endpoint=$1',[d.suscripcion.endpoint]);
      check(await autorizar(c)===null,'endpoint retirado despues del claim no recibe HTTP');
    } finally { await query('rollback'); }
    break;
  }
  const prepared=(await servicio("select public.avisos_preparar($1,$2,'cuerpo estable') as r",[c1.id,c1.token])).rows[0].r;
  check(prepared===(await servicio("select public.avisos_preparar($1,$2,'cuerpo distinto') as r",[c1.id,c1.token])).rows[0].r,"CAS conserva primer cuerpo sin cambiar contenido");
  check(!await terminar({...c1,token:randomUUID()}),"token ajeno no confirma entrega");
  await terminar(c1); await terminar(c2); await terminar(c3,'reintentar');
  check(await tomar()===null,"backoff impide retry inmediato");
  await query("update public.avisos_entregas set disponible=clock_timestamp()-interval '1 second' where id=$1",[c3.id]);
  const retry=await tomar();
  check(retry.id===c3.id && retry.token!==c3.token && !await terminar(c3),"solo falla parcial se reclama; token anterior queda cercado");
  await terminar(retry);

  // Una edicion de fecha + direccion es una sola revision notificada, ambos.
  await query("insert into public.asistencias(usuario_id,evento_id,estado) values($1,$2,'voy'),($3,$2,'voy')",[USER,op,OTHER]);
  const rev=(await query("select actualizado_en::text as r from public.eventos where id=$1",[op])).rows[0].r;
  const opEdit=randomUUID(), nuevos={...datos,inicio:new Date(Date.now()+4*86400000).toISOString()};
  await guardar(op,nuevos,{...privado,direccion:"OTRA DIRECCION"},rev,opEdit);
  let changes=(await jobs(op)).filter(j=>j.tipo==='cambio');
  check(changes.length===1 && changes[0].cuando && changes[0].donde,"fecha y direccion se coalescen como ambos");
  await guardar(op,nuevos,{...privado,direccion:"OTRA DIRECCION"},rev,opEdit);
  check((await jobs(op)).filter(j=>j.tipo==='cambio').length===1,"reintento de edicion no crea otra novedad/job");
  await expandir(); await expandir();
  check((await query("select * from public.novedades where aviso_job_id=$1",[changes[0].id])).rowCount===2,"novedades una por job/persona, incluso sin consentimiento de canales");
  const before=(await query("select actualizado_en::text as r from public.eventos where id=$1",[op])).rows[0].r;
  await as("authenticated",AUTHOR,()=>query("delete from public.eventos_sitio_privado where evento_id=$1",[op]));
  const after=(await query("select actualizado_en::text as r from public.eventos where id=$1",[op])).rows[0].r;
  check(before!==after,"SQL privado directo cambia revision del padre");
  await expectError(()=>guardar(op,nuevos,privado,before,randomUUID()),"40001","formulario anterior al cambio privado no sobreescribe");
  await guardar(op,nuevos,privado,after,randomUUID());
  changes=(await jobs(op)).filter(j=>j.tipo==='cambio');
  check(changes.at(-1).donde,"reparar direccion ausente encola donde");
  await query("update public.avisos_jobs set vence=clock_timestamp()-interval '1 hour' where id=$1",[changes.at(-1).id]);
  await expandir();
  check((await query("select * from public.novedades where aviso_job_id=$1",[changes.at(-1).id])).rowCount===2,"historia durable aun si el aviso externo caduco");
  check((await query("select * from public.novedades where aviso_job_id=$1",[changes[0].id])).rowCount===2,"cambio posterior no borra historia anterior");

  // Catalogo cerrado aun para admin de la app; no RPC cliente de encolado.
  for(const [role,subject] of [["anon",null],["authenticated",USER],["authenticated",ROOT]]) {
    for(const table of ['avisos_config','avisos_jobs','avisos_entregas','avisos_origen','avisos_slots']) {
      await as(role,subject,()=>expectError(()=>query(`select * from public.${table}`),'42501',`${role} no ve ${table}`));
    }
    for(const call of ["avisos_tomar()","avisos_expandir()","avisos_recordatorios()","avisos_estado()",`avisos_encolar('${op}',true,true,true)`,
      `avisos_autorizar('${randomUUID()}','${randomUUID()}')`,`avisos_preparar('${randomUUID()}','${randomUUID()}','x')`,
      `avisos_terminar('${randomUUID()}','${randomUUID()}','enviada','x')`]) {
      await as(role,subject,()=>expectError(()=>query(`select public.${call}`),'42501',`${role} no invoca ${call.split('(')[0]}`));
    }
  }
  const imported=(await query("insert into public.eventos(titulo,inicio,sitio_texto,creado_por) values('Importado',clock_timestamp()+interval '3 hours','Sitio',$1) returning id",[AUTHOR])).rows[0].id;
  check((await jobs(imported)).length===0,"importacion service uid null no crea notificaciones");
  await servicio("select public.avisos_recordatorios()");
  check((await jobs(imported)).length===0,"cron no notifica importacion sin Voy");
  await query("insert into public.asistencias(usuario_id,evento_id,estado) values($1,$2,'voy')",[USER,imported]);
  const existing=(await query("insert into public.eventos(titulo,inicio,sitio_texto,creado_por,creado_en) values('Existente futuro',clock_timestamp()+interval '4 hours','Sitio',$1,clock_timestamp()-interval '20 days') returning id",[AUTHOR])).rows[0].id;
  // Reproduce el catalogo de un evento anterior al backfill de 24 h: sin origen.
  await query("delete from public.avisos_origen where evento_id=$1",[existing]);
  const past=(await query("insert into public.eventos(titulo,inicio,sitio_texto,creado_por) values('Pasado',clock_timestamp()-interval '1 day','Sitio',$1) returning id",[AUTHOR])).rows[0].id;
  await query("insert into public.asistencias(usuario_id,evento_id,estado) values($1,$2,'voy'),($1,$3,'voy')",[USER,existing,past]);
  await servicio("select public.avisos_recordatorios()");
  check((await jobs(imported)).some(j=>j.tipo==='recordatorio'),"futuro importado con Voy recibe recordatorio, nunca anuncio historico");
  check((await jobs(existing)).some(j=>j.tipo==='recordatorio'),"futuro preexistente mayor a 24 h sin origen conserva recordatorio");
  check((await jobs(past)).length===0,"pasado con Voy nunca recibe recordatorio");
  await query("insert into public.avisos_enviados(usuario_id,evento_id,tipo) values($1,$2,'recordatorio')",[USER,existing]);
  await expandir();
  check(!(await query("select d.id from public.avisos_entregas d join public.avisos_jobs j on j.id=d.job_id where j.evento_id=$1",[existing])).rowCount,
    "recordatorio legado entregado antes del corte no se repite");

  // Cuota persistente bajo escritores reales simultaneos, independiente del conteo REST.
  const CAPPED=randomUUID(); await query("insert into auth.users(id,email) values($1,'outbox-cap@local.test')",[CAPPED]);
  const created=await Promise.all(Array.from({length:6},()=>connection(async c=>{
    await c.query("set role authenticated"); await c.query("select set_config('request.jwt.claim.sub',$1,false)",[CAPPED]);
    await c.query("select set_config('app.avisos_outbox','on',false)");
    return (await c.query("insert into public.eventos(titulo,inicio,sitio_texto,creado_por) values('Cuota',clock_timestamp()+interval '2 days','Sitio',auth.uid()) returning id")).rows[0].id;
  })));
  const cappedJobs=(await query("select estado,count(*)::int as n from public.avisos_jobs where evento_id=any($1::uuid[]) group by estado",[created])).rows;
  check(cappedJobs.find(x=>x.estado==='pendiente')?.n===3 && cappedJobs.find(x=>x.estado==='suprimido')?.n===3,"seis altas concurrentes solo permiten tres avisos");
  await as("authenticated",CAPPED,()=>query("delete from public.eventos where id=any($1::uuid[])",[created]));
  const capPayload={...datos,sitio_reservado:false,sitio_revelar_desde:null};
  await as("authenticated",CAPPED,()=>expectError(()=>query(rpcSql,[null,JSON.stringify(capPayload),'null','[]',null,created[0]]),'23505','operacion de evento borrado encuentra tombstone y no recrea'));
  check(!(await query("select id from public.eventos where id=$1",[created[0]])).rowCount && !(await jobs(created[0])).length,"tombstone revierte recreacion y job completos");
  const seventh=(await as("authenticated",CAPPED,()=>query(rpcSql,[null,JSON.stringify(capPayload),'null','[]',null,randomUUID()]))).rows[0].r.id;
  check((await jobs(seventh))[0].estado==='suprimido',"borrar publicaciones no restablece la cuota");
  await as("authenticated",CAPPED,async()=>{
    await query("begin isolation level repeatable read");
    await expectError(()=>query(rpcSql,[null,JSON.stringify(capPayload),'null','[]',null,randomUUID()]),'25001','cuota falla cerrada con snapshot no compatible');
    await query("rollback");
  });

  // Paginacion de verdad: 1007 seguidores, mas del default REST y de un bloque worker.
  await query("update public.avisos_jobs set estado='obsoleto',expandido=true");
  await query("update public.avisos_entregas set estado='descartada',lease_hasta=null");
  const MASS=randomUUID(); await query("insert into auth.users(id,email) values($1,'outbox-mass@local.test')",[MASS]);
  const place=(await as("authenticated",MASS,()=>query("insert into public.lugares(nombre,tipo,lat,lng,creado_por) values('Outbox grande','foro',22,-100,auth.uid()) returning id"))).rows[0].id;
  const ids=Array.from({length:1007},()=>randomUUID());
  await query("insert into auth.users(id,email) select u,u::text||'@local.test' from unnest($1::uuid[]) u",[ids]);
  await query("update public.perfiles set avisos_correo=true where id=any($1::uuid[])",[ids]);
  await query("insert into public.seguimientos(usuario_id,lugar_id) select u,$2 from unnest($1::uuid[]) u",[ids,place]);
  const massPayload={...capPayload,lugar_id:place,sitio_texto:null,inicio:new Date(Date.now()+7200000).toISOString()};
  const mass=(await as("authenticated",MASS,()=>query(rpcSql,[null,JSON.stringify(massPayload),'null','[]',null,randomUUID()]))).rows[0].r.id;
  await expandir();
  const massJob=(await jobs(mass))[0];
  check((await query("select count(*)::int as n from public.avisos_entregas where job_id=$1",[massJob.id])).rows[0].n===1007,"paginacion procesa los 1007 sin truncar ni duplicar");
  await expandir();
  check((await query("select count(*)::int as n from public.avisos_entregas where job_id=$1",[massJob.id])).rows[0].n===1007,"cursor persistente no repite expansion");
  const claims=await Promise.all(Array.from({length:12},()=>connection(async c=>{
    await c.query("set role service_role"); return (await c.query("select public.avisos_tomar() as r")).rows[0].r;
  })));
  const active=claims.filter(Boolean);
  check(active.length===4 && new Set(active.map(c=>c.id)).size===4,"12 workers concurrentes obtienen solo cuatro leases globales distintos");
  const lost=active[0];
  await query("update public.avisos_slots set vence=clock_timestamp()-interval '1 second' where token=$1",[lost.token]);
  await query("update public.avisos_entregas set lease_hasta=clock_timestamp()-interval '1 second',disponible='-infinity' where id=$1",[lost.id]);
  const recovered=await tomar();
  check(recovered.id===lost.id && recovered.token!==lost.token && !await terminar(lost),"caida: lease recuperable con fencing de ACK antiguo");
  const person=(await autorizar(recovered)).usuario_id;
  await query("update public.perfiles set avisos_correo=false where id=$1",[person]);
  check(await autorizar(recovered)===null,"recheck cancela consentimiento revocado despues del claim");
  for(const c of active.slice(1)) await terminar(c,'descartada');
  const stale=await tomar();
  await as("authenticated",ROOT,()=>query("update public.eventos set visible=false where id=$1",[mass]));
  check(await autorizar(stale)===null,"recheck cancela evento ocultado despues del claim");
  await as("authenticated",ROOT,()=>query("update public.eventos set visible=true where id=$1",[mass]));
  const tooOld=await tomar();
  await query("update public.avisos_entregas set primer_intento=clock_timestamp()-interval '24 hours' where id=$1",[tooOld.id]);
  check(await autorizar(tooOld)===null,"no reenvia fuera de la retencion de idempotencia");
  // Correccion sin cambiar inicio: recuperar solo canales que no empezaron HTTP.
  await query("insert into public.asistencias(usuario_id,evento_id,estado) values($1,$2,'voy'),($3,$2,'voy')",[USER,mass,OTHER]);
  await query("update public.perfiles set avisos_correo=true,avisos_push=true where id=any($1::uuid[])",[[USER,OTHER]]);
  await servicio("select public.avisos_recordatorios()"); await servicio("select public.avisos_recordatorios()");
  check((await jobs(mass)).filter(j=>j.tipo==='recordatorio').length===1,"cron repetido deja un solo recordatorio por inicio");
  await expandir();
  const rec=(await jobs(mass)).find(j=>j.tipo==='recordatorio');
  const beforeRec=(await query("select * from public.avisos_entregas where job_id=$1",[rec.id])).rows;
  check(beforeRec.length===4,"recordatorio separa correo y endpoints tambien");
  await query("update public.avisos_entregas set estado='enviada',primer_intento=clock_timestamp() where job_id=$1 and usuario_id=$2 and canal='correo'",[rec.id,USER]);
  await query("update public.avisos_entregas set primer_intento=clock_timestamp() where job_id=$1 and endpoint like '%outbox1'",[rec.id]);
  const massRev=(await query("select actualizado_en::text as r from public.eventos where id=$1",[mass])).rows[0].r;
  await as("authenticated",MASS,()=>query(rpcSql,[mass,JSON.stringify({...massPayload,lugar_id:null,sitio_texto:'Otra sede'}),'null','[]',massRev,randomUUID()]));
  await servicio("select public.avisos_recordatorios()"); await servicio("select public.avisos_recordatorios()");
  await expandir();
  const recs=(await jobs(mass)).filter(j=>j.tipo==='recordatorio');
  check(recs.length===2 && recs[0].estado==='obsoleto',"sede corregida genera un solo recordatorio de reemplazo");
  const afterRec=(await query("select * from public.avisos_entregas where job_id=$1",[recs[1].id])).rows;
  check(afterRec.length===2 && afterRec.some(d=>d.usuario_id===OTHER && d.canal==='correo') && afterRec.some(d=>d.endpoint.endsWith('outbox2')),
    "reemplazo no repite correo aceptado ni push con ACK incierto, conserva canales sin intento");
  // Compatibilidad de snapshot con la columna posterior de Terra; DDL solo en
  // transaccion revertida si este banco aun no carga 181600.
  await query('begin');
  try {
    await query('alter table public.eventos add column if not exists sitio_direccion text');
    await query("update public.eventos set sitio_direccion='Direccion publica uno',sitio_lat=22.15,sitio_lng=-100.98 where id=$1",[mass]);
    const s1=(await servicio('select public.avisos_evento_publico($1) as r',[mass])).rows[0].r;
    check(s1.sitio_direccion==='Direccion publica uno','snapshot incluye direccion publica separada');
    await query("update public.eventos set sitio_direccion='Direccion publica dos' where id=$1",[mass]);
    const s2=(await servicio('select public.avisos_evento_publico($1) as r',[mass])).rows[0].r;
    check(JSON.stringify(s1)!==JSON.stringify(s2),'cambio publico cambia snapshot para recheck');
    const privadoSeguro=(await servicio('select public.avisos_evento_publico($1) as r',[op])).rows[0].r;
    check(privadoSeguro.sitio_direccion===null && !JSON.stringify(privadoSeguro).includes(privado.direccion),'reservado nunca incorpora direccion privada al snapshot');
  } finally { await query('rollback'); }
  const EXIT=randomUUID();
  await query("insert into auth.users(id,email) values($1,'outbox-borrada@local.test')",[EXIT]);
  const owned=(await as('authenticated',EXIT,()=>query(rpcSql,[null,JSON.stringify(capPayload),'null','[]',null,randomUUID()]))).rows[0].r.id;
  const ownedJob=(await jobs(owned))[0];
  await query("insert into public.avisos_entregas(job_id,usuario_id,canal,cuerpo) values($1,$2,'correo','cuerpo personal')",[massJob.id,EXIT]);
  await as('authenticated',EXIT,()=>query('select public.borrar_mi_cuenta()'));
  check(!(await query('select id from auth.users where id=$1',[EXIT])).rowCount && !(await query('select id from public.avisos_entregas where usuario_id=$1',[EXIT])).rowCount,
    'borrar cuenta elimina Auth y entregas con su cuerpo');
  check((await query('select autor is null as r from public.avisos_origen where evento_id=$1',[owned])).rows[0].r
    && (await query('select actor is null as r from public.avisos_jobs where id=$1',[ownedJob.id])).rows[0].r,
    'borrar cuenta nulifica autor/actor conservando tombstone y job');
  const meta=(await query("select prosecdef,proconfig from pg_proc where pronamespace='public'::regnamespace and proname like 'avisos_%'")).rows;
  check(meta.every(m=>m.proconfig?.includes('search_path=""')),"todas las funciones de cola tienen path fijo");
  await correcciones({ as, query, check, connection });
  console.log('Outbox: contratos SQL, paginacion, cuota y leases probados sin proveedores');
}

// Cada escenario usa audiencia propia; no modifica cuotas ni datos de otros bancos.
async function correcciones({ as, query, check, connection }) {
  await query("update public.avisos_jobs set estado='obsoleto',expandido=true");
  await query("update public.avisos_entregas set estado='descartada',lease_hasta=null");
  await query("update public.avisos_slots set token=null,vence='-infinity'");
  const rpc = "select public.guardar_evento_con_avisos($1,$2::jsonb,$3::jsonb,$4::jsonb,$5,$6) as r";
  const servicio = (sql, args) => as('service_role', null, () => query(sql, args));
  const expandir = async () => {
    for (let i=0; i<100; i++) if (!(await servicio('select public.avisos_expandir() as r')).rows[0].r) return;
    throw new Error('correcciones: expansion no termina');
  };
  const tomar = async () => (await servicio('select public.avisos_tomar() as r')).rows[0].r;
  const autorizar = async c => (await servicio('select public.avisos_autorizar($1,$2) as r',[c.id,c.token])).rows[0].r;
  const preparar = async c => (await servicio("select public.avisos_preparar($1,$2,'cuerpo de prueba') as r",[c.id,c.token])).rows[0].r;
  const terminar = async (c, resultado='enviada') => (await servicio("select public.avisos_terminar($1,$2,$3,'prueba') as r",[c.id,c.token,resultado])).rows[0].r;
  const altas = async id => (await query("select * from public.avisos_jobs where evento_id=$1 and tipo='nuevo_evento' order by creado_en,id",[id])).rows;
  const vigentes = async id => (await altas(id)).filter(j=>['pendiente','activo'].includes(j.estado));
  const entregas = async id => (await query('select * from public.avisos_entregas where job_id=$1',[id])).rows;
  async function fixture(n=1) {
    const author=randomUUID(), id=randomUUID(), users=Array.from({length:n},()=>randomUUID());
    await query("insert into auth.users(id,email) select u,u::text||'@local.test' from unnest($1::uuid[]) u",[[author,...users]]);
    await query('update public.perfiles set avisos_correo=true,avisos_push=true where id=any($1::uuid[])',[users]);
    const artist=(await as('authenticated',author,()=>query("insert into public.artistas(nombre,disciplina,creado_por) values($1,'musica',auth.uid()) returning id",['Correccion '+author]))).rows[0].id;
    await query('insert into public.seguimientos(usuario_id,artista_id) select u,$2 from unnest($1::uuid[]) u',[users,artist]);
    const data={titulo:'Anuncio pendiente',ciudad:'Outbox',inicio:new Date(Date.now()+7200000).toISOString(),zona:'America/Mexico_City',
      sitio_texto:'Sede',sitio_direccion:'Direccion inicial',sitio_lat:22.15,sitio_lng:-100.98,sitio_reservado:false};
    const who=JSON.stringify([{id:artist,nombre:'Correccion'}]);
    await as('authenticated',author,()=>query(rpc,[null,JSON.stringify(data),null,who,null,id]));
    const editArgs = async (patch={}, privado=null) => [id,JSON.stringify({...data,...patch}),privado && JSON.stringify(privado),who,
      (await query('select actualizado_en::text as r from public.eventos where id=$1',[id])).rows[0].r,randomUUID()];
    const edit = async (patch={}, privado=null) => { const args=await editArgs(patch,privado); return as('authenticated',author,()=>query(rpc,args)); };
    return {author,id,users,data,who,edit,editArgs};
  }
  for (const materializado of [false,true]) {
    const f=await fixture();
    if(materializado) await expandir();
    await f.edit({sitio_direccion:'Direccion corregida'});
    await expandir();
    const live=await vigentes(f.id);
    check(live.length===1,`corregir ${materializado?'despues':'antes'} de expandir conserva un anuncio inicial vigente`);
    if(live.length) {
      const ds=await entregas(live[0].id);
      check(ds.length===1 && ds[0].usuario_id===f.users[0] && live[0].contenido.sitio_direccion==='Direccion corregida',
        'seguidor sin Voy recibe anuncio con direccion vigente');
      const c=await tomar();
      check(c && (await autorizar(c))?.evento.sitio_direccion==='Direccion corregida','anuncio corregido autorizable antes de HTTP');
      if(c) await servicio("select public.avisos_terminar($1,$2,'enviada','prueba')",[c.id,c.token]);
    }
  }

  // El primer bloque puede haberse expandido antes de la correccion; el cursor
  // anterior no es una frontera de audiencia para el anuncio de reemplazo.
  const parcial=await fixture(101);
  await servicio('select public.avisos_expandir() as r');
  const viejaParcial=(await altas(parcial.id))[0];
  check((await entregas(viejaParcial.id)).length===100 && !viejaParcial.expandido,
    'la prueba deja una alta parcialmente expandida');
  await parcial.edit({sitio_direccion:'Direccion tras primer bloque'});
  await expandir();
  const altaParcial=(await vigentes(parcial.id))[0];
  check(altaParcial && (await entregas(altaParcial.id)).length===101 && altaParcial.expandido,
    'correccion despues de expansion parcial conserva toda la audiencia sin cursor truncado');
  await query("update public.avisos_jobs set estado='obsoleto',expandido=true where evento_id=$1",[parcial.id]);
  await query("update public.avisos_entregas set estado='descartada',lease_hasta=null where job_id in (select id from public.avisos_jobs where evento_id=$1)",[parcial.id]);

  // Un canal cuya confirmacion ya pudo perderse no se vuelve a abrir, pero los
  // demas destinatarios y canales pendientes reciben el anuncio vigente.
  const repetida=await fixture(2);
  await expandir();
  const altaOriginal=(await altas(repetida.id))[0];
  const originalCorreo=(await query("select id from public.avisos_entregas where job_id=$1 and usuario_id=$2 and canal='correo'",[altaOriginal.id,repetida.users[0]])).rows[0].id;
  await query("update public.avisos_entregas set disponible=clock_timestamp()+interval '1 hour' where job_id=$1 and id<>$2",[altaOriginal.id,originalCorreo]);
  const reclamado=await tomar();
  check(reclamado?.id===originalCorreo && (await autorizar(reclamado)) !== null && (await preparar(reclamado)) !== null,
    'lease prepara el primer cuerpo antes de una correccion');
  await terminar(reclamado);
  await repetida.edit({sitio_direccion:'Direccion dos'});
  await repetida.edit({sitio_direccion:'Direccion tres'});
  await expandir();
  const altaFinal=(await vigentes(repetida.id))[0];
  const finales=await entregas(altaFinal.id);
  check((await altas(repetida.id)).filter(j=>j.estado==='obsoleto').length===1 && altaFinal.contenido.sitio_direccion==='Direccion tres',
    'cambios repetidos dejan una sola alta vigente con el ultimo snapshot');
  check(finales.length===1 && finales[0].usuario_id===repetida.users[1],
    'alta de reemplazo no duplica correo aceptado y conserva el otro seguidor');
  await expandir();
  check((await entregas(altaFinal.id)).length===1,'reexpandir una correccion idempotente no duplica entregas');
  await query("update public.avisos_jobs set estado='obsoleto',expandido=true where evento_id=$1",[repetida.id]);
  await query("update public.avisos_entregas set estado='descartada',lease_hasta=null where job_id in (select id from public.avisos_jobs where evento_id=$1)",[repetida.id]);

  // Preparar sostiene un lock compartido. La correccion espera ese punto de
  // incertidumbre y, al completar, el claim viejo ya no puede volver a enviar.
  const carrera=await fixture();
  await expandir();
  const carreraJob=(await altas(carrera.id))[0];
  const carreraEntrega=(await entregas(carreraJob.id))[0];
  await query("update public.avisos_entregas set disponible=clock_timestamp()+interval '1 hour' where estado='pendiente' and id<>$1",[carreraEntrega.id]);
  const carreraClaim=await tomar();
  check(carreraClaim?.id===carreraEntrega.id,'la carrera reclama la entrega que mantiene el lock');
  let correccionTerminada=false;
  let carreraPreparada=null;
  let carreraAntes;
  await connection(async client => {
    await client.query('begin');
    try {
      await client.query('set role service_role');
      carreraAntes=(await client.query("select d.estado,d.lease_hasta>clock_timestamp()+interval '15 seconds' as lease, j.estado as job_estado, j.vence>clock_timestamp() as vigente, public.avisos_evento_publico(j.evento_id) is not distinct from j.contenido as snapshot from public.avisos_entregas d join public.avisos_jobs j on j.id=d.job_id where d.id=$1",[carreraClaim.id])).rows[0];
      carreraPreparada=(await client.query("select public.avisos_preparar($1,$2,'cuerpo concurrente') as r",[carreraClaim.id,carreraClaim.token])).rows[0].r;
      const editar=carrera.edit({sitio_direccion:'Direccion concurrente'}).then(() => { correccionTerminada=true; });
      await new Promise(resolve => setTimeout(resolve, 20));
      check(!correccionTerminada,'correccion espera el lock que cerca preparar');
      await client.query('commit');
      await editar;
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  });
  check(carreraPreparada==='cuerpo concurrente','preparar persiste el cuerpo antes de liberar el lock',carreraAntes);
  check((await autorizar(carreraClaim))===null,'claim preparado antes de correccion queda invalidado antes de HTTP');
  await expandir();
  const carreraNueva=(await vigentes(carrera.id))[0];
  const carreraEntregas=await entregas(carreraNueva.id);
  const carreraIncierta=(await query('select primer_intento is not null as r from public.avisos_entregas where id=$1',[carreraEntrega.id])).rows[0].r;
  check(carreraEntregas.length===0 && carreraIncierta,
    'reemplazo no duplica un canal ya incierto por carrera de lease',{entregas:carreraEntregas.length,incierta:carreraIncierta});

  const reservado=await fixture();
  await expandir();
  const privado={direccion:'Direccion solo privada',lat:22.16,lng:-100.99,indicaciones:'No divulgar',revelar_desde:new Date(Date.now()+3600000).toISOString()};
  await reservado.edit({sitio_reservado:true,sitio_direccion:null,sitio_lat:null,sitio_lng:null,sitio_revelar_desde:privado.revelar_desde},privado);
  await expandir();
  const altaReservada=(await vigentes(reservado.id))[0];
  check(altaReservada && altaReservada.contenido.sitio_reservado && altaReservada.contenido.sitio_direccion===null
    && !JSON.stringify(altaReservada.contenido).includes(privado.direccion) && (await entregas(altaReservada.id)).length===1,
    'correccion a sitio reservado conserva anuncio inicial sin filtrar direccion privada');

  const cuota=await fixture();
  const nuevos=Array.from({length:3},()=>randomUUID());
  for(const id of nuevos) await as('authenticated',cuota.author,()=>query(rpc,[null,JSON.stringify(cuota.data),null,cuota.who,null,id]));
  const suprimido=nuevos.at(-1);
  const revisionSuprimida=(await query('select actualizado_en::text as r from public.eventos where id=$1',[suprimido])).rows[0].r;
  await as('authenticated',cuota.author,()=>query(rpc,[suprimido,JSON.stringify({...cuota.data,sitio_direccion:'Direccion de alta suprimida'}),null,cuota.who,revisionSuprimida,randomUUID()]));
  check((await altas(suprimido)).length===1 && (await altas(suprimido))[0].estado==='suprimido',
    'corregir una alta suprimida por cuota no revive ni reemplaza el anuncio');

  const recordatorio=await fixture();
  await expandir();
  await query("insert into public.asistencias(usuario_id,evento_id,estado) values($1,$2,'voy')",[recordatorio.users[0],recordatorio.id]);
  await servicio('select public.avisos_recordatorios()');
  await expandir();
  const recordatorioOriginal=(await query("select * from public.avisos_jobs where evento_id=$1 and tipo='recordatorio'",[recordatorio.id])).rows[0];
  await query("update public.avisos_entregas set estado='enviada',primer_intento=clock_timestamp() where job_id=$1",[recordatorioOriginal.id]);
  await recordatorio.edit({sitio_direccion:'Direccion con recordatorio'});
  await servicio('select public.avisos_recordatorios()');
  await expandir();
  const recordatorios=(await query("select * from public.avisos_jobs where evento_id=$1 and tipo='recordatorio' order by creado_en,id",[recordatorio.id])).rows;
  const recordatorioNuevo=recordatorios.at(-1);
  const altaConRecordatorio=(await vigentes(recordatorio.id))[0];
  check(recordatorios.length===2 && recordatorios[0].estado==='obsoleto' && (await entregas(recordatorioNuevo.id)).length===0
    && (await entregas(altaConRecordatorio.id)).length===1,
    'recordatorio reemplazado no bloquea ni duplica el anuncio inicial corregido');

  const borrado=await fixture();
  await expandir();
  await as('authenticated',borrado.author,()=>query('delete from public.eventos where id=$1',[borrado.id]));
  await expandir();
  check((await altas(borrado.id)).length===0,'evento borrado no revive anuncios iniciales ni reemplazos');
}
