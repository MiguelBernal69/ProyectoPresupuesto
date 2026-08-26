/**
 * Redondeo del banquero (Banker's Rounding):
 * - Menor a 0.5 -> hacia abajo
 * - Mayor a 0.5 -> hacia arriba
 * - Exactamente 0.5 -> al número par más cercano (ej. 2.5 -> 2, 3.5 -> 4)
 */
export function bankersRound(num: number): number {
  const integerPart = Math.floor(num);
  const fractionalPart = num - integerPart;

  if (fractionalPart < 0.5) return integerPart;
  if (fractionalPart > 0.5) return integerPart + 1;
  
  // Exactamente 0.5
  return integerPart % 2 === 0 ? integerPart : integerPart + 1;
}
