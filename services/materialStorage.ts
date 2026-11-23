import { supabase, isSupabaseConfigured } from './supabaseClient';

export const MATERIALS_BUCKET = 'commercial-materials';
export const MAX_MATERIAL_BYTES = 25 * 1024 * 1024; // 25 MB (igual ao limite do bucket)

/** Tipos aceites para anexar: PDF e imagens (SVG fica de fora por seguranca). */
export const ACCEPTED_MATERIAL_MIME = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif'];
export const MATERIAL_ACCEPT_ATTR = '.pdf,.png,.jpg,.jpeg,.webp,.gif,application/pdf,image/png,image/jpeg,image/webp,image/gif';

export interface UploadedMaterialFile {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

const safeName = (name: string) =>
  name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(-80) || 'ficheiro';

export const formatBytes = (bytes?: number) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Envia um PDF ou imagem para o armazenamento e devolve o URL publico. */
export const uploadMaterialFile = async (file: File, system: string): Promise<UploadedMaterialFile> => {
  if (!ACCEPTED_MATERIAL_MIME.includes(file.type)) {
    throw new Error('Formato não suportado. Use PDF, PNG, JPG, WEBP ou GIF.');
  }
  if (file.size > MAX_MATERIAL_BYTES) {
    throw new Error(`O ficheiro tem ${formatBytes(file.size)}. O limite é ${formatBytes(MAX_MATERIAL_BYTES)}.`);
  }
  if (!isSupabaseConfigured()) {
    throw new Error('O armazenamento de ficheiros não está configurado (Supabase).');
  }

  const path = `${system}/${Date.now()}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from(MATERIALS_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false
  });
  if (error) {
    throw new Error(`Não foi possível enviar o ficheiro (${error.message}). Verifique se a migração do armazenamento foi aplicada.`);
  }

  const { data } = supabase.storage.from(MATERIALS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, fileName: file.name, fileType: file.type, fileSize: file.size };
};
