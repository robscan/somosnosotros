-- somosnosotros · migración 0007 · avisos push en el teléfono
create table public.suscripciones_push (
  endpoint text primary key,
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  creado_en timestamptz not null default now()
);
create index suscripciones_push_usuario_idx on public.suscripciones_push (usuario_id);
alter table public.suscripciones_push enable row level security;
-- Cada quien maneja las suyas; el servidor (service role) las lee para mandar avisos.
create policy "push: veo las mías" on public.suscripciones_push for select to authenticated using (usuario_id = auth.uid());
create policy "push: guardo las mías" on public.suscripciones_push for insert to authenticated with check (usuario_id = auth.uid());
create policy "push: actualizo las mías" on public.suscripciones_push for update to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "push: borro las mías" on public.suscripciones_push for delete to authenticated using (usuario_id = auth.uid());
