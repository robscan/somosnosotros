// OL-280: perfil, sesión y fila guardada inventados; la URL pública corresponde al caso del founder.
import { createServer } from 'node:http';
import { ANA, cookie, tablas } from '../../../scripts/ops/auditoria-ui/respaldo-local/fixture.mjs';

const artista = tablas.artistas[0];
Object.assign(artista, { nombre: 'Robscan', slug: 'robscan', foto: null, creado_por: ANA,
  bio: 'Perfil de prueba local para el reproductor de Mixcloud.', enlaces: [] });
tablas.artistas_cuentas.push({ artista_id: artista.id, perfil_id: ANA });
tablas.novedades_artista = [{ id: 'dddd0280-0000-4000-8000-000000000001', artista_id: artista.id,
  proveedor: 'mixcloud', url: 'https://www.mixcloud.com/robscan/randomatic-oct-26', embed_id: null,
  titulo: 'Randomatic Oct 26', texto: null, creado_en: new Date().toISOString(), visible: true,
  publicado_por: ANA }];

// Solo loopback: entrada al formulario con la sesión ficticia del respaldo; no hay cuentas reales.
const entrada = createServer((req, res) => {
  res.writeHead(302, { 'Set-Cookie': `sb-127-auth-token=${cookie}; Path=/; SameSite=Lax`,
    Location: 'http://127.0.0.1:30480/artistas/robscan/novedades/nueva' });
  res.end();
});
entrada.listen(30482, '127.0.0.1');
await import('../../../scripts/ops/auditoria-ui/respaldo-local/server.mjs');
