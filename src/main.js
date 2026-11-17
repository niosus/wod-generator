/**
 * WODROLL v4 - Application Entry Point & DOM Bootstrap
 */
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';
import '@fontsource/fira-code/400.css';
import '@fontsource/fira-code/500.css';
import '@fontsource/fira-code/600.css';
import '@fontsource/fira-code/700.css';
import '../css/styles.css';

import { renderLucideIcons } from './ui/lucide-icons.js';
import { UI } from './ui/ui.js';

async function bootstrap() {
  const initApp = async () => {
    renderLucideIcons();
    await UI.init();
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', initApp);
    } else {
      await initApp();
    }
  }
}

bootstrap();
