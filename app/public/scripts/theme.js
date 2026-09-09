(() => {
  const root = document.documentElement;
  const key = 'physique-objets-theme';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = value => value === 'light' || value === 'dark';
  let preference = null;
  let button;
  try { preference = localStorage.getItem(key); } catch { /* Storage may be unavailable. */ }
  if (!valid(preference)) preference = null;

  function apply() {
    const theme = preference ?? (system.matches ? 'dark' : 'light');
    root.dataset.theme = theme;
    if (!button) return;
    const dark = theme === 'dark';
    button.setAttribute('aria-checked', String(dark));
    button.title = dark ? 'Passer au mode clair' : 'Passer au mode sombre';
  }

  // Apply before styles and page content load to avoid a flash of the wrong theme.
  apply();
  document.addEventListener('DOMContentLoaded', () => {
    button = document.querySelector('.theme-toggle');
    if (!button) return;
    button.addEventListener('click', () => {
      preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, preference); } catch { /* Keep this page usable. */ }
      apply();
    });
    apply();
    button.hidden = false;
  });
  system.addEventListener('change', () => { if (preference === null) apply(); });
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    // Ignore sessionStorage events; only this origin's local preference is shared.
    try { if (event.storageArea !== localStorage) return; } catch { return; }
    preference = valid(event.newValue) ? event.newValue : null;
    apply();
  });
})();
