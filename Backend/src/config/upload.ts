import multer, { FileFilterCallback, StorageEngine } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { env } from './env';
import { ApiError } from '../utils/ApiError';

// ─── Garante diretórios de upload ───────────────────────────────────────────

const UPLOAD_SUBFOLDERS = ['projects', 'clients', 'services', 'avatars', 'settings'];

const uploadBase = path.resolve(process.cwd(), env.UPLOAD_DIR);

UPLOAD_SUBFOLDERS.forEach(folder => {
  const dir = path.join(uploadBase, folder);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveFolder(url: string): string {
  if (url.includes('/clients'))          return 'clients';
  if (url.includes('/services'))         return 'services';
  if (url.includes('/auth') ||
      url.includes('/users'))            return 'avatars';
  if (url.includes('/settings'))         return 'settings';
  return 'projects';
}

// ─── Storage Engine ──────────────────────────────────────────────────────────

const storage: StorageEngine = multer.diskStorage({
  destination(req: Request, _file, cb) {
    const folder = resolveFolder(req.originalUrl);
    const dest   = path.join(uploadBase, folder);
    cb(null, dest);
  },
  filename(_req, file, cb) {
    const ext        = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

// ─── File Filter ─────────────────────────────────────────────────────────────

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  if (env.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Tipo de arquivo não permitido: "${file.mimetype}". ` +
        `Permitidos: ${env.ALLOWED_MIME_TYPES.join(', ')}`
      )
    );
  }
};

// ─── Base multer instance ─────────────────────────────────────────────────────

const baseMulter = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.MAX_FILE_SIZE },
});

// ─── Exports prontos para uso nos controllers ────────────────────────────────

/** Upload de um único campo */
export const uploadSingle = (fieldName: string) =>
  baseMulter.single(fieldName);

/** Upload de múltiplos arquivos no mesmo campo */
export const uploadMultiple = (fieldName: string, maxCount = 10) =>
  baseMulter.array(fieldName, maxCount);

/**
 * Upload para projetos: thumbnail (1) + images (até 10)
 * Uso: router.post('/', uploadProjectFields, controller)
 */
export const uploadProjectFields = baseMulter.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'images',    maxCount: 10 },
]);

// ─── URL helpers ─────────────────────────────────────────────────────────────

/**
 * Retorna a URL pública de um arquivo salvo.
 * @param filename  Nome do arquivo (ex: "uuid.jpg")
 * @param folder    Subpasta (ex: "projects")
 */
export const getFileUrl = (filename: string, folder: string): string =>
  `${env.APP_URL}/uploads/${folder}/${filename}`;

/**
 * Extrai o nome do arquivo a partir de uma URL pública.
 * @param url  URL completa (ex: "http://localhost:3333/uploads/projects/uuid.jpg")
 */
export const getFilenameFromUrl = (url: string): string =>
  path.basename(url);

/**
 * Extrai a subpasta a partir de uma URL pública.
 * @param url  URL completa
 */
export const getFolderFromUrl = (url: string): string => {
  const parts = url.split('/uploads/');
  if (parts.length < 2) return '';
  return parts[1].split('/')[0];
};

/**
 * Deleta um arquivo do disco com base em sua URL pública.
 * Não lança erro se o arquivo não existir.
 */
export const deleteFileByUrl = (url: string): void => {
  try {
    const filename = getFilenameFromUrl(url);
    const folder   = getFolderFromUrl(url);
    const fullPath = path.join(uploadBase, folder, filename);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch {
    // Falha silenciosa — arquivo pode já ter sido removido
  }
};

/**
 * Deleta um arquivo diretamente pelo caminho absoluto ou relativo.
 */
export const deleteFileByPath = (filePath: string): void => {
  try {
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch {
    // Falha silenciosa
  }
};