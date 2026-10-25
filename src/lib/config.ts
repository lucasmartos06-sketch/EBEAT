// Ajustes de la plataforma. El nombre y la comisión se cambian con variables de entorno.

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'eBeat';

const rawCommission = process.env.NEXT_PUBLIC_COMMISSION_PERCENT;
export const COMMISSION_PERCENT: number | null =
  rawCommission && !Number.isNaN(Number(rawCommission)) ? Number(rawCommission) : null;

// La URL del proyecto y la clave pública (publishable) de Supabase no son secretas: cualquiera que abra la web
// puede verlas. La seguridad real la dan las reglas (RLS) de la base de datos. Si en Vercel se definen las
// variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY, tienen prioridad sobre estos valores.
// Nunca pongas aquí la clave "secret" ni la "service_role".
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zbuevclrddsgbawcemvy.supabase.co';
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_YTEaqJu96fYN_4G2Jr1T0A_FvRsUw0U';
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const GENRES = ['Trap', 'Drill', 'Hip hop', 'Lo-fi', 'Electrónica', 'Pop'];

export const LICENSES: Record<string, { name: string; desc: string }> = {
  personal: {
    name: 'Uso personal',
    desc: 'Proyectos sin ánimo de lucro: vídeos de aficionados, maquetas o práctica.',
  },
  comercial: {
    name: 'Uso comercial',
    desc: 'Lanzamientos, anuncios y contenido con ingresos. La pista sigue siendo del productor.',
  },
  exclusiva: {
    name: 'Exclusiva',
    desc: 'Un único comprador. La pista se retira del catálogo.',
  },
};
