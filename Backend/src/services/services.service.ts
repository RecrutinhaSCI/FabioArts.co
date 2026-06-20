import prisma from '../prisma/client';
import { ApiError } from '../utils/ApiError';

export interface CreateServiceDTO {
  name:           string;
  description:    string;
  startingPrice?: number | null;
  image?:         string | null;
  isFeatured?:    boolean;
  isActive?:      boolean;
  order?:         number;
}

export interface UpdateServiceDTO extends Partial<CreateServiceDTO> {}

export interface ListServicesOptions {
  isActive?: string;
  search?:   string;
  page?:     string;
  limit?:    string;
}

export const ServicesService = {

  async list(opts: ListServicesOptions) {
    const page  = Math.max(1, parseInt(opts.page  || '1',  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(opts.limit || '20', 10) || 20));

    const where: Record<string, unknown> = {};
    if (opts.isActive !== undefined) where.isActive = opts.isActive === 'true';
    if (opts.search) {
      where.OR = [
        { name:        { contains: opts.search, mode: 'insensitive' } },
        { description: { contains: opts.search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.service.count({ where }),
      prisma.service.findMany({
        where,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(id: string) {
    const service = await prisma.service.findUnique({ where: { id } });
    if (!service) throw ApiError.notFound('Serviço não encontrado');
    return service;
  },

  async create(dto: CreateServiceDTO) {
    if (!dto.name?.trim())        throw ApiError.badRequest('O campo name é obrigatório');
    if (!dto.description?.trim()) throw ApiError.badRequest('O campo description é obrigatório');

    return prisma.service.create({
      data: {
        name:          dto.name.trim(),
        description:   dto.description.trim(),
        startingPrice: dto.startingPrice ?? null,
        image:         dto.image ?? null,
        isFeatured:    dto.isFeatured ?? false,
        isActive:      dto.isActive   ?? true,
        order:         dto.order      ?? 0,
      },
    });
  },

  async update(id: string, dto: UpdateServiceDTO) {
    await this.getById(id); // 404 se não existe

    return prisma.service.update({
      where: { id },
      data: {
        ...(dto.name          !== undefined && { name:          dto.name.trim() }),
        ...(dto.description   !== undefined && { description:   dto.description.trim() }),
        ...(dto.startingPrice !== undefined && { startingPrice: dto.startingPrice }),
        ...(dto.image         !== undefined && { image:         dto.image }),
        ...(dto.isFeatured    !== undefined && { isFeatured:    dto.isFeatured }),
        ...(dto.isActive      !== undefined && { isActive:      dto.isActive }),
        ...(dto.order         !== undefined && { order:         dto.order }),
      },
    });
  },

  async remove(id: string) {
    await this.getById(id);
    await prisma.service.delete({ where: { id } });
    return { id };
  },
};
