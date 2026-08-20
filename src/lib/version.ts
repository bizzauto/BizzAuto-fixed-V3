// Auto-generated at build time
export const APP_VERSION = '12.0.1';
export const BUILD_TIME = new Date().toISOString();
export const BUILD_ID = process.env.GITHUB_SHA || 'local';

export const getVersionDisplay = () => {
  const date = new Date(BUILD_TIME);
  const formatted = date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `v${APP_VERSION} • ${formatted}`;
};
