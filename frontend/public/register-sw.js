// Service worker registratsiyasi (CSP-safe — public/ dan beriladi).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(function () {});
}
