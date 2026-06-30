/* ============================================================
   FABIOARTS ADMIN — settings.js (singleton SiteSettings estendido)
   Suporta: Geral + Hero + Sobre + Mentoria + Processo + Footer
   ============================================================ */

(function () {
  'use strict';

  if (typeof Auth === 'undefined' || !Auth.requireAuth()) return;

  // Mapeia: chave do form (id="f-X") → campo do payload
  const FIELDS = [
    // Geral
    'companyName', 'email', 'bio', 'whatsapp', 'instagram',
    'behance', 'linkedin', 'logo', 'banner',
    // Hero
    'heroLabel', 'heroTitle', 'heroSubtitle',
    'heroPrimaryText', 'heroPrimaryUrl',
    'heroSecondaryText', 'heroSecondaryUrl', 'heroImage',
    // Sobre
    'aboutLabel', 'aboutTitle', 'aboutText1', 'aboutText2',
    'aboutImage1', 'aboutImage2',
    // Mentoria
    'mentorshipLabel', 'mentorshipTitle', 'mentorshipSubtitle',
    'mentorshipPrimaryText', 'mentorshipPrimaryUrl',
    'mentorshipSecondaryText', 'mentorshipSecondaryUrl',
    'mentorshipChannelName', 'mentorshipOnlineCount',
    // Processo
    'processLabel', 'processTitle', 'processSubtitle',
    // Footer
    'footerCopyright',
    // Headers de seção (R10B)
    'ctaLabel', 'ctaTitle', 'ctaSubtitle',
    'portfolioLabel', 'portfolioTitle',
    'servicesLabel', 'servicesTitle', 'servicesSubtitle',
    'coursesLabel', 'coursesTitle', 'coursesSubtitle',
    'reviewsLabel', 'reviewsSubtitle',
    // Google Reviews
    'googleEnabled', 'googlePlaceId', 'googleMapsUrl', 'googleReviewUrl',
    'googleRatingManual', 'googleReviewsCount',
  ];

  // Campos numéricos (precisam conversão antes do PUT)
  const NUMERIC_FIELDS = new Set([
    'mentorshipOnlineCount',
    'googleRatingManual',
    'googleReviewsCount',
  ]);
  const BOOLEAN_FIELDS = new Set(['googleEnabled']);

  const btnSave   = document.getElementById('btn-save');
  const btnReload = document.getElementById('btn-reload');

  function fieldEl(name) { return document.getElementById('f-' + name); }

  async function load() {
    try {
      const res = await API.get('/settings');
      const s = res.data || {};
      FIELDS.forEach(f => {
        const el = fieldEl(f);
        if (!el) return;
        if (BOOLEAN_FIELDS.has(f)) {
          el.checked = !!s[f];
        } else {
          el.value = s[f] == null ? '' : s[f];
        }
      });
    } catch (err) {
      Toast.error(err.message || 'Erro ao carregar configurações');
    }
  }

  async function save() {
    const payload = {};
    FIELDS.forEach(f => {
      const el = fieldEl(f);
      if (!el) return;
      if (BOOLEAN_FIELDS.has(f)) {
        payload[f] = !!el.checked;
        return;
      }
      const raw = el.value.trim();
      if (NUMERIC_FIELDS.has(f)) {
        payload[f] = raw === '' ? null : Number(raw);
      } else {
        payload[f] = raw === '' ? null : raw;
      }
    });
    // companyName não pode ser null no schema
    if (!payload.companyName) payload.companyName = 'FabioArts';

    Helpers.setButtonLoading(btnSave, true);
    try {
      await API.put('/settings', payload);
      Toast.success('Configurações salvas');
    } catch (err) {
      Toast.error(err.message || 'Erro ao salvar');
    } finally {
      Helpers.setButtonLoading(btnSave, false);
    }
  }

  btnSave?.addEventListener('click', save);
  btnReload?.addEventListener('click', load);

  load();
})();
