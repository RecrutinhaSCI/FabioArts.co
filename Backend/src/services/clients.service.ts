import pool from '../config/pool';

export interface ClientRow {
  id: string;
  name: string;
  company: string | null;
  instagram: string | null;
  website: string | null;
  testimonial: string | null;
  logo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientDTO {
  name: string;
  company?: string;
  instagram?: string;
  website?: string;
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
}

const SELECT_FIELDS = `
  c.id,
  c.name,
  c.company,
  c.instagram,
  c.website,
  c.testimonial,
  c.logo,
  c."isActive"  AS "isActive",
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
    testimonial: row.testimonial ?? null,
    logo: row.logo ?? null,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ─────────────────────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────────────────────

export async function listClients(opts: ListClientsOptions) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (opts.isActive !== undefined) {
    conditions.push(`c."isActive" = $${idx++}`);
    params.push(opts.isActive === 'true');
  }

  if (opts.search) {
    conditions.push(`
      (
        c.name ILIKE $${idx}
        OR c.company ILIKE $${idx}
        OR c.instagram ILIKE $${idx}
      )
    `);
    params.push(`%${opts.search}%`);
    idx++;
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
    data: result.rows.map(formatClient),
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

  const result = await pool.query<ClientRow>(
    `
      INSERT INTO clients (
        id,
        name,
        company,
        instagram,
        website,
        testimonial,
        logo,
        "isActive",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        gen_random_uuid()::text,
        $1, $2, $3, $4, $5, $6, $7,
        NOW(), NOW()
      )
      RETURNING
        id, name, company, instagram, website, testimonial, logo,
        "isActive" AS "isActive",
        "createdAt" AS "createdAt",
        "updatedAt" AS "updatedAt"
    `,
    [
      dto.name.trim(),
      dto.company ?? null,
      dto.instagram ?? null,
      dto.website ?? null,
      dto.testimonial ?? null,
      dto.logo ?? null,
      dto.isActive ?? true,
    ]
  );

  return formatClient(result.rows[0]);
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
  if (dto.isActive    !== undefined) push('"isActive"',    dto.isActive);

  if (!fields.length) {
    throw Object.assign(new Error('Nenhum campo para atualizar'), { status: 400 });
  }

  fields.push(`"updatedAt" = NOW()`);
  params.push(id);

  await pool.query(
    `UPDATE clients SET ${fields.join(', ')} WHERE id = $${idx}`,
    params
  );

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
