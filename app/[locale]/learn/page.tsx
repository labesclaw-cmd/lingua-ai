import { createClient } from "@/lib/supabase/server";
import VocabCard from "./VocabCard";
import { getTranslations } from "next-intl/server";

export default async function LearnPage() {
  const t = await getTranslations("learn");
  const supabase = await createClient();

  const { data: words, error } = await supabase
    .from("vocabulary")
    .select("id, word, phonetic, part_of_speech, definition_zh, example_sentence, example_sentence_zh, level, difficulty")
    .order("level", { ascending: true })
    .order("difficulty", { ascending: true })
    .order("word", { ascending: true });

  if (error || !words || words.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <p className="text-gray-500 dark:text-gray-400 text-lg">{t("noWords")}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">
          {t("title")}
        </h1>
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-8">
          {words.length} {t("totalWords")}
        </p>
        <VocabCard words={words} />
      </div>
    </main>
  );
}
