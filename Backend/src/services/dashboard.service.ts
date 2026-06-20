import prisma from '../prisma/client';
import { QuoteStatus } from '@prisma/client';

export const DashboardService = {

  // ── Stats gerais ─────────────────────────────────────────────────────────────

  async getStats() {

    const revenueByMonth = await this._getRevenueByMonth();

    const [
      totalProjects,
      publishedProjects,
      featuredProjects,
      totalClients,
      totalServices,
      activeServices,
      totalQuotes,
      pendingQuotes,
      projectsByCategory,
    ] = await Promise.all([

      // Projetos
      prisma.project.count(),
      prisma.project.count({ where: { isPublished: true } }),
      prisma.project.count({ where: { isFeatured: true } }),

      // Clientes
      prisma.client.count(),

      // Serviços
      prisma.service.count(),
      prisma.service.count({ where: { isActive: true } }),

      // Orçamentos
      prisma.quote.count(),
      prisma.quote.count({ where: { status: QuoteStatus.PENDING } }),

      // Projetos por categoria
      prisma.project.groupBy({
        by: ['category'],
        _count: {
          _all: true,
        },
        orderBy: {
          _count: {
            category: 'desc',
          },
        },
      }),
    ]);

    return {
      totalProjects,
      publishedProjects,
      featuredProjects,
      totalClients,
      totalServices,
      activeServices,
      totalQuotes,
      pendingQuotes,

      totalRevenue: 0,

      projectsByCategory: projectsByCategory.map(
        (p: { category: string; _count: { _all: number } }) => ({
          category: p.category,
          count: p._count._all,
        })
      ),

      revenueByMonth,
    };
  },

  // ── Revenue (placeholder) ───────────────────────────────────────────────────

  async _getRevenueByMonth(): Promise<{ month: string; total: number }[]> {
    const result: { month: string; total: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);

      result.push({
        month: d.toLocaleDateString('pt-BR', {
          month: 'short',
          year: '2-digit',
        }),
        total: 0,
      });
    }

    return result;
  },

  // ── Dados recentes ───────────────────────────────────────────────────────────

  async getRecent() {

    const [recentQuotes, recentClients, recentProjects] = await Promise.all([

      prisma.quote.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          projectType: true,
          estimatedBudget: true,
          status: true,
          createdAt: true,
        },
      }),

      prisma.client.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          company: true,
          logo: true,
          createdAt: true,
        },
      }),

      prisma.project.findMany({
        take: 5,
        where: { isPublished: true },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          category: true,
          thumbnail: true,
          isFeatured: true,
          createdAt: true,
          client: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    return {
      recentQuotes,
      recentClients,
      recentProjects,
    };
  },
};