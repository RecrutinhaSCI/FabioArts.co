import prisma from '../prisma/client';

export interface UpdateSettingsDTO {
  companyName?: string;
  bio?:         string | null;
  instagram?:   string | null;
  behance?:     string | null;
  linkedin?:    string | null;
  whatsapp?:    string | null;
  email?:       string | null;
  logo?:        string | null;
  banner?:      string | null;
}

// SiteSettings é um singleton: existe sempre exatamente uma linha.
// get() cria a linha default se não existir; update() opera sobre ela.

export const SettingsService = {

  async get() {
    const existing = await prisma.siteSettings.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (existing) return existing;

    return prisma.siteSettings.create({
      data: { companyName: 'FabioArts' },
    });
  },

  async update(dto: UpdateSettingsDTO) {
    const current = await this.get();

    return prisma.siteSettings.update({
      where: { id: current.id },
      data: {
        ...(dto.companyName !== undefined && { companyName: dto.companyName }),
        ...(dto.bio         !== undefined && { bio:         dto.bio }),
        ...(dto.instagram   !== undefined && { instagram:   dto.instagram }),
        ...(dto.behance     !== undefined && { behance:     dto.behance }),
        ...(dto.linkedin    !== undefined && { linkedin:    dto.linkedin }),
        ...(dto.whatsapp    !== undefined && { whatsapp:    dto.whatsapp }),
        ...(dto.email       !== undefined && { email:       dto.email }),
        ...(dto.logo        !== undefined && { logo:        dto.logo }),
        ...(dto.banner      !== undefined && { banner:      dto.banner }),
      },
    });
  },
};
