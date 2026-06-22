"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

type Word = {
  id: string;
  word: string;
  phonetic: string | null;
  part_of_speech: string | null;
  definition_zh: string | null;
  example_sentence: string | null;
  example_sentence_zh: string | null;
  level: string;
  difficulty: number | null;
};

const LEVEL_COLORS: Record<string, string> = {
  A1: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  A2: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  B1: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  B2: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  C1: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function VocabCard({ words }: { words: Word[] }) {
  const t = useTranslations("learn");
  const [index, setIndex] = useState(0);
  const [speaking, setSpeaking] = useState(false);

  const word = words[index];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      else if (e.key === "ArrowRight") setIndex((i) => Math.min(words.length - 1, i + 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [words.length]);

  const speak = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [word.word]);

  const prev = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setIndex((i) => Math.max(0, i - 1));
  };

  const next = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setIndex((i) => Math.min(words.length - 1, i + 1));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${((index + 1) / words.length) * 100}%` }}
          />
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {index + 1} / {words.length}
        </span>
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 min-h-[360px] flex flex-col gap-5 border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white tracking-wide">
              {word.word}
            </h2>
            {word.phonetic && (
              <span className="text-base text-gray-400 dark:text-gray-500 font-mono">
                {word.phonetic}
              </span>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${LEVEL_COLORS[word.level] ?? "bg-gray-100 text-gray-700"}`}
            >
              {word.level}
            </span>
            {word.part_of_speech && (
              <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                {word.part_of_speech}
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 dark:border-gray-700" />

        {/* Definition */}
        {word.definition_zh && (
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              {t("definition")}
            </p>
            <p className="text-xl font-medium text-gray-800 dark:text-gray-200">
              {word.definition_zh}
            </p>
          </div>
        )}

        {/* Example */}
        {word.example_sentence && (
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              {t("example")}
            </p>
            <p className="text-gray-700 dark:text-gray-300 italic leading-relaxed">
              {word.example_sentence}
            </p>
            {word.example_sentence_zh && (
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                {word.example_sentence_zh}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={prev}
          disabled={index === 0}
          className="flex-1"
        >
          ← {t("prev")}
        </Button>

        <button
          onClick={speak}
          disabled={speaking}
          aria-label={t("speak")}
          className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
            speaking
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-500 scale-110"
              : "border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:text-indigo-500 text-gray-500"
          }`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        </button>

        <Button
          onClick={next}
          disabled={index === words.length - 1}
          className="flex-1"
        >
          {t("next")} →
        </Button>
      </div>

      {/* Keyboard hint */}
      <p className="text-center text-xs text-gray-400 dark:text-gray-600">
        {t("keyboardHint")}
      </p>
    </div>
  );
}
