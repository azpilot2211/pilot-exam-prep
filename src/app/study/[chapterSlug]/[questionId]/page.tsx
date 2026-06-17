import { getChapterBySlug, getPublishedQuestions, getQuestion } from "@/lib/queries";
import { StudyView } from "@/components/StudyView";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ chapterSlug: string; questionId: string }>;
}

export default async function StudyPage({ params }: Props) {
  const { chapterSlug, questionId } = await params;

  const chapter = await getChapterBySlug(chapterSlug);
  if (!chapter) return notFound();

  const [result, questions] = await Promise.all([
    getQuestion(questionId),
    getPublishedQuestions(chapter.id),
  ]);

  if (!result) return notFound();

  const idx = questions.findIndex((q) => q.id === questionId);
  const prevId = idx > 0 ? questions[idx - 1].id : null;
  const nextId = idx < questions.length - 1 ? questions[idx + 1].id : null;

  return (
    <StudyView
      chapterSlug={chapterSlug}
      chapterTitle={chapter.title}
      question={result.question}
      options={result.options}
      content={result.content}
      prevId={prevId}
      nextId={nextId}
      questionNumber={idx + 1}
      totalQuestions={questions.length}
    />
  );
}
