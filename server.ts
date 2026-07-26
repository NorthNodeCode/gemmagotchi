import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import {
  generate,
  generateJSON,
  activeProvider,
  GEMMA_MODEL_HOSTED,
  GEMMA_MODEL_LOCAL,
} from "./server/gemma";
import { extractDocument } from "./server/extract";
import {
  PET_VOICE,
  CURRICULUM_SYSTEM,
  LESSON_SYSTEM,
  GRADER_SYSTEM,
  DRILL_SYSTEM,
  COACH_SYSTEM,
  DEPTH_RULES,
  CHALLENGE_RULES,
  PACE_RULES,
  SOCRATIC_MODES,
  petStateBlock,
  type SocraticMode,
} from "./server/prompts";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Generous limit: lecture decks arrive base64-encoded in the JSON body.
app.use(express.json({ limit: "25mb" }));

/**
 * Turn an uploaded PDF or PPTX into plain text the tutor can teach from.
 * Files are sent base64-encoded so no multipart parser is needed.
 */
app.post("/api/extract", async (req, res) => {
  const { filename, base64 } = req.body || {};
  if (!filename || !base64) {
    return res.status(400).json({ error: "filename and base64 are required" });
  }
  try {
    const result = await extractDocument(String(filename), Buffer.from(base64, "base64"));
    if (!result.chars) {
      return res.json({
        ...result,
        warning: "No selectable text found — this file may be scanned images.",
      });
    }
    res.json(result);
  } catch (err) {
    console.error("extract failed:", err);
    res.status(422).json({
      error: `Could not read ${filename}. Try exporting it as a PDF, or paste the text instead.`,
    });
  }
});

/** Which Gemma 4 model is actually serving requests — shown in the UI. */
app.get("/api/provider", async (_req, res) => {
  const info = await activeProvider();
  res.json({ ...info, hosted: GEMMA_MODEL_HOSTED, local: GEMMA_MODEL_LOCAL });
});

// ---------------------------------------------------------------------------
// 1. Curriculum — the learner's raw notes become a plan of sub-lessons.
//    This is the one place we spend thinking tokens: it is genuine planning.
// ---------------------------------------------------------------------------
app.post("/api/ai/curriculum", async (req, res) => {
  const { notes, subject, examDate, minutesPerDay, levels, baseline } = req.body || {};
  const pace = String(levels?.pace || "medium");
  const paceRule = PACE_RULES[pace] ?? "";
  try {
    const daysLeft = examDate
      ? Math.max(1, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86_400_000))
      : 14;

    const { data, meta } = await generateJSON({
      system: paceRule ? `${CURRICULUM_SYSTEM}\n\n${paceRule}` : CURRICULUM_SYSTEM,
      thinking: true,
      cacheKey: `curriculum:${pace}`,
      maxTokens: 1600,
      prompt: `Build a study plan from these notes.

SUBJECT: ${subject || "Untitled subject"}
DAYS UNTIL THE EXAM: ${daysLeft}
MINUTES AVAILABLE PER DAY: ${minutesPerDay || 30}

NOTES:
"""
${String(notes || "").slice(0, 12000)}
"""

${baseline ? `LEARNER BASELINE (from a diagnostic quiz they just took on this material): ${String(baseline).slice(0, 600)}
Order the plan so the weaknesses named above are shored up EARLY, and do not spend a whole sub-lesson on what the baseline shows they already know.

` : ""}Split the material into 4 to 6 sub-lessons. Each sub-lesson teaches exactly ONE concept and must be teachable in about 5 minutes. Order them so earlier sub-lessons build the vocabulary later ones need. Front-load whatever is most likely to be examined.

Return JSON of this exact shape:
{
  "title": "short course title",
  "description": "one sentence on what this course covers",
  "estimatedWeeks": number,
  "modules": [
    {
      "id": "mod-1",
      "title": "sub-lesson title naming the single concept",
      "description": "a short phrase on what they will be able to do afterwards",
      "durationMins": number,
      "keyTakeaway": "the one sentence they must remember",
      "sourceExcerpt": "the exact 1-3 sentences from the notes this sub-lesson is built on"
    }
  ]
}`,
    });
    res.json({ ...data, _gemma: meta });
  } catch (error: any) {
    console.error("[curriculum]", error?.message || error);
    const subj = req.body?.subject || "your subject";
    res.json({
      title: subj,
      description: `A study plan for ${subj}.`,
      estimatedWeeks: 2,
      modules: [
        {
          id: "mod-1",
          title: `${subj}: core ideas`,
          description: "The foundational vocabulary and concepts.",
          durationMins: 15,
          keyTakeaway: "Get the core definitions solid before anything else.",
        },
        {
          id: "mod-2",
          title: `${subj}: applying it`,
          description: "Working through concrete problems step by step.",
          durationMins: 20,
          keyTakeaway: "Apply the ideas without looking at your notes.",
        },
      ],
      _offline: true,
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Lesson — teach ONE sub-lesson, then check understanding.
// ---------------------------------------------------------------------------
app.post("/api/ai/lesson", async (req, res) => {
  const { moduleTitle, sourceExcerpt, notes, subject, previousLessons, levels } = req.body || {};
  const depth = String(levels?.depth || "medium");
  const depthRule = DEPTH_RULES[depth] ?? "";
  try {
    const source = String(sourceExcerpt || notes || "").slice(0, 8000);
    const context = `SUBJECT: ${subject || "the subject"}
SUB-LESSON: ${moduleTitle}
${previousLessons?.length ? `ALREADY COVERED (do not re-teach): ${previousLessons.join("; ")}` : ""}

SOURCE MATERIAL (the learner's own notes — teach what is here, and fill in anything essential they omitted):
"""
${source}
"""`;

    // Prose only. Asking for a long markdown document inside a JSON string
    // field makes smaller models cut the prose short to reach the closing
    // brace; as free text they teach properly. The check questions are a
    // separate request (see /api/ai/checks) so the learner can start reading
    // while they generate.
    const lessonResult = await generate({
      system: depthRule ? `${LESSON_SYSTEM}\n\n${depthRule}` : LESSON_SYSTEM,
      cacheKey: `lesson-prose:${depth}`,
      maxTokens: depth === "low" ? 500 : depth === "high" ? 1600 : 1000,
      prompt: `${context}

Teach this one sub-lesson now, in markdown. Open with the italic "*The question this answers: ...*" line, teach the concept with a concrete worked example using real values, and close with the bold "**In one sentence:** ..." line.

${depth === "low" ? "Aim for 120-180 words." : depth === "high" ? "Aim for 450-600 words." : "Aim for 250-350 words — thorough on this ONE concept, but a single sitting's read."} Write the lesson itself and nothing else: no preamble, no questions, no closing remarks.`,
    });

    res.json({
      lesson: lessonResult.text.trim(),
      _gemma: { provider: lessonResult.provider, model: lessonResult.model, ms: lessonResult.ms },
    });
  } catch (error: any) {
    console.error("[lesson]", error?.message || error);
    res.status(200).json({
      lesson: `## ${moduleTitle || "This concept"}\n\n*The question this answers: what is this concept and how do I use it?*\n\nThe tutor is offline right now, so here is your own material for this sub-lesson:\n\n${String(sourceExcerpt || notes || "").slice(0, 1200)}\n\n**In one sentence:** reconnect Gemma to get the full worked explanation.`,
      _offline: true,
    });
  }
});

/**
 * Check questions for a sub-lesson. Requested separately from the prose so the
 * learner starts reading immediately instead of waiting for both.
 */
app.post("/api/ai/checks", async (req, res) => {
  const { moduleTitle, sourceExcerpt, notes, subject, levels } = req.body || {};
  const challenge = String(levels?.challenge || "medium");
  const challengeRule = CHALLENGE_RULES[challenge] ?? "";
  try {
    const { data, meta } = await generateJSON<{ questions: any[] }>({
      system: challengeRule ? `${LESSON_SYSTEM}\n\n${challengeRule}` : LESSON_SYSTEM,
      cacheKey: `lesson-checks:${challenge}`,
      maxTokens: 1100,
      prompt: `SUBJECT: ${subject || "the subject"}
SUB-LESSON: ${moduleTitle}

SOURCE MATERIAL:
"""
${String(sourceExcerpt || notes || "").slice(0, 4000)}
"""

Write 3 questions checking whether the learner can APPLY this concept (not recall a word): two multiple-choice with four options each, then one short free-text question. Keep every option under 15 words.

Return JSON:
{
  "questions": [
    { "id": "q1", "kind": "mcq", "question": "...", "options": ["...","...","...","..."], "correctIndex": 0, "explanation": "why that option is right and the others are not" },
    { "id": "q2", "kind": "mcq", "question": "...", "options": ["...","...","...","..."], "correctIndex": 2, "explanation": "..." },
    { "id": "q3", "kind": "text", "question": "...", "modelAnswer": "what a full-credit answer contains" }
  ]
}`,
    });
    res.json({ questions: data?.questions || [], _gemma: meta });
  } catch (error: any) {
    console.error("[checks]", error?.message || error);
    res.json({ questions: [], _offline: true });
  }
});

// ---------------------------------------------------------------------------
// 3. Grade — mark a free-text answer. Honest about correctness, kind in tone.
// ---------------------------------------------------------------------------
app.post("/api/ai/grade", async (req, res) => {
  const { question, modelAnswer, learnerAnswer, subject } = req.body || {};
  try {
    const { data, meta } = await generateJSON({
      system: GRADER_SYSTEM,
      cacheKey: "grade",
      maxTokens: 450,
      prompt: `Mark this answer.

SUBJECT: ${subject || "the subject"}
QUESTION: ${question}
WHAT A FULL-CREDIT ANSWER CONTAINS: ${modelAnswer || "(use your own judgement)"}
THE LEARNER WROTE: """${String(learnerAnswer || "").slice(0, 2000)}"""

Return JSON:
{
  "verdict": "correct" | "partial" | "incorrect",
  "feedback": "2-3 sentences: what was right, what was missing, and the correct answer with a concrete example",
  "missedPoint": "the single most important thing they did not say, or null"
}`,
    });
    res.json({ ...data, _gemma: meta });
  } catch (error: any) {
    console.error("[grade]", error?.message || error);
    res.json({
      verdict: "partial",
      feedback:
        "The tutor could not reach Gemma to mark this one. Compare your answer against the model answer and keep going.",
      missedPoint: null,
      _offline: true,
    });
  }
});

// ---------------------------------------------------------------------------
// 3b. Socratic partner — a live conversation, grounded in the learner's own
//     material. Multi-turn: the last few messages are replayed as context, so
//     a follow-up like "why?" means something.
// ---------------------------------------------------------------------------
app.post("/api/ai/socratic-chat", async (req, res) => {
  const { topic, userMessage, mode, petName, notes, history, pet } = req.body || {};
  const chatMode: SocraticMode = mode in SOCRATIC_MODES ? mode : "socratic";
  const askingPet = !!req.body?.askPet;

  // The pet answers in its own voice; the tutor modes answer in the tutor's.
  const system = askingPet
    ? `${PET_VOICE}\n\n${petStateBlock({
        name: petName || "your pet",
        species: pet?.species || "creature",
        stage: pet?.stage || "baby",
        mood: pet?.mood || "content",
        health: pet?.health ?? 80,
        daysSinceStudy: pet?.daysSinceStudy ?? 0,
        streak: pet?.streak ?? 0,
        isComeback: !!pet?.isComeback,
      })}`
    : SOCRATIC_MODES[chatMode];

  const transcript = Array.isArray(history)
    ? history
        .slice(-8)
        .map((m: any) => `${m.sender === "user" ? "LEARNER" : "YOU"}: ${String(m.text).slice(0, 600)}`)
        .join("\n")
    : "";

  try {
    const { text, ...meta } = await generate({
      system,
      cacheKey: `socratic:${chatMode}:${askingPet}`,
      maxTokens: askingPet ? 200 : 600,
      prompt: `TOPIC: ${topic || "their course"}
${notes ? `\nTHE LEARNER'S OWN MATERIAL (teach from this, it is what they must know):\n"""${String(notes).slice(0, 1500)}"""\n` : ""}${transcript ? `\nCONVERSATION SO FAR:\n${transcript}\n` : ""}
LEARNER'S NEW MESSAGE: ${String(userMessage || "").slice(0, 1000)}

Reply directly, in character. Plain prose — no JSON, no markdown headings, no LaTeX.`,
    });

    res.json({ reply: text.trim(), sender: askingPet ? "pet" : "gemma", _gemma: meta });
  } catch (error: any) {
    console.error("[socratic]", error?.message || error);
    res.json({ reply: socraticFallback(chatMode, topic, askingPet, petName), sender: askingPet ? "pet" : "gemma", _offline: true });
  }
});

function socraticFallback(
  mode: SocraticMode,
  topic: string,
  askingPet: boolean,
  petName?: string
): string {
  if (askingPet) {
    return `${petName || "Your pet"} nudges your hand. Every question you answer makes me a little bigger — want to do just one?`;
  }
  if (mode === "test") {
    return `Gemma is offline, so here is the question that always works: explain ${topic || "this concept"} to someone who has never heard of it, out loud, without looking at your notes. Where you stall is what to study next.`;
  }
  if (mode === "explain") {
    return `Gemma is offline right now. In the meantime: find the single worked example in your notes for ${topic || "this topic"} and redo it on paper without looking. Getting stuck is the useful part — it shows you the exact step you do not yet own.`;
  }
  return `Gemma is offline right now. Try this instead: write down what you think you know about ${topic || "this topic"}, then find the one sentence in your notes that would prove you wrong.`;
}

// ---------------------------------------------------------------------------
// 3d. The coach — a second, larger Gemma reads the learner's tracked
//     behaviour and says what it actually shows. Aggregates are computed
//     client-side from the answer log; the model interprets, it never counts.
// ---------------------------------------------------------------------------
app.post("/api/ai/coach", async (req, res) => {
  const { evidence, levels, subject } = req.body || {};

  try {
    const { data, meta } = await generateJSON({
      system: COACH_SYSTEM,
      expert: true,
      cacheKey: "coach",
      maxTokens: 1400,
      prompt: `Read this learner's measured data and report back to them directly ("you", not "the learner").

SUBJECT THEY ARE STUDYING: ${subject || "their course"}
CURRENT SETTINGS: depth=${levels?.depth}, pace=${levels?.pace}, challenge=${levels?.challenge}

MEASURED DATA:
${JSON.stringify(evidence ?? {}, null, 2).slice(0, 3000)}

Return JSON:
{
  "read": "2-3 sentences: the honest, warm summary of how they are actually learning, citing at least one number",
  "observations": ["up to 3 one-sentence observations, each citing its evidence"],
  "weakPoints": [{ "topic": "topic name from the data", "evidence": "the numbers", "suggestion": "one concrete action" }],
  "suggestedLevels": { "depth": "low|medium|high", "pace": "low|medium|high", "challenge": "low|medium|high" },
  "nextBestAction": "the single most valuable 10 minutes they could spend right now"
}

Only name weakPoints that appear in the measured data. If there is little data, say so plainly and keep every array short.`,
    });
    res.json({ ...data, _gemma: meta });
  } catch (error: any) {
    console.error("[coach]", error?.message || error);
    res.json({
      read: "The coach could not reach Gemma just now — the numbers below are computed locally and are still accurate.",
      observations: [],
      weakPoints: [],
      suggestedLevels: {},
      nextBestAction: "Run one five-question drill — every answer sharpens this picture.",
      _offline: true,
    });
  }
});

// ---------------------------------------------------------------------------
// 3c. Drills — retrieval practice on demand, for the learner who does not want
//     a lesson today, just to be tested. Also powers the whole-course review.
// ---------------------------------------------------------------------------
app.post("/api/ai/drill", async (req, res) => {
  const { subject, notes, topics, count, scope, levels } = req.body || {};
  const challenge = String(levels?.challenge || "medium");
  const challengeRule = CHALLENGE_RULES[challenge] ?? "";
  const howMany = Math.min(10, Math.max(3, Number(count) || 5));
  const wholeCourse = scope === "course";

  const topicList = Array.isArray(topics) && topics.length
    ? topics.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")
    : "";

  try {
    const { data, meta } = await generateJSON({
      system: challengeRule ? `${DRILL_SYSTEM}\n\n${challengeRule}` : DRILL_SYSTEM,
      cacheKey: `drill:${scope}:${howMany}:${challenge}`,
      maxTokens: 1400,
      prompt: `Write ${howMany} retrieval-practice questions for a student revising ${subject || "this subject"}.

${topicList ? `THE TOPICS THEY HAVE COVERED:\n${topicList}\n` : ""}
THEIR MATERIAL:
"""${String(notes || "").slice(0, 8000)}"""

${
  wholeCourse
    ? "This is a WHOLE-COURSE review. Span EVERY topic listed above — do not cluster on one. Prefer questions that force the student to connect two different topics."
    : "Stay on this topic, but move from recall to application across the set."
}

Mix formats: about two thirds multiple choice, one third short free-text answers.
Questions must require APPLYING an idea, not recognising a word.

Return JSON:
{
  "questions": [
    { "id": "q1", "kind": "mcq", "question": "...", "options": ["...","...","...","..."], "correctIndex": 0, "explanation": "why that is right, with a concrete example" },
    { "id": "q2", "kind": "text", "question": "...", "modelAnswer": "what a full-credit answer contains" }
  ]
}`,
    });

    const questions = Array.isArray(data?.questions) ? data.questions : [];
    if (!questions.length) throw new Error("no questions produced");
    res.json({ questions, _gemma: meta });
  } catch (error: any) {
    console.error("[drill]", error?.message || error);
    res.json({
      questions: [
        {
          id: "f1",
          kind: "text",
          question: `Without looking at your notes, explain the single most important idea in ${subject || "this topic"} to someone who has never met it.`,
          modelAnswer: "Any clear, correct explanation in the learner's own words.",
        },
        {
          id: "f2",
          kind: "text",
          question: "Which part of that explanation did you have to reach for? That is what to study next.",
          modelAnswer: "Naming the shaky step honestly.",
        },
      ],
      _offline: true,
    });
  }
});

// ---------------------------------------------------------------------------
// 4. Nudge — the pet's voice, driven by its current state.
// ---------------------------------------------------------------------------
app.post("/api/ai/nudge", async (req, res) => {
  const { pet, subject, nextStep } = req.body || {};
  const petCtx = {
    name: pet?.name || "your pet",
    species: pet?.species || "creature",
    stage: pet?.stage || "baby",
    mood: pet?.mood || "content",
    health: pet?.health ?? 80,
    daysSinceStudy: pet?.daysSinceStudy ?? 0,
    streak: pet?.streak ?? 0,
    isComeback: !!pet?.isComeback,
  };

  try {
    const { data, meta } = await generateJSON({
      system: `${PET_VOICE}\n\n${petStateBlock(petCtx)}`,
      cacheKey: "nudge",
      maxTokens: 300,
      prompt: `Say something to the learner right now. They are studying ${subject || "their course"}.${nextStep ? ` The next thing on their plan is: ${nextStep}.` : ""}

Offer them ONE tiny next step — small enough that it would feel silly to refuse (two minutes or less).

Return JSON:
{
  "nudge": "1-2 sentences in your voice",
  "tone": "welcoming" | "encouraging" | "celebratory" | "sleepy",
  "actionItem": "the tiny next step, phrased as an invitation",
  "petReaction": "a short stage direction describing what you are doing, e.g. 'Biscuit stretches and blinks at you'"
}`,
    });
    res.json({ ...data, _gemma: meta });
  } catch (error: any) {
    console.error("[nudge]", error?.message || error);
    const comeback = petCtx.isComeback || petCtx.daysSinceStudy > 0;
    res.json(
      comeback
        ? {
            nudge: `${petCtx.name} perks up the moment you appear. Good to see you!`,
            tone: "welcoming",
            actionItem: "Warm up with one quick question — two minutes, that's all.",
            petReaction: `${petCtx.name} bounces over to you`,
            _offline: true,
          }
        : {
            nudge: `${petCtx.name} is ready whenever you are.`,
            tone: "encouraging",
            actionItem: "Start the next sub-lesson — it's a short one.",
            petReaction: `${petCtx.name} watches you hopefully`,
            _offline: true,
          }
    );
  }
});

// ---------------------------------------------------------------------------
// 5. Rescue — the two-minute, impossible-to-fail restart after a gap.
//    This is the app's answer to "I've fallen behind and now I can't start".
// ---------------------------------------------------------------------------
app.post("/api/ai/rescue", async (req, res) => {
  const { subject, pet, feeling } = req.body || {};
  const petCtx = {
    name: pet?.name || "your pet",
    species: pet?.species || "creature",
    stage: pet?.stage || "baby",
    mood: pet?.mood || "sleepy",
    health: pet?.health ?? 50,
    daysSinceStudy: pet?.daysSinceStudy ?? 1,
    streak: pet?.streak ?? 0,
    isComeback: true,
  };

  try {
    const { data, meta } = await generateJSON({
      system: `${PET_VOICE}\n\n${petStateBlock(petCtx)}`,
      cacheKey: "rescue",
      maxTokens: 450,
      prompt: `The learner feels stuck or behind on ${subject || "their studies"}.${feeling ? ` They said: "${feeling}".` : ""}

Give them a restart that takes under two minutes and is impossible to fail. The point is momentum, not assessment. Make the question easy enough that they will get it right.

Remember: getting stuck is completely normal and you are simply happy they came back. Do not reference lost time.

Return JSON:
{
  "rescueTitle": "a short warm title for this restart",
  "microChallenge": "one concrete action taking under two minutes",
  "quickQuestion": { "question": "an easy warm-up question", "options": ["...","...","..."], "correctIndex": 0 },
  "encouragement": "one sentence in your voice"
}`,
    });
    res.json({ ...data, _gemma: meta });
  } catch (error: any) {
    console.error("[rescue]", error?.message || error);
    res.json({
      rescueTitle: "The two-minute restart",
      microChallenge: `Write down two things you already remember about ${subject || "your topic"}. That's the whole task.`,
      quickQuestion: {
        question: "What is the best-sized first step when starting feels hard?",
        options: ["The smallest one you won't refuse", "A three-hour deep session", "Wait for motivation"],
        correctIndex: 0,
      },
      encouragement: `${petCtx.name} is just happy you're here.`,
      _offline: true,
    });
  }
});

// ---------------------------------------------------------------------------
// 6. Trajectory — where consistency takes you vs where drifting takes you.
// ---------------------------------------------------------------------------
const TRAJECTORY_SYSTEM = `You are a learning analyst inside a study app. You model how study consistency compounds over four weeks. You never shame the learner about the slower path — you present it as a neutral consequence of a schedule, never as a personal failing.`;

app.post("/api/ai/trajectory", async (req, res) => {
  const { subject, minutesPerDay, streak, daysSinceStudy } = req.body || {};
  try {
    const { data, meta } = await generateJSON({
      system: TRAJECTORY_SYSTEM,
      cacheKey: "trajectory",
      maxTokens: 900,
      prompt: `Project four weeks ahead for a learner studying ${subject || "their course"}.
Average minutes per day: ${minutesPerDay || 20}. Current streak: ${streak || 0} days. Days since last session: ${daysSinceStudy || 0}.

Compare steady practice against drifting. Be realistic, not alarmist, and describe the drifting path without any judgement of the learner.

Return JSON:
{
  "summaryText": "two sentences on what steady practice gets them",
  "forecastData": [
    { "week": "Week 1", "consistentMastery": 25, "driftingMastery": 12, "petHealthConsistent": 92, "petHealthDrifting": 60 },
    { "week": "Week 2", "consistentMastery": 50, "driftingMastery": 18, "petHealthConsistent": 96, "petHealthDrifting": 45 },
    { "week": "Week 3", "consistentMastery": 75, "driftingMastery": 24, "petHealthConsistent": 100, "petHealthDrifting": 35 },
    { "week": "Week 4", "consistentMastery": 94, "driftingMastery": 30, "petHealthConsistent": 100, "petHealthDrifting": 25 }
  ],
  "outcomes": { "ifConsistent": "one sentence", "ifDrifting": "one sentence, neutral and non-judgemental" }
}`,
    });
    res.json({ ...data, _gemma: meta });
  } catch (error: any) {
    console.error("[trajectory]", error?.message || error);
    res.json({
      summaryText: `About ${minutesPerDay || 20} minutes a day compounds fast — four weeks of that covers the whole course comfortably.`,
      forecastData: [
        { week: "Week 1", consistentMastery: 25, driftingMastery: 12, petHealthConsistent: 92, petHealthDrifting: 60 },
        { week: "Week 2", consistentMastery: 50, driftingMastery: 18, petHealthConsistent: 96, petHealthDrifting: 45 },
        { week: "Week 3", consistentMastery: 75, driftingMastery: 24, petHealthConsistent: 100, petHealthDrifting: 35 },
        { week: "Week 4", consistentMastery: 94, driftingMastery: 30, petHealthConsistent: 100, petHealthDrifting: 25 },
      ],
      outcomes: {
        ifConsistent: "You finish the material with a week spare, and your companion is fully grown.",
        ifDrifting: "You cover about a third of it, and there's more to catch up on later.",
      },
      _offline: true,
    });
  }
});

// ---------------------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", async () => {
    const info = await activeProvider();
    console.log(`\n  Gemmagotchi running on http://localhost:${PORT}`);
    console.log(`  Gemma 4 provider: ${info.provider} (${info.model})\n`);
  });
}

startServer();
