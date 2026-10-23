# Guía de puesta en marcha

Esta guía te lleva de "código en GitHub" a "app funcionando en internet". No hace falta saber programar.
Los nombres de los botones pueden cambiar un poco con el tiempo; si algo no coincide, busca el equivalente.

Tiempo estimado: 30-45 minutos. Coste: 0 € (planes gratuitos).

## Antes de empezar (1 minuto, muy recomendable)

Este repositorio de GitHub es **público**: cualquiera puede ver el código. Para un proyecto de negocio es mejor
que sea privado:

1. En GitHub, abre el repositorio y entra en **Settings** (Configuración).
2. Baja hasta el final, a **Danger Zone**, y pulsa **Change repository visibility**.
3. Elige **Make private** y confirma.

Vercel y Supabase siguen funcionando igual con un repositorio privado.

**Regla de oro:** nunca pegues claves ni contraseñas dentro del código ni las subas a GitHub. Solo se ponen en
Vercel (paso 3).

## Paso 1. Crear la base de datos (Supabase)

1. Entra en <https://supabase.com> y crea una cuenta (puedes usar tu cuenta de GitHub).
2. Pulsa **New project**. Ponle de nombre `ebeat`, elige una contraseña para la base de datos (guárdala en un
   sitio seguro) y la región más cercana a tus usuarios (por ejemplo, una de Europa).
3. Espera un par de minutos a que termine de crearse.
4. En el menú de la izquierda abre **SQL Editor** → **New query**.
5. Abre el archivo `supabase/schema.sql` de este repositorio, copia TODO su contenido, pégalo en el editor y
   pulsa **Run**. Debe terminar sin errores ("Success").
6. Abre **Project Settings** → **API** (o **API Keys**) y copia estos dos datos:
   - **Project URL** (empieza por `https://` y termina en `.supabase.co`).
   - La clave **anon public** (también puede llamarse "publishable key"). Es la clave pública.
   - **No uses la clave `service_role`** ni la compartas con nadie: es secreta.
7. (Opcional, para probar más rápido) En **Authentication** → **Providers** → **Email**, puedes desactivar
   "Confirm email" mientras pruebas, para no tener que confirmar cada correo. Actívalo de nuevo antes de abrir
   la app al público.

## Paso 2. Publicar la web (Vercel)

1. Entra en <https://vercel.com> y crea una cuenta con tu GitHub.
2. Pulsa **Add New…** → **Project** y elige el repositorio `ebeat`. Si no aparece, pulsa en
   "Adjust GitHub App Permissions" y dale acceso a ese repositorio.
3. Vercel detecta solo que es Next.js. Antes de pulsar **Deploy**, abre **Environment Variables** y añade:

   | Nombre | Valor |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | la Project URL del paso 1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la clave anon public del paso 1 |
   | `NEXT_PUBLIC_APP_NAME` | `eBeat` (o el nombre definitivo) |
   | `NEXT_PUBLIC_COMMISSION_PERCENT` | déjalo vacío hasta decidir la comisión |

4. Pulsa **Deploy** y espera uno o dos minutos. Al terminar te dará una dirección tipo
   `ebeat-xxxx.vercel.app`.

Si el despliegue falla, abre el registro (**Build Logs**), copia el mensaje de error y envíaselo a Claude: es
la forma más rápida de arreglarlo.

## Paso 3. Probar que todo funciona

1. Abre la dirección de Vercel. Debes ver la página de inicio.
2. Ve a **Entrar** → **Crea una** y regístrate.
3. Ve a **Subir pista**, sube un MP3 pequeño y publícalo.
4. Comprueba que aparece en el **Catálogo** y que se reproduce.

## Qué hace y qué no hace todavía esta versión

Funciona: registro y entrada, subida de pistas con audio, catálogo con filtro por género, página de cada pista
con reproductor sin botón de descarga.

Todavía no existe (siguientes fases): pagos, chat, encargos, ranking, subastas y panel del productor.

**Importante:** en esta versión el audio es público (cualquiera con el enlace podría descargarlo). Antes de
vender de verdad hay que añadir archivos originales privados y una marca de agua en la previsualización. Mientras
tanto, usa solo pistas de prueba.

## Cambiar el nombre o la comisión

Se hace en Vercel, sin tocar código: **Settings** → **Environment Variables** → edita
`NEXT_PUBLIC_APP_NAME` o `NEXT_PUBLIC_COMMISSION_PERCENT` y vuelve a desplegar (**Deployments** → los tres
puntos del último → **Redeploy**).

## Dominio propio

Cuando tengas el nombre definitivo: compra el dominio (Namecheap, Dinahosting…) y en Vercel entra en
**Settings** → **Domains** para añadirlo; Vercel te indica qué registros configurar en tu proveedor.
