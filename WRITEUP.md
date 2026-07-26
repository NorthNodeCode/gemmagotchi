# Gemmagotchi — a study companion that's glad to see you

**Subtitle:** Gemma 4 turns your own lecture notes into bite-size lessons, and a pixel-art pet turns showing up into something you want to do — running entirely offline on a laptop.

**Team:** Abdurrehman Sajid, Favour Odeyale, Arik Subedi (GDGoC Aberdeen)
**Repo:** https://github.com/NorthNodeCode/gemmagotchi
**Demo:** clone → `ollama pull gemma4:e4b` → `npm install` → `npm run dev`. No API key, no internet.

---

## The problem: procrastination is not a scheduling bug

Every study app treats procrastination as a time-management problem and answers it with alarms, streaks and guilt. The research says that is exactly backwards. Procrastination is **short-term mood repair**: people avoid a task because the task carries a bad feeling, and anything that adds shame adds avoidance (Sirois & Pychyl, 2013). Wohl, Pychyl & Bennett (2010) showed the inverse experimentally: students who *forgave themselves* for procrastinating on one exam procrastinated **less** on the next.

So a study app that scolds you is working against its own goal — and an accountability pet that "dies" when you skip a day is a shame machine with a cute face.

Gemmagotchi's one design law: **consequences without shame.** Your pet visibly droops when you're away — but it can never die (health floors at 15), your streak survives one bad day, and coming back after a gap is met with *celebration and a gem bonus that scales with how long you were gone*. The moment the app would normally punish you is the moment it is warmest, because that is the moment the research says you are most fragile. We verified this empirically: after a simulated 5-day absence, the pet's generated line was *"Oh wow! You're back! It's so good to see your face today"* — tone `celebratory`, not a syllable of guilt.

## What we built (all working, all generated on-device)

- **Onboarding:** pick a layered pixel avatar, pick one of six eggs, paste your notes **or upload lecture PDFs / PowerPoints** (parsed server-side; verified on a real 67-page PDF). Gemma 4 plans a curriculum of one-concept sub-lessons from *your* material — never generic internet content.
- **Tutor loop:** Gemma teaches one sub-lesson in full depth (plain-English glosses after every symbol, exact worked examples — no cute analogies), then checks understanding with 2 MCQs + 1 free-text answer that Gemma grades honestly but kindly.
- **The pet:** hatches from its egg after 3 correct answers, grows to an adult at 12. Every mood is visually distinct — a thriving pet bounces; a neglected one is dimmed, desaturated, curled up asleep with drifting z's. Scale is reserved for growth alone: a pet that swells when things get worse would read as a reward.
- **Rescue:** a "Can't start?" button generates a 2-minute micro-task that is impossible to fail — the smallest possible re-entry into studying.
- **Socratic partner:** a multi-turn chat with three modes (Socratic questioning, explain-with-a-real-example, active-recall drill), grounded in the active course's notes. A quick-chip lets you talk to the pet itself, which answers in character, in its shame-free voice, from its live state.
- **Drills:** for the days you won't sit through a lesson but will answer questions. Pick a topic, or take the **big review** — a set spanning every sub-lesson, deliberately including questions that force you to connect two of them. Distractors are instructed to be the mistakes real students make, not obviously wrong options.
- **Sprint mode:** a focus timer the pet sits beside, nudging every five minutes; finishing pays gems and health per minute and counts toward the streak like a lesson.
- **Economy:** correct answers and comebacks earn gems; the Gem Sanctuary spends them only on the pet (heal, growth surge, a permanent "go deeper" tutor unlock) — never on skipping work.
- **Multiple modules** (university-style), a demo clock to fast-forward days, and a 4-week trajectory forecast chart.

## How Gemma 4 is used — specifically

Every generation goes through **one seam** (`server/gemma.ts`) that knows exactly two model strings — nine distinct jobs, one place a model is ever called:

| Provider | Model | Transport |
|---|---|---|
| local (default) | `gemma4:e4b` | Ollama native `/api/chat` |
| hosted (fallback) | `gemma-4-26b-a4b-it` | Gemini API, `@google/genai` |

Switching is one `.env` edit; `auto` prefers local and falls back to hosted. Eight distinct jobs run through that seam — curriculum planning, lesson writing, question writing, free-text grading, pet nudges, rescue tasks, trajectory forecasts, and the multi-turn Socratic chat — each with its own **system-role persona** (Gemma 4 supports the system role natively). The pet's persona hard-codes the psychology: *"NEVER blame, guilt-trip, scold… A learner coming back after a gap is the BEST thing that happens to you."*

Engineering decisions that mattered:

- **Thinking mode only where it pays.** Gemma 4's step-by-step reasoning is enabled for curriculum planning (genuine planning work) and disabled everywhere else. Ollama defaults thinking **on**; until we passed `think: false` explicitly, a 15-second lesson took 171 seconds. That one flag was a 10× latency win, and it required using Ollama's native API — the OpenAI-compat shim can't control thinking and silently drops `top_k`.
- **Structured output without `responseMimeType`.** Hosted Gemma doesn't support JSON mode, so we demand raw JSON in the prompt and repair defensively on the way back: strip fences, fix trailing commas, and close truncated output at the last complete element, with one retry that quotes the malformed output back to the model.
- **Latency engineering for 11 tok/s.** Lesson prose and check questions are split into separate calls so you read while questions generate; the next lesson prefetches while you're on the dashboard; every generation is cached to disk so a rehearsal never re-pays for the same content. Sampling is Google's recommended 1.0 / top_p 0.95 / top_k 64; the hosted path backs off 1s/2s/4s/8s on 429s.
- **Offline-first everywhere.** Every endpoint has a useful non-500 fallback, so the app demos with the network cable out.

## Why local was the right call

We measured hosted Gemma at ~30 tok/s and local `gemma4:e4b` at ~11 tok/s on an M1 MacBook — and still chose local as the default. No rate limits during a day of rehearsal, no key management, students' lecture notes never leave the machine, and it proves the point of Gemma being *open weights*: the entire product — tutoring, grading, personality — runs on a laptop. The hosted path exists behind the same seam for deployment, one `.env` edit away.

## One-day war stories

- The prototype we inherited was secretly calling `gemini-3.6-flash` with `responseMimeType` — both are traps for this competition (Gemma-only rule; no JSON mode). Every model call was rerouted through our seam; `grep -ri "gemini-"` on the source returns nothing.
- The pixel packs' documentation lied: the item list skips blank cells, so egg sprites rendered as milk bottles. We built an in-app sprite inspector (`/dev/sprites`) that renders every sheet cell with its index and read the truth off the screen — the same page later settled which animation row is "asleep" (row 4, a curled eyes-shut pose, measured 0.88–0.97× the standing pose across all six species).
- A "sleeping pet grows" bug turned out to be the opposite: every mood drew the same sprite, so the only animation the pet ever played was the growth pop. Fixed by giving every mood its own liveliness (frame rate, bob, saturation) and reserving scale for growth.

## Why these choices were right

The judges' brief asks for a companion that *nudges at the right moment, adapts, and holds learners accountable* — not one that just answers questions. Our accountability mechanism is the emotional state of a creature you raised, our nudges are generated from its live state at the moment you open the app, and the whole loop is built on published findings about why people actually procrastinate. The model isn't a feature bolted onto a to-do list; the tutoring method (full-depth explanations, exact examples, one concept at a time, honest-but-kind grading) is encoded in the personas, and the psychology is encoded in the one rule the pet can never break.

## Honest status & roadmap

Everything described above works today. Planned next (designed, in the repo's plan): week-by-week topic structure inside modules with mass lecture upload, a standalone quiz-drills mode with whole-module "big review", a Spirit Farm where focus minutes water crops, interactive trajectory sliders, and adopting additional pets. The plan file documents exactly what is built versus designed.
