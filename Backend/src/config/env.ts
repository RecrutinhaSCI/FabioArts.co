/// <reference types="node" />
import * as path from 'path';
import * as fs from 'fs';

// Load .env file manually
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(
      `\n❌ Variável de ambiente obrigatória não encontrada: "${key}"\n` +
      `   Verifique seu arquivo .env baseado no .env.example\n`
    );
  }
  return value.trim();
}

function optionalEnv(key: string, fallback: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') return fallback;
  return value.trim();
}

function optionalInt(key: string, fallback: number): number {
  const value = process.env[key];
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`❌ Variável "${key}" deve ser um número inteiro. Recebido: "${value}"`);
  }
  return parsed;
}

export const env = {
  // Server
  NODE_ENV:    optionalEnv('NODE_ENV', 'development'),
  PORT:        optionalInt('PORT', 3333),

  // Database
  DATABASE_URL: requireEnv('DATABASE_URL'),

  // JWT
  JWT_SECRET:              requireEnv('JWT_SECRET'),
  JWT_EXPIRES_IN:          optionalEnv('JWT_EXPIRES_IN', '7d'),
  JWT_REFRESH_SECRET:      requireEnv('JWT_REFRESH_SECRET'),
  JWT_REFRESH_EXPIRES_IN:  optionalEnv('JWT_REFRESH_EXPIRES_IN', '30d'),

  // Upload
  UPLOAD_DIR:         optionalEnv('UPLOAD_DIR', 'uploads'),
  MAX_FILE_SIZE:      optionalInt('MAX_FILE_SIZE', 10485760), // 10MB default
  ALLOWED_MIME_TYPES: optionalEnv(
    'ALLOWED_MIME_TYPES',
    'image/jpeg,image/png,image/webp,image/gif'
  ).split(',').map(m => m.trim()),

  // CORS
  CORS_ORIGIN: optionalEnv('CORS_ORIGIN', 'http://localhost:3000')
    .split(',')
    .map(o => o.trim()),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS:    optionalInt('RATE_LIMIT_WINDOW_MS', 900000),  // 15min
  RATE_LIMIT_MAX_REQUESTS: optionalInt('RATE_LIMIT_MAX_REQUESTS', 100),

  // App
  APP_URL: optionalEnv('APP_URL', 'http://localhost:3333'),

  // Helpers
  get isDevelopment(): boolean { return this.NODE_ENV === 'development'; },
  get isProduction():  boolean { return this.NODE_ENV === 'production'; },
  get isTest():        boolean { return this.NODE_ENV === 'test'; },
} as const;

// Valida no boot que JWT_SECRET tem tamanho mínimo seguro
if (env.JWT_SECRET.length < 32) {
  throw new Error('❌ JWT_SECRET deve ter no mínimo 32 caracteres para segurança.');
}
if (env.JWT_REFRESH_SECRET.length < 32) {
  throw new Error('❌ JWT_REFRESH_SECRET deve ter no mínimo 32 caracteres para segurança.');
}