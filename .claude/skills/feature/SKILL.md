---
name: feature
description: "Turn the owner's one-line Voxel City idea into a filled-in feature card (Goal / Where / Look & feel / Done when / Must not change / Size), filling what the code and docs already answer and asking Q# questions only for the gaps. Use when the owner types /feature, or sends a short or vague feature request. Plans only — never builds."
---

# /feature — from one line to a clear plan (S91, D2)

The owner has no coding background and often sends one line. This skill turns it into the card in `docs/ASK_TEMPLATE.md`
so nothing gets built on a guess (CLAUDE.md "Unclear = don't build yet"). **Do not change game code in this skill.**

## Steps

1. **Numbers:** run `npm run numbers` — use the next free Q (and S / version) it prints.
2. **Look first, ask second.** Before asking anything, find what the project already answers:
   - `docs/DECISIONS.md` (Agreed rows are binding), `docs/ROADMAP.md` §E (the idea may already be there with notes), CLAUDE.md
     "Where things live" for the files involved, `src/data/changelog.ts` for what already exists.
   - Rules that always apply: Bevel+ look, cosmetics visual-only, same block size, text ≥ 11 px, phones fit (`npm run layout`).
3. **Fill the card.** For each field write the answer and where it came from: *owner* (said it), *docs* (row number), or
   *Claude's guess* (needs a yes). Fields:

   | Field | Answer | From |
   |---|---|---|
   | Goal | | |
   | Where (screen / mode / files) | | |
   | Look & feel | | |
   | Done when | | |
   | Must not change | | |
   | Size → version | patch V0.x.Y or minor V0.X.0 + header name | |

4. **Risks (Q204)** — for Medium or Big work: what could break (other screens, phones, save files, balance/economy, collisions)
   and which checks will prove it (`npm test`, `collide`, `economy`, `drift-lab`, `layout`, `smoke`, screenshots).
5. **Questions only for the gaps:** Q#-numbered rows, each with 2–3 options in a table and Claude's pick marked. Include a
   quick sketch or screenshot of the options when it's a look question (X3).
6. **Effort + plan:** Small / Medium / Big, and the build steps in 3–6 lines.
7. **Reply** in the owner's format (CLAUDE.md): 3-line summary at the top (what this is · what Claude needs · what's next),
   lettered sections, plain words, prompt feedback, 2–4 ideas with effort.
8. **Save it:** once the owner answers, add the card to `docs/ROADMAP.md` (§E idea row → "planned", with the Q answers) and the
   answers to `docs/DECISIONS.md`. Then build with the normal routine (`voxel-city-release` skill).
