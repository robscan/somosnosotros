-- OL-257 / H02: acceso de terceros desde revelar_desde hasta fin efectivo + 2 h.
-- Autor/admin conservan lectura. Esta pieza no purga datos ni modifica lugares.
begin;

alter policy "sitio privado: autor, admin, o con sesión cuando toca"
  on public.eventos_sitio_privado
  using (
    public.gestiona_evento(evento_id)
    or (
      auth.uid() is not null
      and now() >= revelar_desde
      and exists (
        select 1 from public.eventos e
        where e.id = evento_id
          and e.visible and e.sitio_reservado
          and now() < e.termina + interval '2 hours'
      )
    )
  );
comment on policy "sitio privado: autor, admin, o con sesión cuando toca"
  on public.eventos_sitio_privado is
  'Terceros con sesión: evento accesible por RLS, visible y reservado, desde revelar_desde (inclusive) hasta termina + 2 h (exclusive). Ocultar revoca acceso. Autor/admin mantienen lectura. Los lugares ocultos/privados son independientes.';

commit;
