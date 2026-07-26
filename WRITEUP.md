# Gemmagotchi — a study companion that's glad to see you

**Subtitle:** Gemma 4 turns your own lecture notes into bite-size lessons, and a pixel-art pet turns showing up into something you want to do — running entirely offline on a laptop.

**Team:** Abdurrehman Sajid, Favour Odeyale, Arik Subedi (GDGoC Aberdeen)
**Repo:** https://github.com/NorthNodeCode/gemmagotchi
**Demo:** clone → `ollama pull gemma4:e4b` → `npm install` → `npm run dev`. No API key, no internet.

---

## The problem: procrastination is not a scheduling bug

Every study app treats procrastination as a time-management problem and answers it with alarms, streaks and guilt. The research says that is exactly backwards. Procrastination is **short-term mood repair**: people avoid a task because the task carries a bad feeling, and anything that adds shame adds avoidance (Sirois & Pychyl, 2013). Wohl, Pychyl & Bennett (2010) showed the inverse experimentally: students who *forgave themselves* for procrastinating on one exam procrastinated **less** on the next.

So a study app that scolds you is working against its own goal — and an accountability pet that "dies" when you skip a day is a shame machine with a cute face.

Gemmagotchi's one design law: **consequences without shame.** Your pet visibly droops when you're away — but it can never die (health floors at 15), your streak survives one bad day, and coming back after a gap is met with *celebration and a gem bonus scaling with the gap*, because the moment other apps punish you is the moment you are most fragile. Verified empirically: after a simulated 5-day absence the pet's generated line was *"Oh wow! You're back! It's so good to see your face today."*

## What we built (all working, all generated on-device)

- **Onboarding:** a pixel avatar, one of six eggs, and your material — pasted or uploaded as lecture PDFs/PowerPoints (verified on a real 67-page PDF). Gemma plans one-concept sub-lessons from *your* material, never generic content.
- **Tutor loop:** one sub-lesson in full depth (plain-English glosses, exact worked examples, no cute analogies), then 2 MCQs + a free-text answer graded honestly but kindly.
- **The pet:** hatches after 3 correct answers, fully grown at 12. Every mood is visually distinct; a neglected pet is dimmed, curled up asleep with drifting z's. Scale is reserved for growth alone — swelling when things get worse would read as a reward.
- **Rescue:** "Can't start?" generates a 2-minute micro-task that is impossible to fail.
- **Socratic partner:** multi-turn chat, three modes, grounded in your notes — including a chip to talk to the pet itself, in character.
- **Drills:** questions without a lesson attached — one topic, or the **big review** spanning every week, with questions that deliberately connect two topics. Distractors are the mistakes real students make.
- **Focus timer:** a pomodoro modal whose clock lives in app state — minimise it and a live header pill keeps counting; rounds roll into breaks; finishing pays like a lesson.
- **Economy:** correct answers and comebacks earn gems; the Gem Sanctuary spends them only on the pet (heal, growth surge, a permanent "go deeper" tutor unlock) — never on skipping work.
- **Weeks and topics:** a module is organised the way a real one is — week 1: topic A, week 2: topic B — each planned from its own lectures. Upload one week's slides or the whole semester at once (each file becomes its own week).
- **Trajectory sliders:** drag "minutes a day" and "days skipped a week" and the four-week forecast redraws in ~150ms from a local saturating-curve model — Gemma writes the interpretation on a debounce, and the chart never waits for it.
- Plus **multiple modules** and a demo clock to fast-forward days.

## The coach: a second Gemma studies how you learn

Every answered question is logged with its topic, correctness and **time-to-answer**, and a coach reads that record. Onboarding ends with a one-minute **calibration** (three fixed timed questions for speed, one direct question for depth). Adding a course runs a three-question **diagnostic on your material before the plan is built**, injected into the curriculum prompt so weak areas get taught first. Both skippable: a gate you cannot decline is a wall, and walls are what procrastinators bounce off.

The result is a visible, editable **learner profile** — depth, pace, challenge, each low/medium/high — and the levels genuinely change the teaching: depth rewrites the lesson prompt and token budget, challenge rewrites the question style, pace resizes the sub-lessons the planner produces. The measured values are shown next to every dial and your override always wins.

The coach itself runs on **`gemma-4-31b-it`** — a genuinely different, larger Gemma reserved for reading the learner rather than teaching them — when an API key is present, falling back to the local model offline. Its aggregates (per-topic accuracy, median answer seconds, session mix) are computed client-side from the log; the model interprets, it never counts, so every claim it makes cites a number you can recompute by hand. Weak topics surface as one-click "drill this" chips on the dashboard and the course map. Its persona carries the same law as the pet, stated clinically: a weak point is a target, never a failing.

## How Gemma 4 is used — specifically

Every generation goes through **one seam** (`server/gemma.ts`) that knows exactly three model strings — ten distinct jobs, one place a model is ever called:

| Role | Model | Transport |
|---|---|---|
| everything, local (default) | `gemma4:e4b` | Ollama native `/api/chat` |
| everything, hosted (fallback) | `gemma-4-26b-a4b-it` | Gemini API, `@google/genai` |
| the coach | `gemma-4-31b-it` | Gemini API, local fallback |

Switching is one `.env` edit; `auto` prefers local and falls back to hosted — except coach requests, which invert the preference because the larger model is their whole point. Ten jobs run through the seam — curriculum planning, lesson writing, question writing, free-text grading, drills, pet nudges, rescue tasks, trajectory prose, the multi-turn Socratic chat, and the coach — each with its own **system-role persona** (Gemma 4 supports the system role natively). The pet's persona hard-codes the psychology: *"NEVER blame, guilt-trip, scold… A learner coming back after a gap is the BEST thing that happens to you."*

Engineering decisions that mattered:

- **Thinking mode only where it pays:** on for curriculum planning, off everywhere else. Ollama defaults it **on** — until we passed `think: false`, a 15-second lesson took 171 seconds. That flag required Ollama's native API; the OpenAI-compat shim can't control thinking and silently drops `top_k`.
- **Structured output without `responseMimeType`** (hosted Gemma has no JSON mode): JSON demanded in the prompt, repaired defensively on the way back — fences stripped, truncated output closed at the last complete element, one retry quoting the malformed output back.
- **Latency engineering for 11 tok/s:** lesson prose and questions are separate calls so you read while they generate; the next lesson prefetches; every generation caches to disk. Recommended sampling (1.0 / 0.95 / 64); exponential backoff on 429s; every endpoint has a useful offline fallback, so the app demos with the network cable out.

## Why local was the right call

We measured hosted Gemma at ~30 tok/s and local at ~11 tok/s — and still chose local as the default: no rate limits during a day of rehearsal, students' lecture notes never leave the machine, and it proves the point of open weights — the entire product runs on a laptop. Hosted is one `.env` edit away behind the same seam.

## One-day war stories

- The prototype we inherited was secretly calling `gemini-3.6-flash` with `responseMimeType` — both traps for this competition. Every model call was rerouted through our seam; `grep -ri "gemini-"` on the source returns nothing.
- The pixel packs' documentation lied about sprite indices (eggs rendered as milk bottles), so we built an in-app sprite inspector (`/dev/sprites`) and read the truth off the screen — it later settled which animation row is "asleep" by measuring alpha bounding boxes.
- Testing the sprint payout surfaced a day-old invisible bug: **every reward was paid twice**, from side effects inside React state updaters — which React double-invokes to expose exactly that impurity. Fixed with a test proving one 30-second sprint pays exactly once.

## Why these choices were right

The judges' brief asks for a companion that *nudges at the right moment, adapts, and holds learners accountable* — not one that just answers questions. Our accountability mechanism is the emotional state of a creature you raised; our adaptation is a measured, visible learner profile that provably changes the teaching; and the whole loop is built on published findings about why people actually procrastinate. The psychology is encoded in the one rule the pet can never break.

## Honest status & roadmap

Everything described above works today and is verified with Playwright tests against the running app. Planned next (designed in the repo's plan): a Spirit Farm where focus minutes water pixel-art crops, adopting additional pets with drag-and-rotate placement, and per-question spaced-repetition decks.
