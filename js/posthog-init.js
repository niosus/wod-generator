(function initPostHog() {
  const projectToken = globalThis.POSTHOG_PROJECT_TOKEN;
  const host = globalThis.POSTHOG_HOST;

  if (!projectToken || !host) {
    if (globalThis.location?.hostname === 'localhost' || globalThis.location?.hostname === '127.0.0.1') {
      if (!projectToken) {
        console.error(
          'POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_PROJECT_TOKEN is configured'
        );
      }
      if (!host) {
        console.error(
          'POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_HOST is configured'
        );
      }
    }
    return;
  }

  const script = document.createElement('script');
  script.src = `${host.replace(/\/$/, '')}/static/array.js`;
  script.async = true;
  script.onload = () => {
    globalThis.posthog?.init(projectToken, {
      api_host: host,
      capture_exceptions: {
        capture_unhandled_errors: true,
        capture_unhandled_rejections: true,
        capture_console_errors: false,
      },
      logs: {
        serviceName: 'wodforge-web',
        environment: globalThis.location?.hostname === 'localhost' || globalThis.location?.hostname === '127.0.0.1'
          ? 'development'
          : 'production',
        serviceVersion: '4.0.0',
      },
    });

    globalThis.wodforgePosthogLogger = {
      info(message, attributes) {
        globalThis.posthog?.logger?.info(message, attributes);
      },
    };
    globalThis.wodforgePosthogLogger.info('PostHog browser logging initialized', {
      runtime: 'browser',
    });
  };
  document.head.append(script);
})();
