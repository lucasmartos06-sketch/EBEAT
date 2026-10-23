export function formatPrice(cents: number): string {
  const euros = cents / 100;
  return (
    euros.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' €'
  );
}

// Elige siempre el mismo color de portada para un mismo título.
export function coverClass(title: string): string {
  let sum = 0;
  for (let i = 0; i < title.length; i++) sum += title.charCodeAt(i);
  return 'c' + (sum % 6);
}

export function initial(title: string): string {
  return (title.trim().charAt(0) || '?').toUpperCase();
}
