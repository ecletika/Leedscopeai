/**
 * Acesso ao Admin Console: so o proprietario da plataforma.
 * Outros utilizadores com perfil "admin" NAO veem este modulo.
 *
 * NOTA: esta restricao e aplicada na interface. A base de dados usa a chave publica
 * (anon) como o resto da app; para impedir tambem o acesso direto aos dados seria
 * preciso mover o login para o Supabase Auth e usar politicas por utilizador.
 */
export const ADMIN_CONSOLE_OWNER_EMAIL = 'mauricio@ecletika.com';

export const canAccessAdminConsole = (user?: { email?: string } | null): boolean =>
  Boolean(user?.email) && user!.email!.trim().toLowerCase() === ADMIN_CONSOLE_OWNER_EMAIL;
