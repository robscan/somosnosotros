import { randomUUID } from "node:crypto";

const AUTORA = "00000000-0000-4000-8000-0000000000e1";
const OTRA = "00000000-0000-4000-8000-0000000000e2";
const base = { titulo: "Roundtrip direccion", inicio: "2030-10-01T20:00:00Z", fin: null,
  lugar_id: null, sitio_texto: "Foro · Patio", sitio_direccion: "Calle primera 123", sitio_lat: 22.1, sitio_lng: -100.1,
  sitio_reservado: false, sitio_revelar_desde: null, ciudad: "San Luis Potosí", zona: "America/Mexico_City" };

export async function run({as,query,check,expectError}) {
  await query("insert into auth.users(id,email) values ($1,'direccion-autora@local.test'),($2,'direccion-otra@local.test')",[AUTORA,OTRA]);
  const fila = async id => (await query("select *, actualizado_en::text as revision from public.eventos where id=$1",[id])).rows[0];
  const guardar = async (id,d,p=null,revision=null,operacion=randomUUID()) => (await query(
    "select public.guardar_evento_completo($1,$2::jsonb,$3::jsonb,'[]',$4::timestamptz,$5::uuid) as r",
    [id,JSON.stringify(d),p && JSON.stringify(p),revision,operacion])).rows[0].r;
  const creada = await as('authenticated',AUTORA,()=>guardar(null,base));
  const primero = await fila(creada.id);
  for(const punto of [{sitio_lat:null,sitio_lng:null},{sitio_lat:22,sitio_lng:null},{sitio_lat:91,sitio_lng:-100}]) {
    await as('authenticated',AUTORA,()=>expectError(()=>guardar(null,{...base,...punto}),'23514','DB exige par valido para direccion publica estructurada'));
  }
  await as('authenticated',AUTORA,()=>expectError(()=>query('update public.eventos set sitio_lng=null where id=$1',[creada.id]),'23514','CHECK impide quitar medio pin incluso por escritura directa'));
  check(primero.sitio_texto===base.sitio_texto && primero.sitio_direccion===base.sitio_direccion,'alta persiste nombre y direccion separados');
  const actualizado = {...base,sitio_direccion:'Calle segunda 456',sitio_lat:22.4,sitio_lng:-100.4};
  const operacion=randomUUID();
  const cambio=await as('authenticated',AUTORA,()=>guardar(creada.id,actualizado,null,primero.revision,operacion));
  const segundo=await fila(creada.id);
  check(segundo.sitio_texto===base.sitio_texto && segundo.sitio_direccion===actualizado.sitio_direccion,'editar reemplaza direccion sin duplicar el texto previo');
  check(cambio.cambio==='donde','direccion estructurada participa en deteccion de cambio');
  const repetido=await as('authenticated',AUTORA,()=>guardar(creada.id,actualizado,null,primero.revision,operacion));
  check(repetido.repetido && (await fila(creada.id)).revision===segundo.revision,'reintento no reescribe ni cambia revision');
  await as('authenticated',AUTORA,()=>expectError(()=>guardar(creada.id,base,null,primero.revision),'40001','revision vieja no repone direccion anterior'));
  await as('authenticated',OTRA,()=>expectError(()=>guardar(creada.id,base,null,segundo.revision),'42501','otra cuenta no cambia direccion'));
  const clienteViejo={...actualizado}; delete clienteViejo.sitio_direccion;
  await as('authenticated',AUTORA,()=>guardar(creada.id,clienteViejo,null,segundo.revision));
  check((await fila(creada.id)).sitio_direccion===actualizado.sitio_direccion,'omision en cliente anterior no borra direccion estructurada');
  // Contrato de un cliente anterior: JSON completo excepto el campo nuevo.
  for (const delta of [{sitio_texto:'Sitio B'}, {sitio_lat:23.5}, {sitio_lng:-101.5},
    {sitio_texto:'Sitio B',sitio_lat:23.5,sitio_lng:-101.5}, {sitio_lat:null,sitio_lng:null}]) {
    const alta = await as('authenticated',AUTORA,()=>guardar(null,base));
    const antes = await fila(alta.id);
    const viejo = {...base,...delta}; delete viejo.sitio_direccion;
    const respuesta = await as('authenticated',AUTORA,()=>guardar(alta.id,viejo,null,antes.revision));
    const despues = await fila(alta.id);
    check(despues.sitio_direccion===null,'cliente anterior que cambia texto/pin no conserva direccion A');
    check(respuesta.cambio==='donde','cambio de ubicacion legacy se detecta');
  }
  const privada={direccion:actualizado.sitio_direccion,lat:22.4,lng:-100.4,indicaciones:null,revelar_desde:'2030-09-30T20:00:00Z'};
  const reservada={...actualizado,sitio_reservado:true,sitio_direccion:null,sitio_lat:null,sitio_lng:null,sitio_revelar_desde:privada.revelar_desde};
  const antesReserva=await fila(creada.id);
  await as('authenticated',AUTORA,()=>expectError(()=>guardar(creada.id,reservada,{...privada,lat:null,lng:null},antesReserva.revision),'23514','pasar publico a reservado requiere pin privado'));
  await as('authenticated',AUTORA,()=>guardar(creada.id,reservada,privada,antesReserva.revision));
  const recargada=await fila(creada.id);
  await as('authenticated',AUTORA,()=>expectError(()=>guardar(creada.id,reservada,{...privada,direccion:'Otra sin confirmar',lat:null,lng:null},recargada.revision),'23514','editar direccion privada requiere pin aunque cliente omita flag UI'));
  await as('authenticated',AUTORA,()=>expectError(()=>guardar(creada.id,reservada,{...privada,lat:null,lng:null},recargada.revision),'23514','no se elimina un pin privado confirmado sin nueva ubicacion'));
  check(recargada.sitio_texto===base.sitio_texto && recargada.sitio_direccion===null && recargada.sitio_lat===null && recargada.sitio_lng===null,'publico a reservado tras recarga no deja direccion ni pin publico');
  const exacta=(await query('select * from public.eventos_sitio_privado where evento_id=$1',[creada.id])).rows[0];
  check(exacta.direccion===actualizado.sitio_direccion && exacta.lat===22.4,'direccion y punto quedan en tabla privada');
  const publicaAnon=await as('anon',null,()=>query('select sitio_texto,sitio_direccion,sitio_lat,sitio_lng from public.eventos where id=$1',[creada.id]));
  check(publicaAnon.rows[0]?.sitio_texto===base.sitio_texto && publicaAnon.rows[0]?.sitio_direccion===null,'anon solo recibe alias en fila publica reservada');
  const privadaAjena=await as('authenticated',OTRA,()=>query('select direccion from public.eventos_sitio_privado where evento_id=$1',[creada.id]));
  check(privadaAjena.rowCount===0,'otra cuenta no recibe direccion antes de revelarse');
  await as('authenticated',AUTORA,()=>expectError(()=>guardar(creada.id,{...reservada,sitio_direccion:'Filtracion'},privada,recargada.revision),'23514','RPC rechaza direccion publica al reservar'));
  await as('authenticated',AUTORA,()=>expectError(()=>query('update public.eventos set sitio_direccion=$1 where id=$2',['Filtracion',creada.id]),'23514','CHECK protege tambien escritura directa de direccion reservada'));
  await as('authenticated',AUTORA,()=>expectError(()=>query('update public.eventos set sitio_lat=22 where id=$1',[creada.id]),'23514','CHECK impide coordenada publica reservada directa'));
  for(const texto of ['x'.repeat(201),'   ']) await as('authenticated',AUTORA,()=>expectError(()=>guardar(null,{...base,sitio_direccion:texto}),'23514','CHECK rechaza direccion vacia o demasiado larga'));
  check((await fila(creada.id)).revision===recargada.revision,'fallos de seguridad no modifican evento ni revision');
  const fuera={...reservada,sitio_reservado:false,sitio_revelar_desde:null};
  await as('authenticated',AUTORA,()=>guardar(creada.id,fuera,null,recargada.revision));
  check((await fila(creada.id)).sitio_direccion===null && (await query('select * from public.eventos_sitio_privado where evento_id=$1',[creada.id])).rowCount===0,'desreservar no publica automaticamente la direccion privada');
  const legacy=await as('authenticated',AUTORA,()=>guardar(null,{...base,sitio_texto:'Foro · Patio · Calle vieja 8',sitio_direccion:null,sitio_lat:null,sitio_lng:null}));
  const vieja=await fila(legacy.id);
  check(vieja.sitio_direccion===null && vieja.sitio_texto==='Foro · Patio · Calle vieja 8','legacy conserva texto opaco sin backfill ni parser');
  await as('authenticated',AUTORA,()=>guardar(legacy.id,{...vieja,titulo:'Solo titulo'},null,vieja.revision));
  check((await fila(legacy.id)).sitio_lat===null,'legacy intacto sin pin sigue editable');
  // Fixture anterior a 181600: escritura directa de preparacion, no la RPC nueva.
  const legacyPrivado=randomUUID();
  await query('insert into public.eventos(id,titulo,inicio,creado_por,sitio_texto,sitio_reservado,sitio_revelar_desde) values($1,$2,$3,$4,$5,true,$6)',[legacyPrivado,'Legacy reservado',base.inicio,AUTORA,'Casa antigua',privada.revelar_desde]);
  await query('insert into public.eventos_sitio_privado(evento_id,direccion,revelar_desde) values($1,$2,$3)',[legacyPrivado,'Privada legacy',privada.revelar_desde]);
  const viejaPrivada=await fila(legacyPrivado);
  const privadaSinPin={...privada,direccion:'Privada legacy',lat:null,lng:null};
  await as('authenticated',AUTORA,()=>guardar(legacyPrivado,{...viejaPrivada,titulo:'Titulo nuevo'},privadaSinPin,viejaPrivada.revision));
  check((await fila(legacyPrivado)).titulo==='Titulo nuevo','RPC permite editar reservado legacy sin pin con direccion intacta');
  const revisionPrivada=(await fila(legacyPrivado)).revision;
  await as('authenticated',AUTORA,()=>expectError(()=>guardar(legacyPrivado,viejaPrivada,{...privadaSinPin,direccion:'Direccion cambiada'},revisionPrivada),'23514','legacy privado cambiado ya exige ubicacion'));
  const soloDireccion=await as('authenticated',AUTORA,()=>guardar(null,base));
  const sinMover=await fila(soloDireccion.id);
  const soloCambio=await as('authenticated',AUTORA,()=>guardar(soloDireccion.id,{...base,sitio_direccion:'Nueva direccion mismo pin'},null,sinMover.revision));
  check(soloCambio.cambio==='donde','direccion sola con pin igual tambien dispara cambio de donde');
  await query('delete from public.eventos where creado_por=$1',[AUTORA]);
  await query('delete from auth.users where id=any($1::uuid[])',[[AUTORA,OTRA]]);
}
