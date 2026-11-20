import { register, init, getLocaleFromNavigator } from 'svelte-i18n';

// Simplified Chinese edition: zh is the only locale. The UI is fully
// translated, so the picker offers no other option and every fallback
// resolves to zh.
register('zh', () => import('./zh.json'));

export const AVAILABLE_LOCALES = [
  { code: 'zh', label: '简体中文' },
];

export function initI18n(initialLocale) {
  init({
    fallbackLocale: 'zh',
    initialLocale: 'zh',
    // Log missing-key warnings to the browser console only in dev — in
    // production builds they'd spam the console for users running a locale
    // that isn't fully translated yet.
    warnOnMissingMessages: !!import.meta.env.DEV,
  });
}

/**
 * The locale to use when the user has never chosen one. This build ships
 * Simplified Chinese only, so it always resolves to 'zh'.
 */
export function pickInitialLocale() {
  return 'zh';
}
