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

export function loadEmetConfig(): EmetConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { enabled: false, wssUrl: '', domain: '', extension: '', password: '', ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { enabled: false, wssUrl: '', domain: '', extension: '', password: '' };
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
  const agent: JsSIP.UA = new JS.UA({
    sockets: [socket],
    uri: `sip:${cfg.extension}@${cfg.domain}`,
    password: cfg.password,
    display_name: cfg.displayName || cfg.extension,
    register: true,
  });
  ua = agent;
  uaKey = key;

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Tempo esgotado a registar a extensão EMET.')), 12000);
    agent.once('registered', () => { clearTimeout(timer); resolve(); });
    agent.once('registrationFailed', (e: any) => { clearTimeout(timer); reject(new Error('Registo EMET falhou: ' + (e?.cause || 'credenciais/servidor inválidos'))); });
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

  const audio = document.createElement('audio');
  audio.autoplay = true;

  const session: any = agent.call(`sip:${normalizeNumber(phone)}@${cfg.domain}`, {
    mediaConstraints: { audio: true, video: false },
    pcConfig: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
  });

  session.on('peerconnection', (e: any) => {
    e.peerconnection.addEventListener('track', (ev: RTCTrackEvent) => {
      audio.srcObject = ev.streams[0];
      audio.play().catch(() => {});
    });
  });
  session.on('confirmed', cb.onAccepted);
  session.on('ended', () => { audio.srcObject = null; cb.onEnded(); });
  session.on('failed', (e: any) => {
    audio.srcObject = null;
    cb.onError('Chamada EMET falhou: ' + (e?.cause || 'erro'));
  });

  return {
    hangup: () => { try { session.terminate(); } catch { /* ignore */ } },
    mute: (m) => { m ? session.mute({ audio: true }) : session.unmute({ audio: true }); },
  };
}
