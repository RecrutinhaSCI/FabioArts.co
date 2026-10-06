import pool from '../config/pool';
import { normalizePhone, isValidPhone } from '../utils/phone';

export interface ClientRow {
  id: string;
  name: string;
  company: string | null;
  instagram: string | null;
  website: string | null;
  phone: string | null;
  testimonial: string | null;
  logo: string | null;
  isActive: boolean;
  projectsCount?: string | number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientDTO {
  name: string;
  company?: string;
  instagram?: string;
  website?: string;
  phone?: string | null;
  testimonial?: string;
  logo?: string;
  isActive?: boolean;
}

export interface UpdateClientDTO extends Partial<CreateClientDTO> {}

export interface ListClientsOptions {
  isActive?: string;
  search?: string;
  page?: string;
  limit?: string;
  /** false → visão pública: só ativos e apenas nome + feedback (sem telefone/contato). */
  isAdmin?: boolean;
}

const SELECT_FIELDS = `
  c.id,
  c.name,
  c.company,
  c.instagram,
  c.website,
  c.phone,
  c.testimonial,
  c.logo,
  c."isActive"  AS "isActive",
  (SELECT COUNT(*) FROM projects p WHERE p."clientId" = c.id) AS "projectsCount",
  c."createdAt" AS "createdAt",
  c."updatedAt" AS "updatedAt"
`;

function formatClient(row: ClientRow) {
  return {
    id: row.id,
    name: row.name,
    company: row.company ?? null,
    instagram: row.instagram ?? null,
    website: row.website ?? null,
    phone: row.phone ?? null,
    testimonial: row.testimonial ?? null,
    logo: row.logo ?? null,
    isActive: row.isActive,
    projectsCount: Number(row.projectsCount ?? 0),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Visão pública: nada de telefone/contato — só o necessário para avaliações.
function formatPublicClient(row: ClientRow) {
  return {
    id: row.id,
    name: row.name,
    testimonial: row.testimonial ?? null,
    isActive: row.isActive,
  };
}

/** Normaliza o telefone e garante que nenhum outro cliente usa o mesmo. */
async function resolvePhone(phone: string | null | undefined, excludeId?: string) {
  const raw = String(phone ?? '').trim();
  if (!raw) return { phone: null, phoneNormalized: null };
  if (!isValidPhone(raw)) {
    throw Object.assign(new Error('Telefone inválido. Use DDD + número, ex.: (54) 99999-9999.'), { status: 400 });
  }
  const phoneNormalized = normalizePhone(raw);
  const dup = await pool.query<{ id: string; name: string }>(
    `SELECT id, name FROM clients WHERE "phoneNormalized" = $1 AND id <> $2 LIMIT 1`,
    [phoneNormalized, excludeId ?? '']
  );
  if (dup.rows.length) {
    throw Object.assign(new Error(`Telefone já cadastrado para o cliente: ${dup.rows[0].name}`), { status: 409 });
  }
  return { phone: raw, phoneNormalized };
}

// Corrida entre dois cadastros com o mesmo telefone: o índice UNIQUE barra.
function uniquePhoneError(err: { code?: string; constraint?: string }): never {
  if (err?.code === '23505' && String(err.constraint || '').includes('phoneNormalized')) {
    throw Object.assign(new Error('Telefone já cadastrado para outro cliente.'), { status: 409 });
  }
  throw err;
}

// ─────────────────────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────────────────────

export async function listClients(opts: ListClientsOptions) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  const isAdmin = opts.isAdmin === true;

  if (!isAdmin) {
    // Site público só enxerga clientes ativos (bloco de avaliações).
    conditions.push(`c."isActive" = true`);
  } else if (opts.isActive !== undefined) {
    conditions.push(`c."isActive" = $${idx++}`);
    params.push(opts.isActive === 'true');
  }

  if (opts.search) {
    const digits = isAdmin ? normalizePhone(opts.search) : '';
    const byPhone = digits.length >= 4;
    conditions.push(`
      (
        c.name ILIKE $${idx}
        OR c.company ILIKE $${idx}
        OR c.instagram ILIKE $${idx}
        OR c.website ILIKE $${idx}
        ${byPhone ? `OR c."phoneNormalized" LIKE $${idx + 1}` : ''}
      )
    `);
    params.push(`%${opts.search}%`);
    idx++;
    if (byPhone) {
      params.push(`%${digits}%`);
      idx++;
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const pageNum  = Math.max(1, parseInt(opts.page  || '1',  10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(opts.limit || '20', 10) || 20));
  const offset   = (pageNum - 1) * limitNum;

  const countResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM clients c ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const dataParams = [...params, limitNum, offset];

  const result = await pool.query<ClientRow>(
    `
      SELECT ${SELECT_FIELDS}
      FROM clients c
      ${where}
      ORDER BY c."createdAt" DESC
      LIMIT $${idx++}
      OFFSET $${idx++}
    `,
    dataParams
  );

  return {
    data: isAdmin ? result.rows.map(formatClient) : result.rows.map(formatPublicClient),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

// ─────────────────────────────────────────────────────────────
// GET BY ID
// ─────────────────────────────────────────────────────────────

export async function getClientById(id: string) {
  const result = await pool.query<ClientRow>(
    `SELECT ${SELECT_FIELDS} FROM clients c WHERE c.id = $1`,
    [id]
  );

  if (!result.rows.length) {
    throw Object.assign(new Error('Cliente não encontrado'), { status: 404 });
  }

  return formatClient(result.rows[0]);
}

// ─────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────

export async function createClient(dto: CreateClientDTO) {
  if (!dto.name?.trim()) {
    throw Object.assign(new Error('O campo name é obrigatório'), { status: 400 });
  }

  const { phone, phoneNormalized } = await resolvePhone(dto.phone);

  const result = await pool.query<{ id: string }>(
    `
      INSERT INTO clients (
        id,
        name,
        company,
        instagram,
        website,
        phone,
        "phoneNormalized",
        testimonial,
        logo,
        "isActive",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        gen_random_uuid()::text,
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        NOW(), NOW()
      )
      RETURNING id
    `,
    [
      dto.name.trim(),
      dto.company ?? null,
      dto.instagram ?? null,
      dto.website ?? null,
      phone,
      phoneNormalized,
      dto.testimonial ?? null,
      dto.logo ?? null,
      dto.isActive ?? true,
    ]
  ).catch(uniquePhoneError);

  return getClientById(result.rows[0].id);
}

// ─────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────

export async function updateClient(id: string, dto: UpdateClientDTO) {
  const existing = await pool.query(`SELECT id FROM clients WHERE id = $1`, [id]);

  if (!existing.rows.length) {
    throw Object.assign(new Error('Cliente não encontrado'), { status: 404 });
  }

  const fields: string[]  = [];
  const params: unknown[] = [];
  let idx = 1;

  const push = (col: string, value: unknown) => {
    fields.push(`${col} = $${idx++}`);
    params.push(value);
  };

  if (dto.name        !== undefined) push('name',          dto.name.trim());
  if (dto.company     !== undefined) push('company',       dto.company     ?? null);
  if (dto.instagram   !== undefined) push('instagram',     dto.instagram   ?? null);
  if (dto.website     !== undefined) push('website',       dto.website     ?? null);
  if (dto.testimonial !== undefined) push('testimonial',   dto.testimonial ?? null);
  if (dto.logo        !== undefined) push('logo',          dto.logo        ?? null);
  if (dto.phone       !== undefined) {
    const { phone, phoneNormalized } = await resolvePhone(dto.phone, id);
    push('phone',             phone);
    push('"phoneNormalized"', phoneNormalized);
  }
  if (dto.isActive    !== undefined) push('"isActive"',    dto.isActive);

  if (!fields.length) {
    throw Object.assign(new Error('Nenhum campo para atualizar'), { status: 400 });
  }

  fields.push(`"updatedAt" = NOW()`);
  params.push(id);

  await pool.query(
    `UPDATE clients SET ${fields.join(', ')} WHERE id = $${idx}`,
    params
  ).catch(uniquePhoneError);

  return getClientById(id);
}

// ─────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────

export async function deleteClient(id: string) {
  const result = await pool.query<{ id: string; name: string }>(
    `DELETE FROM clients WHERE id = $1 RETURNING id, name`,
    [id]
  );

  if (!result.rows.length) {
    throw Object.assign(new Error('Cliente não encontrado'), { status: 404 });
  }

  return result.rows[0];
}

// ─────────────────────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────────────────────

export async function getClientStats() {
  const result = await pool.query<{ total: string; active: string }>(
    `
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE "isActive" = true) AS active
      FROM clients
    `
  );

  return {
    total:  parseInt(result.rows[0].total,  10),
    active: parseInt(result.rows[0].active, 10),
  };
}
