import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";


import koTranslation from "./locales/ko.json";
import enTranslation from "./locales/en.json";

const resources = {
  ko: {
    translation: koTranslation // 불러온 파일을 여기에 연결
  },
  en: {
    translation: enTranslation // 불러온 파일을 여기에 연결
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: "ko", // 초기 언어 설정 (선택 사항)
    fallbackLng: "ko",
    interpolation: { escapeValue: false }
  });

export default i18n;