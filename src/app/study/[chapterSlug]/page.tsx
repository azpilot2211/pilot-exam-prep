import { getChapterBySlug, getPublishedLessons, getFreeChapterSlugs } from "@/lib/queries";
import { getTier, hasAccess } from "@/lib/entitlement";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { LessonCard } from "@/components/LessonCard";

interface Props {
  params: Promise<{ chapterSlug: string }>;
}

export default async function StudyGuidePage({ params }: Props) {
  const { chapterSlug } = await params;
  const chapter = await getChapterBySlug(chapterSlug);
  if (!chapter) return notFound();

  const [lessons, tier, freeSlugs] = await Promise.all([
    getPublishedLessons(chapter.id),
    getTier(),
    getFreeChapterSlugs(),
  ]);

  // Free tier may only open the sample chapters; Basic+ opens all.
  if (!hasAccess(tier, "basic") && !freeSlugs.includes(chapterSlug)) {
    redirect("/course");
  }

  const isPro = hasAccess(tier, "pro");

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 pb-28">
      <div className="mb-8">
        <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1">
          Study Guide
        </p>
        <h1 className="text-2xl font-bold text-slate-900">{chapter.title}</h1>
        {chapter.description && (
          <p className="text-slate-500 mt-2 text-sm leading-relaxed">
            {chapter.description}
          </p>
        )}
        {lessons.length > 0 && (
          <p className="text-xs text-slate-400 mt-3">
            {lessons.length} lesson{lessons.length !== 1 ? "s" : ""} in this chapter
          </p>
        )}
      </div>

      {lessons.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-400 text-sm">
            No lessons published in this chapter yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {lessons.map((lesson, i) => (
            <LessonCard
              key={lesson.questionId}
              index={i}
              questionId={lesson.questionId}
              chapterSlug={chapterSlug}
              explanation={lesson.explanation}
              illustrationSvg={lesson.illustrationSvg}
              audioUrl={lesson.audioUrl}
              isPro={isPro}
            />
          ))}
        </div>
      )}

      {lessons.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-slate-200 px-4 py-4 flex justify-center">
          <Link
            href={`/quiz/${chapterSlug}`}
            className="w-full max-w-sm text-center py-3 bg-sky-600 text-white rounded-xl font-semibold hover:bg-sky-700 transition-colors"
          >
            Take Quiz →
          </Link>
        </div>
      )}
    </main>
  );
}
