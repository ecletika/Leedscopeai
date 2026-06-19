import { SmtpConfig } from '../types';

export interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  body: string;
  leadId?: string;
  sellerId?: string;
  hotelName?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export const sendTemplateEmail = async (opts: SendEmailOptions): Promise<SendEmailResult> => {
  try {
    const res = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
    const data = await res.json() as SendEmailResult & { error?: string };
    if (!res.ok) return { success: false, error: data.error || 'Erro desconhecido' };
    return { success: true, messageId: data.messageId };
  } catch {
    return { success: false, error: 'Servidor offline ou sem ligação' };
  }
};

// URL do Backend (ajustado dinamicamente para usar a mesma origem)
const API_URL = '';

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