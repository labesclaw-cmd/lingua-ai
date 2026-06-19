import { useTranslations } from "next-intl";

export default function VocabularyPage() {
  const t = useTranslations("vocabulary");
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-gray-500 mt-2">Coming soon — Phase 3</p>
    </main>
  );
}
