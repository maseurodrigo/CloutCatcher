import i18n from 'i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

export async function init() {
  const instance = i18n
    // load translation using http -> see /public/locales
    .use(Backend)
    // Detect user language
    .use(LanguageDetector)
    // Pass the i18n instance to react-i18next
    .use(initReactI18next);

  if (import.meta.env.MODE !== 'production') {
    const { HMRPlugin } = await import('i18next-hmr/plugin');

    instance.use(new HMRPlugin({ vite: { client: true } }));
  }

  await instance.init({
    lng: 'en', // Default language
    fallbackLng: 'en', // Fallback language

    // React already handles escaping
    interpolation: { escapeValue: false },

    // Disable suspense for SSR compatibility
    react: { useSuspense: false }
  });

  // Force HTML lang update immediately after language change
  i18n.on('languageChanged', () => {
    document.documentElement.lang = i18n.language;
  });
  
  return instance;
}