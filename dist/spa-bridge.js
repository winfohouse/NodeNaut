(function() {
  const pushState = history.pushState;
  const replaceState = history.replaceState;

  history.pushState = function() {
    pushState.apply(history, arguments);
    window.dispatchEvent(new Event('flowpilot-navigation'));
  };

  history.replaceState = function() {
    replaceState.apply(history, arguments);
    window.dispatchEvent(new Event('flowpilot-navigation'));
  };

  window.addEventListener('popstate', () => {
    window.dispatchEvent(new Event('flowpilot-navigation'));
  });
  
  console.log('[FlowPilot] SPA Bridge Initialized');
})();
