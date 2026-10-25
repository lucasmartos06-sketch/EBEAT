# eBeat

Plataforma web para que productores de música suban sus beats y los licencien a compradores.

Estado: cuentas, subida de pistas, catálogo y reproductor (fase 1); chat de negociación con ofertas y encargos
(fase 2); subastas (fase 3); ranking mensual (fase 4); normas y panel de ingresos para administradores (fase 5); perfiles de productor (fase 6); ajustes de cuenta (fase 7).
Los pagos y el panel del productor llegarán en las siguientes fases.

## Tecnología

- [Next.js](https://nextjs.org) (App Router) y React, en TypeScript.
- [Supabase](https://supabase.com): cuentas de usuario, base de datos y almacenamiento de audio.
- [Vercel](https://vercel.com) para publicarla.

## Para ponerla en marcha

Sigue la guía paso a paso: [`docs/GUIA-PUESTA-EN-MARCHA.md`](docs/GUIA-PUESTA-EN-MARCHA.md).

## Estructura

```
src/app/          Páginas: inicio, catálogo, pista, subir, entrar
src/components/   Reproductor, formularios, tarjetas
src/lib/          Configuración, acceso a datos y utilidades
supabase/         Esquemas de la base de datos (schema.sql, fase2-chat-encargos.sql y fase3-subastas.sql fase4-ranking.sql fase5-ingresos.sql fase6-productores.sql y fase7-cuenta.sql)
docs/             Guías
```

## Ajustes

Se cambian con variables de entorno (ver `.env.example`): nombre de la plataforma y comisión. Sin las claves de
Supabase la web funciona en "modo demostración" con pistas de ejemplo.

## Trabajar en local (opcional)

```bash
npm install
cp .env.example .env.local   # y rellena las claves de Supabase
npm run dev                  # http://localhost:3000
```

No subas nunca `.env.local` a GitHub.
