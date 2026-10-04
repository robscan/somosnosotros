import { beforeEach, describe, expect, it, vi } from 'vitest';
import { consultarImpactoBorradoLugar, borrarLugarExcepcional } from './acciones';

const m = vi.hoisted(() => ({ actual: vi.fn(), rpc: vi.fn(), revalidar: vi.fn() }));
vi.mock('@/lib/supabase/servidor', () => ({ usuarioActual: m.actual, clienteServidor: async () => ({rpc:m.rpc}) }));
vi.mock('next/cache', () => ({ revalidatePath: m.revalidar }));
vi.mock('next/navigation', () => ({ redirect: (url:string) => {throw new Error(`REDIRECT:${url}`);} }));
const id='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const confirmacion='a'.repeat(64);
const impacto={lugar_id:id,nombre:'Lugar de prueba',eventos:3,ajenos:2,por_ocultar:0,seguimientos:1,cuentas:1,destacados:0,obras:0,contactos:0,invitaciones:0,permitido:true,confirmacion};
beforeEach(()=>{vi.clearAllMocks();m.actual.mockResolvedValue({perfil:{rol:'admin'}});});

describe('borrado excepcional administrativo',()=>{
  it('consulta impacto sin mutar ni revalidar',async()=>{
    m.rpc.mockResolvedValue({data:impacto,error:null});
    expect(await consultarImpactoBorradoLugar(id)).toEqual({ok:true,impacto});
    expect(m.rpc).toHaveBeenCalledWith('impacto_borrado_lugar_admin',{p_lugar:id});
    expect(m.revalidar).not.toHaveBeenCalled();
  });
  it.each([null,{perfil:{rol:'usuario'}}])('rechaza sesión insuficiente antes de llamar SQL',async actual=>{
    m.actual.mockResolvedValue(actual);
    await expect(consultarImpactoBorradoLugar(id)).rejects.toThrow('REDIRECT:');
    await expect(borrarLugarExcepcional(id,confirmacion,'Motivo suficiente')).rejects.toThrow('REDIRECT:');
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it.each([null,{}, {...impacto,eventos:-1},{...impacto,lugar_id:'otro'}])('no presenta respuestas incompletas como impacto cero: %j',async data=>{
    m.rpc.mockResolvedValue({data,error:null});
    expect((await consultarImpactoBorradoLugar(id)).ok).toBe(false);
  });
  it('rechaza id, confirmación y motivo inválidos antes de RPC',async()=>{
    expect((await consultarImpactoBorradoLugar('otro')).ok).toBe(false);
    expect((await borrarLugarExcepcional(id,confirmacion,'x')).ok).toBe(false);
    expect((await borrarLugarExcepcional(id,'','Motivo suficiente')).ok).toBe(false);
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it('pide revisar nuevamente el impacto cambiado sin filtrar SQL',async()=>{
    m.rpc.mockResolvedValue({data:null,error:{code:'40001',details:'datos internos'}});
    const r=await borrarLugarExcepcional(id,confirmacion,'Motivo suficiente');
    expect(r).toMatchObject({ok:false,revisar:true});
    expect(JSON.stringify(r)).not.toContain('datos internos');
    expect(m.revalidar).not.toHaveBeenCalled();
  });
  it.each([{data:null,error:{code:'23503'}},{data:null,error:{code:'42501'}},{data:{ok:false},error:null}])('un fallo no anuncia borrado: %j',async r=>{
    m.rpc.mockResolvedValue(r);
    expect((await borrarLugarExcepcional(id,confirmacion,'Motivo suficiente')).ok).toBe(false);
    expect(m.revalidar).not.toHaveBeenCalled();
  });
  it('confirma RPC antes de invalidar fichas y mostrar el cierre',async()=>{
    m.rpc.mockResolvedValue({data:{ok:true,eventos:3,repetido:false},error:null});
    await expect(borrarLugarExcepcional(id,confirmacion,'  Motivo suficiente  ')).rejects.toThrow('REDIRECT:/borrado?que=lugar');
    expect(m.rpc).toHaveBeenCalledWith('borrar_lugar_excepcional_admin',{p_lugar:id,p_confirmacion:confirmacion,p_motivo:'Motivo suficiente'});
    expect(m.revalidar).toHaveBeenCalledWith('/','layout');
  });
});
