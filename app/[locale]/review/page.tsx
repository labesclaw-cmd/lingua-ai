import { useTranslations } from "next-intl";

export default function ReviewPage() {
  const t = useTranslations("review");
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-gray-500 mt-2">Coming soon — Phase 4</p>
    </main>
  );
}
