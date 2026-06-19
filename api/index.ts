// Funcao serverless da Vercel: serve toda a API (/api/*) reutilizando a app
// Express de server.ts. Handler defensivo: garante que a app recebe o caminho
// completo /api/... quer a Vercel preserve quer retire o prefixo no rewrite.
import type { IncomingMessage, ServerResponse } from 'http';
import { buildApp } from '../server';

const app = buildApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
