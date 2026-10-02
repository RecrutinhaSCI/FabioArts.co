import crypto from 'crypto';

/**
 * "Versão" da senha embutida no access token (claim `pwv`).
 * Derivada do hash bcrypt armazenado — não revela a senha. Quando a senha muda,
 * o hash muda e todos os tokens emitidos antes deixam de ser aceitos.
 */
export function passwordFingerprint(passwordHash: string): string {
  return crypto.createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);
}
