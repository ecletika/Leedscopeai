import type JsSIP from 'jssip';

// Configuração da extensão EMET (SIP sobre WebSocket / WebRTC).
// Guardada no browser de cada vendedor: cada um usa a sua própria extensão.
export interface EmetConfig {
  enabled: boolean;
  wssUrl: string;     // ex: wss://pbx.emet.pt:8089/ws
  domain: string;     // domínio/realm SIP, ex: pbx.emet.pt
  extension: string;  // ex: 101
  password: string;
  displayName?: string;
}

const KEY = 'emet_sip_config';

// Dados fixos do PABX (sistema interno): definidos no build/deploy via variáveis de ambiente.
const env = (import.meta as any).env || {};
// Por omissão o PABX EMET de produção (não são segredos: endereço público com certificado válido).
export const EMET_WSS_URL: string = env.VITE_EMET_WSS_URL || 'wss://sip.workio.pt/asterisk/ws';
export const EMET_DOMAIN: string = env.VITE_EMET_DOMAIN || 'sip.workio.pt';

// No MikoPBX cada ramal tem dois endpoints: "<ramal>" (SIP normal) e "<ramal>-WS" (WebRTC).
// O browser tem de registar no "-WS"; no normal o PABX recusa o áudio WebRTC ("Incompatible SDP" / 488).
// A autenticação continua a usar o número do ramal sem o sufixo.
const baseExt = (ext: string) => String(ext || '').trim().replace(/-ws$/i, '');

// O trunk só fala G.711: oferecer só PCMA/PCMU (+ DTMF) evita que o PABX converta o áudio de cada chamada.
function g711Only(sdp: string): string {
  try {
    const lines = sdp.split('\r\n');
    const mi = lines.findIndex((l) => l.startsWith('m=audio'));
    if (mi < 0) return sdp;
    const names: Record<string, string> = {};
    lines.forEach((l) => { const m = /^a=rtpmap:(\d+) ([^/]+)/.exec(l); if (m) names[m[1]] = m[2]; });
    const rank = (pt: string) => ({ PCMA: 0, PCMU: 1, 'telephone-event': 2 } as Record<string, number>)[names[pt] ?? ({ '0': 'PCMU', '8': 'PCMA' } as Record<string, string>)[pt]] ?? 99;
    const head = lines[mi].split(' ');
    const keep = head.slice(3).filter((pt) => rank(pt) < 99).sort((a, b) => rank(a) - rank(b));
    if (!keep.some((pt) => rank(pt) < 2)) return sdp;
    lines[mi] = [...head.slice(0, 3), ...keep].join(' ');
    return lines.filter((l) => { const m = /^a=(?:rtpmap|fmtp|rtcp-fb):(\d+)/.exec(l); return !m || keep.includes(m[1]); }).join('\r\n');
  } catch { return sdp; }
}

const SIP_CAUSES: Record<string, string> = {
  'Authentication Error': 'Extensão ou password errada',
  'Rejected': 'Recusada pelo PABX',
  'Busy': 'Número ocupado',
  'Not Found': 'Número não existe',
  'Unavailable': 'Indisponível',
  'Incompatible SDP': 'Áudio incompatível (a extensão tem de ser a WebRTC)',
  'Connection Error': 'Sem ligação ao PABX',
  'Request Timeout': 'O PABX não respondeu',
  'Canceled': 'Cancelada',
  'No Answer': 'Sem resposta',
};
const explain = (cause: string) => (SIP_CAUSES[cause] ? `${SIP_CAUSES[cause]} (${cause})` : cause || 'erro');

export function loadEmetConfig(): EmetConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { enabled: false, extension: '', password: '', ...JSON.parse(raw), wssUrl: EMET_WSS_URL, domain: EMET_DOMAIN };
  } catch { /* ignore */ }
  return { enabled: false, wssUrl: EMET_WSS_URL, domain: EMET_DOMAIN, extension: '', password: '' };
}

export function saveEmetConfig(cfg: EmetConfig) {
  try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
  destroyEmetUA();
}

export function isEmetActive(cfg = loadEmetConfig()): boolean {
  return !!(cfg.enabled && cfg.wssUrl && cfg.domain && cfg.extension && cfg.password);
}

let ua: JsSIP.UA | null = null;
let uaKey = '';

async function getUA(cfg: EmetConfig): Promise<JsSIP.UA> {
  const mod: any = await import('jssip');
  const JS = mod.default || mod;
  const key = `${cfg.wssUrl}|${cfg.domain}|${cfg.extension}|${cfg.password}`;
  if (ua && uaKey === key && ua.isRegistered()) return ua;
  destroyEmetUA();

  const socket = new JS.WebSocketInterface(cfg.wssUrl);
  const ext = baseExt(cfg.extension);
  const agent: JsSIP.UA = new JS.UA({
    sockets: [socket],
    uri: `sip:${ext}-WS@${cfg.domain}`,
    authorization_user: ext,
    password: cfg.password,
    display_name: cfg.displayName || ext,
    register: true,
    register_expires: 300,
    session_timers: false,
  });
  ua = agent;
  uaKey = key;

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Tempo esgotado a registar a extensão EMET.')), 12000);
    agent.once('registered', () => { clearTimeout(timer); resolve(); });
    agent.once('registrationFailed', (e: any) => { clearTimeout(timer); reject(new Error('Registo EMET falhou: ' + explain(e?.cause || 'credenciais/servidor inválidos'))); });
    agent.once('disconnected', (e: any) => { if (!agent.isRegistered()) { clearTimeout(timer); reject(new Error('Sem ligação ao servidor EMET (' + cfg.wssUrl + ').')); } });
    agent.start();
  });
  return agent;
}

export function destroyEmetUA() {
  try { ua?.stop(); } catch { /* ignore */ }
  ua = null;
  uaKey = '';
}

export interface EmetCall {
  hangup: () => void;
  mute: (m: boolean) => void;
  /** Envia teclas (DTMF) para menus automaticos: 0-9, * e # */
  sendDigits: (digits: string) => void;
}

export function normalizeNumber(n: string): string {
  return n.replace(/[^\d+]/g, '').replace(/^\+/, '').replace(/^00/, '');
}

export async function startEmetCall(
  phone: string,
  cb: { onAccepted: () => void; onEnded: () => void; onError: (msg: string) => void },
): Promise<EmetCall> {
  const cfg = loadEmetConfig();
  if (!isEmetActive(cfg)) throw new Error('Extensão EMET não configurada.');
  const agent = await getUA(cfg);

  // Elemento de áudio no DOM (um <audio> solto pode ficar mudo conforme o browser); toca o que o PABX envia.
  const audio = document.createElement('audio');
  audio.autoplay = true;
  audio.muted = false;
  audio.volume = 1;
  audio.style.display = 'none';
  document.body.appendChild(audio);
  const removeAudio = () => { try { audio.srcObject = null; audio.remove(); } catch { /* ignore */ } };
  const playRemote = (pc?: RTCPeerConnection) => {
    // junta todas as faixas de áudio recebidas numa só stream (alguns PABX não enviam msid e ev.streams vem vazio)
    const tracks = pc ? pc.getReceivers().map((r) => r.track).filter((t) => t && t.kind === 'audio') : [];
    if (!tracks.length) return;
    const cur = audio.srcObject as MediaStream | null;
    if (cur && tracks.every((t) => cur.getTracks().includes(t))) { audio.play().catch(() => {}); return; }
    audio.srcObject = new MediaStream(tracks);
    audio.play().catch(() => {});
  };

  const session: any = agent.call(`sip:${normalizeNumber(phone)}@${cfg.domain}`, {
    mediaConstraints: { audio: true, video: false },
    pcConfig: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
  });

  // Só G.711 na oferta (sem conversão de áudio no PABX).
  session.on('sdp', (e: any) => { if (e.originator === 'local' && e.sdp) e.sdp = g711Only(e.sdp); });
  // Não esperar que o STUN acabe de recolher candidatos (podia atrasar o início da chamada vários segundos):
  // segue com o primeiro candidato público ou ao fim de 1 s.
  let iceTimer: ReturnType<typeof setTimeout> | null = null;
  session.on('icecandidate', (e: any) => {
    if (e.candidate?.type === 'srflx') { if (iceTimer) clearTimeout(iceTimer); e.ready(); return; }
    if (!iceTimer) iceTimer = setTimeout(() => e.ready(), 1000);
  });

  let pcRef: RTCPeerConnection | undefined;
  session.on('peerconnection', (e: any) => {
    pcRef = e.peerconnection;
    e.peerconnection.addEventListener('track', (ev: RTCTrackEvent) => {
      if (ev.streams && ev.streams[0]) { audio.srcObject = ev.streams[0]; audio.play().catch(() => {}); }
      else playRemote(e.peerconnection);
    });
  });
  // Garantia extra: em «progress» (early media), «accepted» e «confirmed» volta a ligar o áudio recebido.
  session.on('progress', () => playRemote(pcRef || session.connection));
  session.on('accepted', () => playRemote(pcRef || session.connection));
  session.on('confirmed', () => { playRemote(pcRef || session.connection); cb.onAccepted(); });
  session.on('ended', () => { removeAudio(); cb.onEnded(); });
  session.on('failed', (e: any) => {
    removeAudio();
    cb.onError('Chamada EMET falhou: ' + explain(e?.cause));
  });

  return {
    hangup: () => { try { session.terminate(); } catch { /* ignore */ } },
    mute: (m) => { m ? session.mute({ audio: true }) : session.unmute({ audio: true }); },
    sendDigits: (digits) => { try { session.sendDTMF(digits); } catch { /* ignore */ } },
  };
}
