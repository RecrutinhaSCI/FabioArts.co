import prisma from '../prisma/client';

export interface UpdateSettingsDTO {
  // Geral
  companyName?: string;
  bio?:         string | null;
  instagram?:   string | null;
  behance?:     string | null;
  linkedin?:    string | null;
  whatsapp?:    string | null;
  email?:       string | null;
  logo?:        string | null;
  banner?:      string | null;

  // Hero
  heroLabel?:               string | null;
  heroTitle?:               string | null;
  heroSubtitle?:            string | null;
  heroPrimaryText?:         string | null;
  heroPrimaryUrl?:          string | null;
  heroSecondaryText?:       string | null;
  heroSecondaryUrl?:        string | null;
  heroImage?:               string | null;

  // Sobre
  aboutLabel?:              string | null;
  aboutTitle?:              string | null;
  aboutText1?:              string | null;
  aboutText2?:              string | null;
  aboutImage1?:             string | null;
  aboutImage2?:             string | null;

  // Mentoria
  mentorshipLabel?:         string | null;
  mentorshipTitle?:         string | null;
  mentorshipSubtitle?:      string | null;
  mentorshipPrimaryText?:   string | null;
  mentorshipPrimaryUrl?:    string | null;
  mentorshipSecondaryText?: string | null;
  mentorshipSecondaryUrl?:  string | null;
  mentorshipChannelName?:   string | null;
  mentorshipOnlineCount?:   number | null;

  // Processo
  processLabel?:            string | null;
  processTitle?:            string | null;
  processSubtitle?:         string | null;

  // Footer
  footerCopyright?:         string | null;

  // Headers de seção
  ctaLabel?:                string | null;
  ctaTitle?:                string | null;
  ctaSubtitle?:             string | null;
  portfolioLabel?:          string | null;
  portfolioTitle?:          string | null;
  servicesLabel?:           string | null;
  servicesTitle?:           string | null;
  servicesSubtitle?:        string | null;
  coursesLabel?:            string | null;
  coursesTitle?:            string | null;
  coursesSubtitle?:         string | null;
  reviewsLabel?:            string | null;
  reviewsSubtitle?:         string | null;

  // Google Reviews
  googleEnabled?:           boolean;
  googlePlaceId?:           string | null;
  googleMapsUrl?:           string | null;
  googleReviewUrl?:         string | null;
  googleRatingManual?:      number | null;
  googleReviewsCount?:      number | null;
}

// Todos os campos que admin pode atualizar via PUT /settings
const UPDATABLE_FIELDS = [
  'companyName', 'bio', 'instagram', 'behance', 'linkedin',
  'whatsapp', 'email', 'logo', 'banner',
  'heroLabel', 'heroTitle', 'heroSubtitle',
  'heroPrimaryText', 'heroPrimaryUrl',
  'heroSecondaryText', 'heroSecondaryUrl', 'heroImage',
  'aboutLabel', 'aboutTitle', 'aboutText1', 'aboutText2',
  'aboutImage1', 'aboutImage2',
  'mentorshipLabel', 'mentorshipTitle', 'mentorshipSubtitle',
  'mentorshipPrimaryText', 'mentorshipPrimaryUrl',
  'mentorshipSecondaryText', 'mentorshipSecondaryUrl',
  'mentorshipChannelName', 'mentorshipOnlineCount',
  'processLabel', 'processTitle', 'processSubtitle',
  'footerCopyright',
  'ctaLabel', 'ctaTitle', 'ctaSubtitle',
  'portfolioLabel', 'portfolioTitle',
  'servicesLabel', 'servicesTitle', 'servicesSubtitle',
  'coursesLabel', 'coursesTitle', 'coursesSubtitle',
  'reviewsLabel', 'reviewsSubtitle',
  'googleEnabled', 'googlePlaceId', 'googleMapsUrl', 'googleReviewUrl',
  'googleRatingManual', 'googleReviewsCount',
] as const;

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

    const data: Record<string, unknown> = {};
    for (const field of UPDATABLE_FIELDS) {
      if (dto[field as keyof UpdateSettingsDTO] !== undefined) {
        data[field] = dto[field as keyof UpdateSettingsDTO];
      }
    }

    return prisma.siteSettings.update({
      where: { id: current.id },
      data,
    });
  },
};
