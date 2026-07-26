import type { Course, SubLesson, Topic } from "../types";

/**
 * Courses are weeks of topics, each topic holding its own lecture material and
 * its own sub-lessons. Most of the app does not care about that structure —
 * it just wants "the next thing to study" or "every sub-lesson" — so the
 * flattening lives here rather than being re-derived at each call site.
 *
 * Everything orders by `week`, never by array position, because topics get
 * added out of order all the time (you upload week 5 before week 3).
 */

/** Topics in teaching order. */
export function orderedTopics(course: Course): Topic[] {
  return [...(course.topics ?? [])].sort((a, b) => a.week - b.week);
}

/** Every sub-lesson in the course, in teaching order. */
export function allModules(course: Course): SubLesson[] {
  return orderedTopics(course).flatMap((t) => t.modules);
}

/**
 * The course's material. Capped because it feeds prompts, and a whole
 * semester of lecture notes would blow the context for no benefit.
 */
export function allNotes(course: Course, cap = 8000): string {
  return orderedTopics(course)
    .map((t) => `## ${t.title}\n${t.notes}`)
    .join("\n\n")
    .slice(0, cap);
}

/** Which topic a sub-lesson belongs to — used to ground the tutor properly. */
export function topicOf(course: Course, moduleId: string): Topic | null {
  return orderedTopics(course).find((t) => t.modules.some((m) => m.id === moduleId)) ?? null;
}

/**
 * The next thing to study: the earliest unfinished sub-lesson of the earliest
 * unfinished week. Finishing week 3 moves you to week 4, not back to a gap.
 */
export function nextModuleFor(course: Course | null): SubLesson | null {
  if (!course) return null;
  for (const topic of orderedTopics(course)) {
    const next = topic.modules.find((m) => !m.completed);
    if (next) return next;
  }
  return null;
}

/** The topic the next sub-lesson lives in — what "current week" means. */
export function currentTopic(course: Course | null): Topic | null {
  if (!course) return null;
  const next = nextModuleFor(course);
  if (next) return topicOf(course, next.id);
  return orderedTopics(course).at(-1) ?? null;
}

export function markModuleComplete(course: Course, moduleId: string): Course {
  return {
    ...course,
    topics: course.topics.map((t) => ({
      ...t,
      modules: t.modules.map((m) => (m.id === moduleId ? { ...m, completed: true } : m)),
    })),
  };
}

export function topicProgress(topic: Topic): { done: number; total: number; pct: number } {
  const total = topic.modules.length;
  const done = topic.modules.filter((m) => m.completed).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function courseProgress(course: Course): { done: number; total: number; pct: number } {
  const modules = allModules(course);
  const done = modules.filter((m) => m.completed).length;
  return {
    done,
    total: modules.length,
    pct: modules.length ? Math.round((done / modules.length) * 100) : 0,
  };
}

/**
 * Fold a pre-topics course into the topics shape. Someone who used the app
 * before weeks existed still has a course sitting in localStorage, and losing
 * it would be an unforced betrayal.
 */
export function migrateCourse(course: any): Course {
  if (Array.isArray(course?.topics) && course.topics.length) return course as Course;
  return {
    ...course,
    topics: [
      {
        id: `${course.id}-t1`,
        title: course.subject || "Topic 1",
        week: 1,
        notes: course.notes ?? "",
        files: [],
        modules: course.modules ?? [],
      },
    ],
  } as Course;
}

/** Strip the extension and tidy separators, so a filename reads as a title. */
export function titleFromFilename(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
