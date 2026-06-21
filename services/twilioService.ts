import type { Device, Call } from '@twilio/voice-sdk';

let deviceInstance: Device | null = null;
let tokenExpiry = 0;

export async function getTwilioDevice(): Promise<Device> {
  const { Device, Codec } = await import('@twilio/voice-sdk');

  const now = Date.now();
  if (deviceInstance && deviceInstance.state !== 'destroyed' && now < tokenExpiry) {
    return deviceInstance;
  }

  const res = await fetch('/api/twilio/token');
  if (!res.ok) throw new Error('Nao foi possivel obter token Twilio — verifique as variaveis TWILIO_* no servidor.');
  const { token, error } = await res.json();
  if (error) throw new Error(error);

  deviceInstance?.destroy();
  deviceInstance = new Device(token, {
    logLevel: 1,
    codecPreferences: [Codec.Opus, Codec.PCMU],
  });
  tokenExpiry = now + 3000 * 1000; // ~50 min (token dura 1h)
  await deviceInstance.register();
  return deviceInstance;
}

export function destroyTwilioDevice() {
  deviceInstance?.destroy();
  deviceInstance = null;
  tokenExpiry = 0;
}

export type { Device, Call };
