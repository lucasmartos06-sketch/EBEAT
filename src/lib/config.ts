// Ajustes de la plataforma. El nombre y la comisión se cambian con variables de entorno.

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'eBeat';

const rawCommission = process.env.NEXT_PUBLIC_COMMISSION_PERCENT;
export const COMMISSION_PERCENT: number | null =
  rawCommission && !Number.isNaN(Number(rawCommission)) ? Number(rawCommission) : null;

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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
