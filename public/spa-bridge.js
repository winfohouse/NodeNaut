(function() {
  const pushState = history.pushState;
  const replaceState = history.replaceState;

  history.pushState = function() {
    pushState.apply(history, arguments);
    window.dispatchEvent(new Event('nodenaut-navigation'));
  };

  history.replaceState = function() {
    replaceState.apply(history, arguments);
    window.dispatchEvent(new Event('nodenaut-navigation'));
  };

  window.addEventListener('popstate', () => {
    window.dispatchEvent(new Event('nodenaut-navigation'));
  });
  
  console.log('[NodeNaut] SPA Bridge Initialized');
})();
