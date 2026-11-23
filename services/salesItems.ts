import type { SaleItem } from '../types';

/** Artigos que se podem associar a uma venda. O valor e lancado a mao (pode ser negociado). */
export const SALE_ITEMS: { id: SaleItem; label: string }[] = [
  { id: 'workio', label: 'WORKIO' },
  { id: 'sol', label: 'SOL' },
  { id: 'emet', label: 'EMET' },
  { id: 'sistema', label: 'SISTEMA' },
  { id: 'site', label: 'SITE' },
  { id: 'avenca_mensal', label: 'AVENÇA mensal' },
  { id: 'avenca_anual', label: 'AVENÇA anual' }
];

export const saleItemLabel = (id: SaleItem) => SALE_ITEMS.find((i) => i.id === id)?.label || id;
