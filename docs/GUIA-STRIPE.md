# Guía: activar los pagos con Stripe

Sin estos pasos la web funciona, pero el botón «Comprar» avisará de que los pagos no están activados.
Todo esto se hace con las claves **secretas**: van solo en Vercel, nunca en el código ni en GitHub.

## 1. Cuenta de Stripe

1. Crea una cuenta en <https://stripe.com> con el país desde el que operas.
2. Activa **Connect** (menú **Connect** → **Empezar**). Elige «Plataforma o marketplace» y cuentas **Express**.
   Stripe es quien recoge los datos y la cuenta bancaria de cada productor.
3. Al principio todo funciona en **modo de prueba** (interruptor «Entorno de pruebas»). Prueba primero así,
   con la tarjeta de prueba `4242 4242 4242 4242`, cualquier fecha futura y cualquier CVC.

## 2. Claves (se copian de Stripe y de Supabase)

| Nombre en Vercel | De dónde sale |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe → Desarrolladores → Claves de API → «Clave secreta» (`sk_test_…`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → clave **secret** (`sb_secret_…`) |
| `STRIPE_WEBHOOK_SECRET` | Se obtiene en el paso 3 (`whsec_…`) |
| `NEXT_PUBLIC_COMMISSION_PERCENT` | La comisión de eBeat, por ejemplo `10` |

Se añaden en Vercel: proyecto → **Settings** → **Environment Variables** (o, en la versión nueva del panel,
dentro de **Environments**). Después hay que **redesplegar** (Deployments → ⋯ → Redeploy).

## 3. Aviso de pagos (webhook)

1. En Stripe: **Desarrolladores** → **Webhooks** → **Añadir endpoint**.
2. Dirección: `https://TU-WEB/api/stripe/webhook`
3. Eventos que hay que marcar: `checkout.session.completed`, `charge.refunded` y `account.updated`.
4. Copia la «Clave de firma» (`whsec_…`) y ponla en Vercel como `STRIPE_WEBHOOK_SECRET`.
5. Si usas Connect, crea además el endpoint con la opción «Escuchar eventos en cuentas conectadas» para
   `account.updated`.

## 4. Base de datos

En Supabase, **SQL Editor** → **New query**: pega y ejecuta `supabase/fase9-pagos.sql` (después de las fases 1 a 8).

## 5. Probar

1. Entra con tu cuenta de productor → **Mi panel** → **Activar cobros** y completa los datos de prueba de Stripe.
2. Con otra cuenta, abre una de sus pistas y pulsa **Comprar**. Paga con la tarjeta de prueba.
3. El comprador verá la compra en **Mi panel** → **Mis compras** y podrá **Descargar** el original.
4. El productor verá la venta y su ganancia neta, y tú, como administrador, verás la comisión en
   `/admin/ingresos`.

## Notas importantes

- El dinero va directo a la cuenta del productor menos la comisión de eBeat (cobro «destino» de Stripe).
  La **retención de pagos** de las normas (7-14 días) no está automatizada: hay que definirla con Stripe y un
  asesor.
- Las devoluciones se hacen desde el panel de Stripe; eBeat las refleja solo.
- Antes de cobrar dinero real hay que revisar con un asesor los impuestos (IVA), las condiciones legales y la
  protección de datos.
