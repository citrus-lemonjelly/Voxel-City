---
name: wrapup
description: "End-of-session wrap-up for Voxel City: update CLAUDE.md 'Where we left off' (short), log decisions and owner answers in docs/DECISIONS.md, move old history to docs/ROADMAP.md, list open Q numbers, commit (push only where allowed). Use when the owner types /wrapup or says wrap up / done for today / end the session, and before a long session ends."
---

# /wrapup — hand the next session a clean picture (S91, D1, Q200)

Goal: the next session (on the PC or in the cloud) can start from CLAUDE.md alone, and no Q / S / version number is reused.

## Steps

1. **Numbers:** `npm run numbers`. Fix any `!` clash it prints (renumber the newer, unshipped one) before writing anything.
2. **Gather this session's facts:** `git log --oneline origin/main..HEAD`, `git status --short`, and the conversation:
   versions built / shipped, owner answers (Q# → choice), new rules, ideas the owner liked, questions still open.
3. **`docs/DECISIONS.md`:**
   - Owner answers and new rules → rows in the right table (status **Agreed** when the owner chose it).
   - Implementation choices worth remembering → the next S rows (`| S## | Topic (V0.x.y, owner Q###) | what + why |`).
   - One dated line at the top of `## Change log`: what was built / shipped, which S rows, which Q answers.
4. **`docs/ROADMAP.md`:** mark done items, add new ideas to §E with effort, new open questions to §B2 (Q · options · Claude's pick).
5. **CLAUDE.md "Where we left off" — keep it 5–10 lines (Q201):**
   - Line 1: `Live: V… "…"` and what's built but not shipped (and on which branch, for cloud work).
   - Open questions: `Q### (topic)` list.
   - **Next:** 1–3 items.
   - Idea backlog line (ideas the owner liked but hasn't started).
   - Anything older moves to `docs/ROADMAP.md` `## §G History` (newest first), not deleted.
   - Update the date in the heading. Update "Where things live" if new files or tools were added.
6. **Skills / tools:** if a step this session was slow or repeated, note the fix as an idea (or fix it if Small and agreed).
7. **Save the work:**
   - Cloud session: commit and push to this session's `claude/…` branch (never `main`).
   - Owner's PC: commit; push only if the owner says so (pushing `main` publishes the website).
8. **Reply** (owner's format): 3-line summary, then a table — Built · Shipped / live · Branch / not pushed · Open Q's · Next —
   plus prompt feedback and 2–4 ideas with effort.
