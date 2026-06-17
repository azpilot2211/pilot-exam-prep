import { getChapterBySlug, getPublishedQuestions } from "@/lib/queries";
import { redirect, notFound } from "next/navigation";

interface Props {
  params: Promise<{ chapterSlug: string }>;
}

export default async function ChapterRedirectPage({ params }: Props) {
  const { chapterSlug } = await params;
  const chapter = await getChapterBySlug(chapterSlug);
  if (!chapter) return notFound();

  const questions = await getPublishedQuestions(chapter.id);
  if (questions.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-400 text-sm">
          No published questions in this chapter yet.
        </p>
      </main>
    );
  }

  redirect(`/study/${chapterSlug}/${questions[0].id}`);
}
