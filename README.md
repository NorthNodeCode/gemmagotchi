# Gemmagotchi

A Gemma 4 study companion that fights procrastination; by giving you something
that is *glad to see you*.

You adopt an animal and raise it from an egg. Your course notes become a study plan.
Gemma 4 teaches you one sub-lesson at a time and grades your answers. The pet
grows when you learn and drops when you disappear but it **never** shames
you, because shame is what causes procrastination in the first place.

## Run it in 3 minutes

```bash
ollama pull gemma4:e4b     # ~4B effective params, runs on a laptop
npm install
npm run dev                # http://localhost:3000
```

No API key needed. Every word is generated on-device.

## Switching to the hosted Gemma API is one .env edit

The app never calls a model directly. All generation goes through one seam —
[`server/gemma.ts`](server/gemma.ts) — which knows two models and nothing else:

| Provider | Model string | Transport |
| --- | --- | --- |
| `local` | `gemma4:e4b` | Ollama native `/api/chat` |
| `hosted` | `gemma-4-26b-a4b-it` | Gemini API (`@google/genai`) |

To move inference off the laptop, copy `.env.example` to `.env` and set:

```
GEMMA_PROVIDER=hosted
GEMINI_API_KEY=your-key
```

Nothing else in the codebase changes. `GEMMA_PROVIDER=auto` (the default)
prefers local and falls back to hosted automatically if Ollama isn't running.

## The coach — a second Gemma

Every answered question is logged (topic, correctness, time-to-answer). A coach persona running on **`gemma-4-31b-it`** (hosted, with local fallback) reads client-computed aggregates and reports back — weak topics become one-click drills, and a visible, editable profile (depth · pace · challenge) genuinely changes how lessons, questions and plans are generated. Onboarding calibrates your speed; every new course starts with a skippable three-question diagnostic that shapes the plan.

## How Gemma 4 is used

Eight distinct jobs, all through the same seam, each with its own system-role
persona in [`server/prompts.ts`](server/prompts.ts):

| Endpoint | Job |
| --- | --- |
| `/api/ai/curriculum` | Turns raw notes into an ordered study plan (thinking mode on) |
| `/api/ai/lesson` | Teaches one sub-lesson, plain English, concrete examples |
| `/api/ai/checks` | Writes retrieval questions for that lesson |
| `/api/ai/grade` | Marks free-text answers honestly but kindly |
| `/api/ai/nudge` | Speaks as the pet, in character, given live pet state |
| `/api/ai/rescue` | A 2-minute task you cannot fail, for when you can't start |
| `/api/ai/trajectory` | Writes the interpretation over a locally computed forecast |
| `/api/ai/drill` | Retrieval practice sets — per topic or whole-course big review |
| `/api/ai/socratic-chat` | Multi-turn Socratic partner (3 modes, pet chip) |
| `/api/ai/coach` | The learner-model coach, on `gemma-4-31b-it` when a key exists |

Engineering notes: Gemma has no `responseMimeType`, so JSON is demanded in the
prompt and repaired defensively on the way back (fences stripped, truncated
output closed at the last complete element). Sampling is Google's recommended
temperature 1.0 / top_p 0.95 / top_k 64. Thinking is explicitly **off**
everywhere except curriculum planning — Ollama defaults it on, which cost 171s
per lesson until we found it; explicit `think: false` brought that to 15s.
Responses are cached to disk so a rehearsal never re-burns the same generation.

## Why it never shames you

- Wohl, Pychyl & Bennett (2010) — students who forgave themselves for
  procrastinating on one exam procrastinated *less* on the next.
- Sirois & Pychyl (2013) — procrastination is short-term mood repair. Making
  someone feel worse makes them avoid the task harder.

So: the pet's health floors above zero (it can never die), the streak survives
a grace day, and coming back after an absence is met with celebration and bonus
gems that scale with how long you were gone.

## Credits

Pixel art by **shubibubi**.
Developed during the GDG Gemma 4 Hackathon Sprint (won first place) by:
Abdurrehman Sajid  
Favour Odeyale  
Arik Subedi
