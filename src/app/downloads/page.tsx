export const dynamic = "force-dynamic";
import { getChapters, getPublishedLessons } from "@/lib/queries";
import { getTier, hasAccess } from "@/lib/entitlement";
import { redirect } from "next/navigation";
import { DownloadAllButton } from "@/components/DownloadAllButton";

export default async function DownloadsPage() {
  const tier = await getTier();
  if (!hasAccess(tier, "pro")) redirect("/course");

  const chapters = await getChapters();
  const perChapter = await Promise.all(
    chapters.map(async (c) => ({
      chapter: c,
      lessons: await getPublishedLessons(c.id),
    }))
  );

  const allItems = perChapter.flatMap(({ chapter, lessons }) =>
    lessons
      .filter((l) => l.audioUrl)
      .map((l, i) => ({
        url: l.audioUrl as string,
        filename: `${chapter.slug}-lesson-${i + 1}.mp3`,
      }))
  );

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Course downloads</h1>
          <p className="text-slate-400 text-sm mt-1">{allItems.length} audio lessons</p>
        </div>
        {allItems.length > 0 && <DownloadAllButton items={allItems} />}
      </div>

      <div className="flex flex-col gap-4">
        {perChapter.map(({ chapter, lessons }) => {
          const items = lessons.filter((l) => l.audioUrl);
          if (items.length === 0) return null;
          return (
            <div key={chapter.id} className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-sm font-semibold text-slate-900 mb-2">{chapter.title}</p>
              <div className="flex flex-col gap-1">
                {items.map((l, i) => {
                  const filename = `${chapter.slug}-lesson-${i + 1}.mp3`;
                  const href = `/api/download?url=${encodeURIComponent(l.audioUrl as string)}&filename=${encodeURIComponent(filename)}`;
                  return (
                    <a
                      key={l.questionId}
                      href={href}
                      className="text-xs text-sky-600 hover:underline"
                    >
                      Lesson {i + 1}.mp3
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
