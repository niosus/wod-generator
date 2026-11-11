/**
 * WODFORGE v4 - Application Entry Point & DOM Bootstrap
 */
(async function bootstrap() {
  const initApp = async () => {
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
    if (typeof globalThis.UI !== 'undefined' && typeof globalThis.UI.init === 'function') {
      await globalThis.UI.init();
    }
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', initApp);
    } else {
      await initApp();
    }
  }
})();
