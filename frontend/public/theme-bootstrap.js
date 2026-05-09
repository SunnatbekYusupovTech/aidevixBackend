// Sahifa hydratdan oldin ishga tushadi — FOUC va theme/lang flash'ini oldini oladi.
// CSP siyosati uchun: bu fayl statik /public dan beriladi, hech qanday inline script kerak emas.
(function () {
  try {
    var root = document.documentElement;
    var theme = localStorage.getItem('aidevix_theme');
    var lang = localStorage.getItem('aidevix_lang');
    var prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    var browserLang = (navigator.language || '').slice(0, 2).toLowerCase();
    var resolvedTheme = theme === 'light' || theme === 'dark' ? theme : (prefersLight ? 'light' : 'dark');
    var resolvedLang = (lang === 'uz' || lang === 'ru' || lang === 'en')
      ? lang
      : (browserLang === 'ru' || browserLang === 'en' ? browserLang : 'uz');

    root.dataset.theme = resolvedTheme;
    root.classList.toggle('light-mode', resolvedTheme === 'light');
    root.classList.toggle('dark-mode', resolvedTheme === 'dark');
    root.lang = resolvedLang;
    root.dataset.lang = resolvedLang;
    root.style.colorScheme = resolvedTheme;
  } catch (error) {}
})();
