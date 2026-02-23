import { Product } from "../models";

export type TagSeverity =
  | 'success'
  | 'info'
  | 'warn'
  | 'danger'
  | 'secondary';

export interface StatusUiConfig<T extends string | number> {
  label: string;
  severity: TagSeverity;
}

export type StatusUiMap<T extends string | number> = Record<T, StatusUiConfig<T>>;

/**
 * Récupère le label d'un statut
 */
export function getStatusLabel<T extends string | number>(
  status: T,
  map: StatusUiMap<T>
): string {
  return map[status]?.label ?? String(status);
}

/**
 * Récupère la severity PrimeNG d'un statut
 */
export function getStatusSeverity<T extends string | number>(
  status: T,
  map: StatusUiMap<T>
): TagSeverity {
  return map[status]?.severity ?? 'info';
}

export function getProductImage(product: Product): string {
  return product?.imageUrl || '';
}

export function getStockSeverity(product: Product): 'danger' | 'warn' | 'success' {
  if (!product) return 'danger';
  const qty = product.quantity ?? 0;
  if (qty <= 0) return 'danger';
  if (qty <= (product.minStock || 5)) return 'warn';
  return 'success';
}

export function getStockLabel(product: Product): string {
  if (!product) return 'N/A';
  const qty = product.quantity ?? 0;
  if (qty <= 0) return 'Rupture';
  if (qty <= (product.minStock || 5)) return 'Faible';
  return 'En stock';
}

