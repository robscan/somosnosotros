-- Pasa a Museo y Escuela los lugares de la investigación del 2026-09-14 (bitácora 032).
-- NO está en supabase/migrations a propósito: se aplica DESPUÉS de desplegar el código con los tipos nuevos. Antes,
-- la app publicada no los conoce (los etiqueta "Otro", no les da chip y no deja editarlos). Cuando toque: copiarlo a
-- supabase/migrations con la fecha del día y correr `npm run db:push`.
-- Casa Museo Mariano Jiménez y Caja Real se quedan como Casa de cultura (el SIC los registra como centros culturales).

update public.lugares set tipo = 'museo' where id in (
  '0091889c-9a5d-4ce0-9058-c6c372d0c13c', -- Museo Laberinto de las Ciencias y las Artes
  'a2176e0d-2ac1-42e2-b3a6-40e1fe9b2b4d', -- Museo Nacional de la Máscara
  '7b54354d-f35c-4cf8-93be-71957e15f7e6', -- Museo Regional Potosino
  'e8fc820b-fab6-49f0-a028-c487c5c8698a', -- Museo Federico Silva Escultura Contemporánea
  'bc443f31-a12f-49fb-b1b2-98a45879ef14', -- Museo Leonora Carrington
  '98fee205-29c1-4fa5-b292-599da200d759', -- Museo Francisco Cossío
  '20910a54-5622-41b8-b7d5-4fbc5bb34103', -- Museo del Virreinato
  '58f54ac7-365a-4151-9373-41ec33833296', -- Casa Museo Manuel José Othón
  'c82e2714-8cc5-417d-ae16-bcd12d7f5998', -- Museo de Arte Contemporáneo de San Luis Potosí
  '372bc316-1257-4a51-8fbd-0b6bf800f70e', -- Museo del Ferrocarril Jesús García Corona
  'abe11da5-5395-4cfd-80e8-a780cdd9e430', -- MUNI Museo Universitario UASLP
  'bf606617-6ba4-4eba-92f9-36c53587a53b', -- Museo de Sitio UASLP
  '4aff4bf1-46d8-415c-bb27-6677d1d51f6e'  -- Casa Doña María Pons
);

update public.lugares set tipo = 'escuela' where id in (
  '4c7f8afb-c87c-4893-99f0-6728ba352935', -- Instituto Potosino de Bellas Artes
  'ff040533-1698-4956-8072-bb01149bde7e', -- Escuela Estatal de Danza
  '91b36835-1bdd-476d-a395-119d42a84535', -- Escuela Estatal de Música
  '1e8c1bd6-5c04-42fd-8d0e-041e7c6185f1', -- Escuela Estatal de Teatro
  'c9363e17-12e0-4438-83f8-23d9d72ab35c', -- Escuela Estatal de Artes Plásticas
  '103f203d-a2d7-4d21-ac7d-183b5d3b5690', -- Escuela Estatal de Iniciación Musical Julián Carrillo
  '7681a7c9-61e9-46d0-aa94-45211f0d36fb'  -- Departamento de Arte y Cultura de la UASLP
);
