import { SmtpConfig } from '../types';

// URL do Backend (ajuste conforme necessário para produção, ex: https://api.seudominio.com)
const API_URL = 'http://localhost:3001';

export interface SmtpTestResult {
  success: boolean;
  log: string;
}

export const sendRealSmtpTest = async (config: SmtpConfig, to: string): Promise<SmtpTestResult> => {
  try {
    const response = await fetch(`${API_URL}/api/test-smtp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ config, to }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    // Retorna erro específico de conexão para permitir fallback
    throw new Error('BACKEND_OFFLINE');
  }
};
