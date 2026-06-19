// Entry da funcao serverless da Vercel. E empacotado por esbuild (com todas as
// dependencias inline) para api/index.js, de modo a nao depender de resolucao
// de modulos em runtime na Vercel.
import type { IncomingMessage, ServerResponse } from 'http';
import { buildApp } from './server';

const app = buildApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  // Garante que a app Express recebe o caminho completo /api/...
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
