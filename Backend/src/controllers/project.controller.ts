import { Request, Response } from 'express';
import * as ProjectsService from '../services/project.service';

function handleError(res: Response, error: unknown) {
  const err = error as Error & { status?: number };
  const status = err.status ?? 500;
  const message = err.message || 'Erro interno do servidor';
  if (status === 500) console.error('[ProjectsController]', error);
  res.status(status).json({ success: false, message });
}

// GET /api/projects
export async function list(req: Request, res: Response): Promise<void> {
  try {
    const {
      category,
      isFeatured, is_featured,
      isPublished, is_published,
      clientId, client_id,
      search, page, limit,
    } = req.query as Record<string, string>;

    // Aceita ambos formatos (camelCase ou snake_case) por compatibilidade
    const result = await ProjectsService.listProjects({
      category,
      isFeatured:  isFeatured  ?? is_featured,
      isPublished: isPublished ?? is_published,
      clientId:    clientId    ?? client_id,
      search, page, limit,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error);
  }
}

// GET /api/projects/:id
export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const data = await ProjectsService.getProjectById(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error);
  }
}

// GET /api/projects/slug/:slug
export async function getBySlug(req: Request, res: Response): Promise<void> {
  try {
    const data = await ProjectsService.getProjectBySlug(req.params.slug);
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error);
  }
}

// POST /api/projects
export async function create(req: Request, res: Response): Promise<void> {
  try {
    const data = await ProjectsService.createProject(req.body);
    res.status(201).json({ success: true, message: 'Projeto criado com sucesso', data });
  } catch (error) {
    handleError(res, error);
  }
}

// PUT /api/projects/:id
export async function update(req: Request, res: Response): Promise<void> {
  try {
    const data = await ProjectsService.updateProject(req.params.id, req.body);
    res.json({ success: true, message: 'Projeto atualizado com sucesso', data });
  } catch (error) {
    handleError(res, error);
  }
}

// DELETE /api/projects/:id
export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const data = await ProjectsService.deleteProject(req.params.id);
    res.json({ success: true, message: 'Projeto excluído com sucesso', data });
  } catch (error) {
    handleError(res, error);
  }
}

// GET /api/projects/stats
export async function stats(_req: Request, res: Response): Promise<void> {
  try {
    const data = await ProjectsService.getProjectStats();
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error);
  }
}