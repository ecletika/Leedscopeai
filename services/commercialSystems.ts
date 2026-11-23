import type { CommercialSystem } from '../types';
import { WORKIO_MODULES } from './workioModules';

export const COMMERCIAL_SYSTEMS: { id: CommercialSystem; label: string; description: string }[] = [
  { id: 'workio', label: 'Workio', description: 'RH e gestão de pessoas (M01 a M27)' },
  { id: 'sol', label: 'SOL', description: 'Housekeeping e operação hoteleira' },
  { id: 'emet', label: 'EMET', description: 'Módulos a definir' }
];

export interface SystemModule {
  code: string;
  name: string;
}

/** Modulos do SOL, conforme os ecras da demo comercial. */
const SOL_MODULES: SystemModule[] = [
  'Dashboard SLA',
  'Mapa de Quartos',
  'Painel Operacional',
  'Checklists',
  'App Mobile',
  'Manutenção',
  'Hóspedes (QR)',
  'Mensagens e Passagem de Turno',
  'Liga da Limpeza',
  'Escalas',
  'Relatórios',
  'Centro IA'
].map((name) => ({ code: name, name }));

/**
 * Modulos de cada sistema. O EMET ainda nao tem lista: o modulo escreve-se livremente
 * (o valor guardado e o proprio texto).
 */
export const modulesOf = (system: CommercialSystem): SystemModule[] => {
  if (system === 'workio') {
    return [...WORKIO_MODULES]
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((m) => ({ code: m.code, name: m.name }));
  }
  if (system === 'sol') return SOL_MODULES;
  return [];
};

/** Texto a mostrar para o modulo guardado num material. */
export const moduleLabel = (system: CommercialSystem, code?: string): string => {
  if (!code) return 'Geral (sem módulo)';
  const found = modulesOf(system).find((m) => m.code === code);
  if (!found) return code;
  return system === 'workio' ? `${found.code} · ${found.name}` : found.name;
};

export const systemLabel = (system?: CommercialSystem) =>
  COMMERCIAL_SYSTEMS.find((s) => s.id === (system || 'sol'))?.label || 'SOL';
