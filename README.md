# somosnosotros

Proyecto sin fines de lucro. Directorio de centros culturales y agenda de eventos para conocer gente local. Empieza en San Luis Potosí. **somosnosotros.org**

- Estado del proyecto: [`docs/ops/OPEN_LOOPS.md`](docs/ops/OPEN_LOOPS.md)
- Qué es: [`docs/DEFINICION.md`](docs/DEFINICION.md)
- Plan por fases: [`docs/PLAN.md`](docs/PLAN.md)

Stack: Next.js · Supabase · Mapbox GL JS · Vercel. Web móvil, español, tema claro. Repo público: ningún secreto en git.

## Correr en tu computadora

```
npm install
cp .env.example .env.local   # y pon tus valores (nunca se sube a git)
npm run dev                  # http://localhost:3000
```

Verificación: `npm run lint && npm run typecheck && npm test`. `/api/estado` dice si Mapbox y Supabase están configurados.

## Base de datos

El esquema vive en `supabase/migrations/`. Para aplicarlo al proyecto de Supabase, pon en `.env` la URL directa de la base (Supabase → Connect → Direct connection, con la contraseña; nunca en git):

```
SUPABASE_DB_URL=postgresql://postgres:CONTRASEÑA@db.XXXX.supabase.co:5432/postgres
```

y corre:

```
npm run db:push
```
