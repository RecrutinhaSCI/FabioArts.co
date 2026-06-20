import pool from '../config/pool';

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export type ProjectCategory =
  | 'AUTOMOTIVE'
  | 'TSHIRT'
  | 'STICKER'
  | 'BRANDING'
  | 'SOCIAL_MEDIA'
  | 'LOGO'
  | 'PACKAGING'
  | 'ILLUSTRATION'
  | 'OTHER';

export interface ProjectRow {
  id:          string;
  title:       string;
  slug:        string;
  description: string | null;
  category:    ProjectCategory;
  thumbnail:   string | null;
  tags:        string[];
  clientId:    string | null;
  isFeatured:  boolean;
  isPublished: boolean;
  projectDate: string | null;
  createdAt:   string;
  updatedAt:   string;
  // JOIN
  clientName?:    string | null;
  clientCompany?: string | null;
}

export interface CreateProjectDTO {
  title:        string;
  slug:         string;
  description?: string;
  category:     ProjectCategory;
  thumbnail?:   string;
  tags?:        string[];
  clientId?:    string;
  isFeatured?:  boolean;
  isPublished?: boolean;
  projectDate?: string;
}

export interface UpdateProjectDTO extends Partial<CreateProjectDTO> {}

export interface ListProjectsOptions {
  category?:    string;
  isFeatured?:  string;
  isPublished?: string;
  clientId?:    string;
  search?:      string;
  page?:        string;
  limit?:       string;
}

const VALID_CATEGORIES: ProjectCategory[] = [
  'AUTOMOTIVE', 'TSHIRT', 'STICKER', 'BRANDING',
  'SOCIAL_MEDIA', 'LOGO', 'PACKAGING', 'ILLUSTRATION', 'OTHER',
];

// SELECT base — colunas reais do banco são camelCase quoted
const SELECT_FIELDS = `
  p.id,
  p.title,
  p.slug,
  p.description,
  p.category,
  p.thumbnail,
  p.tags,
  p."clientId"    AS "clientId",
  p."isFeatured"  AS "isFeatured",
  p."isPublished" AS "isPublished",
  p."projectDate" AS "projectDate",
  p."createdAt"   AS "createdAt",
  p."updatedAt"   AS "updatedAt",
  c.name    AS "clientName",
  c.company AS "clientCompany"
`;

function formatProject(row: ProjectRow) {
  return {
    id:            row.id,
    title:         row.title,
    slug:          row.slug,
    description:   row.description  ?? null,
    category:      row.category,
    thumbnail:     row.thumbnail    ?? null,
    tags:          row.tags         ?? [],
    clientId:      row.clientId     ?? null,
    clientName:    row.clientName   ?? null,
    clientCompany: row.clientCompany ?? null,
    isFeatured:    row.isFeatured,
    isPublished:   row.isPublished,
    projectDate:   row.projectDate  ?? null,
    createdAt:     row.createdAt,
    updatedAt:     row.updatedAt,
  };
}

// ─── LIST ─────────────────────────────────────────────────────────────────────

export async function listProjects(opts: ListProjectsOptions) {
  const conditions: string[] = [];
  const params: unknown[]    = [];
  let   idx = 1;

  if (opts.category) {
    if (!VALID_CATEGORIES.includes(opts.category as ProjectCategory)) {
      throw Object.assign(new Error(`Categoria inválida: ${opts.category}`), { status: 400 });
    }
    conditions.push(`p.category::text = $${idx++}`);
    params.push(opts.category);
  }

  if (opts.isFeatured !== undefined) {
    conditions.push(`p."isFeatured" = $${idx++}`);
    params.push(opts.isFeatured === 'true');
  }

  if (opts.isPublished !== undefined) {
    conditions.push(`p."isPublished" = $${idx++}`);
    params.push(opts.isPublished === 'true');
  }

  if (opts.clientId) {
    conditions.push(`p."clientId" = $${idx++}`);
    params.push(opts.clientId);
  }

  if (opts.search) {
    conditions.push(`(p.title ILIKE $${idx} OR p.description ILIKE $${idx})`);
    params.push(`%${opts.search}%`);
    idx++;
  }

  const where    = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const pageNum  = Math.max(1, parseInt(opts.page  || '1',  10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(opts.limit || '20', 10) || 20));
  const offset   = (pageNum - 1) * limitNum;

  const countResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM projects p ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const dataParams = [...params, limitNum, offset];
  const result = await pool.query<ProjectRow>(
    `SELECT ${SELECT_FIELDS}
     FROM projects p
     LEFT JOIN clients c ON c.id = p."clientId"
     ${where}
     ORDER BY p."createdAt" DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    dataParams
  );

  return {
    data: result.rows.map(formatProject),
    pagination: {
      total,
      page:       pageNum,
      limit:      limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

// ─── GET BY ID ────────────────────────────────────────────────────────────────

export async function getProjectById(id: string) {
  const result = await pool.query<ProjectRow>(
    `SELECT ${SELECT_FIELDS}
     FROM projects p
     LEFT JOIN clients c ON c.id = p."clientId"
     WHERE p.id = $1`,
    [id]
  );

  if (!result.rows.length) {
    throw Object.assign(new Error('Projeto não encontrado'), { status: 404 });
  }

  return formatProject(result.rows[0]);
}

// ─── GET BY SLUG ──────────────────────────────────────────────────────────────

export async function getProjectBySlug(slug: string) {
  const result = await pool.query<ProjectRow>(
    `SELECT ${SELECT_FIELDS}
     FROM projects p
     LEFT JOIN clients c ON c.id = p."clientId"
     WHERE p.slug = $1`,
    [slug]
  );

  if (!result.rows.length) {
    throw Object.assign(new Error('Projeto não encontrado'), { status: 404 });
  }

  return formatProject(result.rows[0]);
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createProject(dto: CreateProjectDTO) {
  if (!dto.title?.trim()) {
    throw Object.assign(new Error('O campo title é obrigatório'), { status: 400 });
  }
  if (!dto.slug?.trim()) {
    throw Object.assign(new Error('O campo slug é obrigatório'), { status: 400 });
  }
  if (!dto.category || !VALID_CATEGORIES.includes(dto.category)) {
    throw Object.assign(
      new Error(`Categoria inválida. Valores aceitos: ${VALID_CATEGORIES.join(', ')}`),
      { status: 400 }
    );
  }

  const slugCheck = await pool.query(
    `SELECT id FROM projects WHERE slug = $1`,
    [dto.slug.trim()]
  );
  if (slugCheck.rows.length) {
    throw Object.assign(new Error('Slug já está em uso'), { status: 409 });
  }

  if (dto.clientId) {
    const clientCheck = await pool.query(
      `SELECT id FROM clients WHERE id = $1`,
      [dto.clientId]
    );
    if (!clientCheck.rows.length) {
      throw Object.assign(new Error('clientId não encontrado'), { status: 400 });
    }
  }

  const inserted = await pool.query<{ id: string }>(
    `INSERT INTO projects
       (id, title, slug, description, category, thumbnail, tags,
        "clientId", "isFeatured", "isPublished", "projectDate",
        "createdAt", "updatedAt")
     VALUES (
       gen_random_uuid()::text,
       $1, $2, $3, $4::text::"ProjectCategory", $5, $6,
       $7, $8, $9, $10,
       NOW(), NOW()
     )
     RETURNING id`,
    [
      dto.title.trim(),
      dto.slug.trim(),
      dto.description ?? null,
      dto.category,
      dto.thumbnail   ?? null,
      dto.tags        ?? [],
      dto.clientId    ?? null,
      dto.isFeatured  ?? false,
      dto.isPublished ?? true,
      dto.projectDate ?? null,
    ]
  );

  return getProjectById(inserted.rows[0].id);
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateProject(id: string, dto: UpdateProjectDTO) {
  const existing = await pool.query(`SELECT id FROM projects WHERE id = $1`, [id]);
  if (!existing.rows.length) {
    throw Object.assign(new Error('Projeto não encontrado'), { status: 404 });
  }

  if (dto.category && !VALID_CATEGORIES.includes(dto.category)) {
    throw Object.assign(
      new Error(`Categoria inválida. Valores aceitos: ${VALID_CATEGORIES.join(', ')}`),
      { status: 400 }
    );
  }

  if (dto.slug) {
    const slugCheck = await pool.query(
      `SELECT id FROM projects WHERE slug = $1 AND id <> $2`,
      [dto.slug.trim(), id]
    );
    if (slugCheck.rows.length) {
      throw Object.assign(new Error('Slug já está em uso'), { status: 409 });
    }
  }

  if (dto.clientId) {
    const clientCheck = await pool.query(
      `SELECT id FROM clients WHERE id = $1`,
      [dto.clientId]
    );
    if (!clientCheck.rows.length) {
      throw Object.assign(new Error('clientId não encontrado'), { status: 400 });
    }
  }

  const fields: string[]  = [];
  const params: unknown[] = [];
  let   idx = 1;

  const push = (expr: string, val: unknown) => {
    fields.push(`${expr} = $${idx++}`);
    params.push(val);
  };

  if (dto.title       !== undefined) push('title',         dto.title?.trim());
  if (dto.slug        !== undefined) push('slug',          dto.slug?.trim());
  if (dto.description !== undefined) push('description',   dto.description ?? null);
  if (dto.category    !== undefined) push('category',      dto.category);
  if (dto.thumbnail   !== undefined) push('thumbnail',     dto.thumbnail   ?? null);
  if (dto.tags        !== undefined) push('tags',          dto.tags        ?? []);
  if (dto.clientId    !== undefined) push('"clientId"',    dto.clientId    ?? null);
  if (dto.isFeatured  !== undefined) push('"isFeatured"',  dto.isFeatured);
  if (dto.isPublished !== undefined) push('"isPublished"', dto.isPublished);
  if (dto.projectDate !== undefined) push('"projectDate"', dto.projectDate ?? null);

  if (!fields.length) {
    throw Object.assign(new Error('Nenhum campo para atualizar'), { status: 400 });
  }

  fields.push(`"updatedAt" = NOW()`);
  params.push(id);

  await pool.query(
    `UPDATE projects SET ${fields.join(', ')} WHERE id = $${idx}`,
    params
  );

  return getProjectById(id);
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteProject(id: string) {
  const result = await pool.query<{ id: string; title: string }>(
    `DELETE FROM projects WHERE id = $1 RETURNING id, title`,
    [id]
  );

  if (!result.rows.length) {
    throw Object.assign(new Error('Projeto não encontrado'), { status: 404 });
  }

  return { id: result.rows[0].id, title: result.rows[0].title };
}

// ─── STATS (para dashboard) ───────────────────────────────────────────────────

export async function getProjectStats() {
  const result = await pool.query<{
    total:     string;
    published: string;
    featured:  string;
  }>(`
    SELECT
      COUNT(*)                                       AS total,
      COUNT(*) FILTER (WHERE "isPublished" = true)   AS published,
      COUNT(*) FILTER (WHERE "isFeatured"  = true)   AS featured
    FROM projects
  `);

  const byCategory = await pool.query<{ category: string; count: string }>(`
    SELECT category::text AS category, COUNT(*) AS count
    FROM projects
    GROUP BY category
    ORDER BY count DESC
  `);

  const r = result.rows[0];
  return {
    total:      parseInt(r.total,     10),
    published:  parseInt(r.published, 10),
    featured:   parseInt(r.featured,  10),
    byCategory: byCategory.rows.map(c => ({
      category: c.category,
      count:    parseInt(c.count, 10),
    })),
  };
}
