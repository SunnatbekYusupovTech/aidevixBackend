/**
 * Service worker registratsiyasi va auto-update flow.
 * Yangi versiya kelganda window'ga `aidevix:sw-update` event yuboriladi.
 */
(function () {
  if (!('serviceWorker' in navigator)) return;
  if (window.location.hostname === 'localhost' && !window.__SW_DEV) return;

  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(function (reg) {
        // Yangi worker topilganda — installed bo'lguncha kutamiz
        reg.addEventListener('updatefound', function () {
          var installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', function () {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              // Yangi versiya tayyor — UI'ga signal
              window.dispatchEvent(new CustomEvent('aidevix:sw-update', {
                detail: { worker: installing },
              }));
            }
          });
        });

        // Har 60 daqiqada manual check (foreground tab)
        setInterval(function () {
          reg.update().catch(function () {});
        }, 60 * 60 * 1000);
      })
      .catch(function () {});

    // Yangi SW activate bo'lganda sahifani yangilash
    var refreshed = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (refreshed) return;
      refreshed = true;
      window.location.reload();
    });
  });
})();
