# Gemmagotchi — 3-minute demo script (DRAFT)

> Judge criteria to hit out loud: **Gemma integration** (name the model, point at the header badge),
> **innovation** (say the research), **working prototype** (everything live, nothing mocked),
> **presentation** (one clean story: shame → no-shame loop).

## Pre-demo checklist (5 min before)

- [ ] Ollama running, model warm: `ollama ps` shows `gemma4:e4b` (if cold, send any prompt once).
- [ ] Dev server up: `npm run dev` → `tail /tmp/gg-dev.log` says `provider: local (gemma4:e4b)`.
- [ ] **Wi-Fi OFF if you're brave** — it all works offline and that's a killer line.
- [ ] Fresh state for onboarding: DevTools → Application → Local Storage → clear `gemmagotchi_*` keys.
- [ ] Have one lecture PDF/PPTX on the desktop ready to upload.
- [ ] Demo clock reset (no `demo clock +Nd` badge in the header).
- [ ] Backup: if the venue machine dies, the repo README gets anyone running in 3 minutes.

## The script

### 0:00 — Cold open (say this before touching anything)
> "Procrastination isn't a time-management problem — it's mood repair. You avoid the task because it feels bad, and **shame makes it worse**. That's published research: students who forgave themselves procrastinated *less* on the next exam. So we built a study companion that is physically incapable of guilt-tripping you."

### 0:15 — Onboarding (~40s)
- Pick an avatar → pick the **bunny egg**, name it (e.g. "Nibbles").
- On the notes step: **upload the lecture PDF** — point at the char count as it lands in the notes.
> "Everything it teaches comes from *your* lecture material — we parse PDFs and PowerPoints server-side. And this is **Gemma 4 — `gemma4:e4b` — running on this laptop through Ollama**. No API, no internet, no rate limits."
- Hit **Build my study plan**. While it plans (~45s, thinking mode):
- After the user uploads their file, they'll answer a few quick Psychometric Questions. These take less than a minute and help us understand your current level with the material, so the notes and questions we generate actually match where you're at. Beginners get simplified explanations and foundational questions, intermediates get moderate depth with some challenge, and experts get advanced notes and in-depth questions.
> "This is the one place we turn Gemma's thinking mode ON — curriculum planning is genuine reasoning. Everywhere else it's off; that decision alone took a lesson from 171 seconds to 15."
- *(Filler while waiting, if needed):* open the header — point at **GEMMA4:E4B · ON-DEVICE**.

  ### The pamodoro technique
The Pomodoro Technique is a popular time-management method that breaks work into focused 25-minute intervals separated by short breaks, created by Francesco Cirillo in the late 1980s.  

### 0:55 — The lesson (~45s)
- Today screen: point at the egg wobbling, the warm nudge line ("this text is generated fresh from the pet's live state").
- **Start this sub-lesson.** Scroll the lesson:
> "Full-depth teaching, plain-English translation after every symbol, exact worked examples — no cutesy analogies. That style is a hand-tuned system prompt; Gemma 4 honours the system role natively."
- Answer the 2 MCQs fast; type a one-line answer for the free-text check:
> "Free text is **graded by Gemma** — honest about wrong answers, never unkind. Watch the egg — every correct answer feeds it."
- **The egg hatches on the 3rd correct answer** → confetti. Let it land.

### 1:40 — The core loop: decay without shame (~40s)
- Header → **+1 day** twice. Pet dims, droops; at 4+ days it's curled up asleep with z's.
> "Skip days and there are real consequences — your companion visibly wilts. But it **can never die**, your streak survives one off-day, and look what it says when you return—"
- Point at the fresh nudge: warm welcome, zero guilt.
- Click **Can't start?** → the 2-minute rescue:
> "For the days you can't face a lesson: a micro-task that's impossible to fail. Completing it pays a **comeback bonus that scales with how long you were away** — the app is warmest exactly when other apps punish you."
- Complete it → confetti + gems.

### 2:20 — Breadth in 30 seconds
- **Ask Gemma** (header) → Socratic partner: click "⚡ Test my recall", show the answer, then the "🐾 Ask Nibbles" chip — the pet answers in character.
> "Multi-turn, grounded in your notes, three modes — and yes, you can talk to the pet."
- Gem pill → **Gem Sanctuary**: buy the Spirit Elixir (pet perks up instantly).
> "Gems only ever buy help *for the pet* — never a way to skip studying."
- **Focus sprint** button: show the timer + pet watching. *(Don't run it — just show.)*
- **Trajectory** tab: the 4-week consistent-vs-drifting forecast.

### 2:50 — Close (say it over whatever screen is up)
> "Eight Gemma 4 jobs — planning, teaching, question-writing, grading, nudging, rescuing, forecasting, Socratic chat — through one seam. Local `gemma4:e4b` today; the hosted `gemma-4-26b-a4b-it` is one line in a .env file. Every word you saw was generated on this machine. Thank you."

---

## Fallbacks

| If… | Then… |
|---|---|
| Curriculum feels slow live | Pre-onboard a course before judging; demo from the Today screen and narrate onboarding over screenshots. |
| A generation hangs | Every endpoint has an offline fallback — keep going, don't apologise; mention "graceful offline fallback" as a feature. |
| Egg doesn't hatch in 3 answers | You likely missed one — do the rescue task, it also feeds growth. |
| Judges want to poke | Give them the mouse at the Socratic chat — it's the safest free-play surface. |

## Timing notes

- Total talk track ≈ 2:50 leaving 10s slack. The two slow beats are curriculum (~45s, covered by the thinking-mode line) and the lesson generation (~15s, covered by the style line).
- If you're at 2:00 by the hatch, cut the Sanctuary beat, keep Socratic + close.
