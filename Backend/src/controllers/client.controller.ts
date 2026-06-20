import { Request, Response } from 'express';
import * as ClientsService from '../services/clients.service';

function handleError(res: Response, error: unknown) {
  const err = error as Error & { status?: number };
  const status = err.status ?? 500;
  const message = err.message || 'Erro interno do servidor';
  if (status === 500) console.error('[ClientsController]', error);
  res.status(status).json({ success: false, message });
}

// GET /api/clients
export async function list(req: Request, res: Response): Promise<void> {
  try {
    const { isActive, search, page, limit } = req.query as Record<string, string>;
    const result = await ClientsService.listClients({ isActive, search, page, limit });
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error);
  }
}

// GET /api/clients/stats
export async function stats(_req: Request, res: Response): Promise<void> {
  try {
    const data = await ClientsService.getClientStats();
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error);
  }
}

// GET /api/clients/:id
export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const data = await ClientsService.getClientById(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error);
  }
}

// POST /api/clients
export async function create(req: Request, res: Response): Promise<void> {
  try {
    const data = await ClientsService.createClient(req.body);
    res.status(201).json({ success: true, message: 'Cliente criado com sucesso', data });
  } catch (error) {
    handleError(res, error);
  }
}

// PUT /api/clients/:id
export async function update(req: Request, res: Response): Promise<void> {
  try {
    const data = await ClientsService.updateClient(req.params.id, req.body);
    res.json({ success: true, message: 'Cliente atualizado com sucesso', data });
  } catch (error) {
    handleError(res, error);
  }
}

// DELETE /api/clients/:id
export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const data = await ClientsService.deleteClient(req.params.id);
    res.json({ success: true, message: 'Cliente excluído com sucesso', data });
  } catch (error) {
    handleError(res, error);
  }
}