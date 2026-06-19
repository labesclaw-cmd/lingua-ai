import { useTranslations } from "next-intl";
import Link from "next/link";

export default function HomePage() {
  const t = useTranslations("home");
  const nav = useTranslations("nav");

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            {t("title")}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            {t("subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link
              href="/vocabulary"
              className="inline-flex items-center justify-center h-10 px-6 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-700 transition-colors"
            >
              {t("startLearning")}
            </Link>
            <Link
              href="/review"
              className="inline-flex items-center justify-center h-10 px-6 rounded-lg border border-gray-300 bg-white text-gray-900 font-medium hover:bg-gray-50 transition-colors"
            >
              {t("dailyReview")}
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          {[
            { label: nav("vocabulary"), href: "/vocabulary", icon: "📚" },
            { label: nav("review"), href: "/review", icon: "🔄" },
            { label: nav("conversation"), href: "/conversation", icon: "💬" },
            { label: nav("report"), href: "/report", icon: "📊" },
            { label: nav("settings"), href: "/settings", icon: "⚙️" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700 flex items-center gap-3"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
