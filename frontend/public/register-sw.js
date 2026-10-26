/**
 * Service worker registratsiyasi va auto-update flow.
 * Yangi versiya kelganda window'ga `aidevix:sw-update` event yuboriladi.
 */
(function () {
  if (!('serviceWorker' in navigator)) return;
  if (window.location.hostname === 'localhost' && !window.__SW_DEV) return;

  function registerServiceWorker() {
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

    // First installation only claims the current page; reloading at that point
    // discards in-progress editor/form state. Refresh only controller updates.
    var refreshed = false;
    var hadController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController) {
        hadController = true;
        return;
      }
      if (refreshed) return;
      refreshed = true;
      window.location.reload();
    });
  }

  // Next's afterInteractive script can arrive after the load event has fired.
  if (document.readyState === 'complete') {
    registerServiceWorker();
  } else {
    window.addEventListener('load', registerServiceWorker, { once: true });
  }
})();
