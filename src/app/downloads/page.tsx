export const dynamic = "force-dynamic";
import { getChapters, getPublishedLessons } from "@/lib/queries";
import { getTier, hasAccess } from "@/lib/entitlement";
import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { DownloadAllButton } from "@/components/DownloadAllButton";
import { AudioLessonPlayer } from "@/components/AudioLessonPlayer";
import { ChapterAccordion } from "@/components/ChapterAccordion";

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

  const totalLessons = allItems.length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Audio Course</h1>
          <p className="text-slate-400 text-sm mt-1">
            {totalLessons} lessons · Private Pilot
          </p>
        </div>
        {allItems.length > 0 && <DownloadAllButton items={allItems} />}
      </div>

      {/* Full-course download card */}
      {allItems.length > 0 && (
        <div className="bg-gradient-to-br from-sky-600 to-sky-700 rounded-2xl p-5 mb-8 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-semibold text-white">Full course — one MP3</p>
            <p className="text-sky-100 text-sm mt-0.5">
              Every lesson stitched into a single file. Great for the car or a long flight.
            </p>
          </div>
          <a
            href="/api/download/full"
            download="flying-ace-full-course.mp3"
            className="flex-shrink-0 flex items-center gap-2 bg-white text-sky-700 rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-sky-50 transition-colors whitespace-nowrap"
          >
            <Download size={14} />
            Download all
          </a>
        </div>
      )}

      {/* Chapter sections */}
      <div className="divide-y divide-slate-800">
        {perChapter.map(({ chapter, lessons }, chapterIndex) => {
          const items = lessons.filter((l) => l.audioUrl);
          if (items.length === 0) return null;

          return (
            <ChapterAccordion
              key={chapter.id}
              title={chapter.title}
              lessonCount={items.length}
              defaultOpen={chapterIndex === 0}
            >
              {items.map((lesson, i) => {
                const filename = `${chapter.slug}-lesson-${i + 1}.mp3`;
                const downloadHref = `/api/download?url=${encodeURIComponent(lesson.audioUrl as string)}&filename=${encodeURIComponent(filename)}`;
                return (
                  <AudioLessonPlayer
                    key={lesson.questionId}
                    lessonNumber={i + 1}
                    stem={lesson.stem}
                    audioUrl={lesson.audioUrl as string}
                    downloadHref={downloadHref}
                    filename={filename}
                  />
                );
              })}
            </ChapterAccordion>
          );
        })}
      </div>
    </div>
  );
}
