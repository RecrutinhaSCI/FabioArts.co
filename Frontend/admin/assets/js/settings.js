/* ============================================================
   FABIOARTS ADMIN — settings.js (singleton SiteSettings)
   ============================================================ */

(function () {
  'use strict';

  if (typeof Auth === 'undefined' || !Auth.requireAuth()) return;

  const fields = {
    companyName: document.getElementById('f-companyName'),
    email:       document.getElementById('f-email'),
    bio:         document.getElementById('f-bio'),
    whatsapp:    document.getElementById('f-whatsapp'),
    instagram:   document.getElementById('f-instagram'),
    behance:     document.getElementById('f-behance'),
    linkedin:    document.getElementById('f-linkedin'),
    logo:        document.getElementById('f-logo'),
    banner:      document.getElementById('f-banner'),
  };
  const btnSave   = document.getElementById('btn-save');
  const btnReload = document.getElementById('btn-reload');

  async function load() {
    try {
      const res = await API.get('/settings');
      const s = res.data || {};
      Object.keys(fields).forEach(k => { if (fields[k]) fields[k].value = s[k] ?? ''; });
    } catch (err) {
      Toast.error(err.message || 'Erro ao carregar configurações');
    }
  }

  async function save() {
    const payload = {};
    Object.keys(fields).forEach(k => {
      const v = fields[k]?.value?.trim();
      payload[k] = v === '' ? null : v;
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
