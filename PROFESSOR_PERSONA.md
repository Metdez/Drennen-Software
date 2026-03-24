# Buyer Persona — The Professor

## Profile at a Glance

| | |
|---|---|
| **Name** | Prof. Drennen (or similar) |
| **Course** | MGMT 305 — likely a business/management course at a university |
| **Role** | Professor + course moderator for live guest speaker sessions |
| **Tech comfort** | Medium — uses Canvas LMS, comfortable with file uploads and Google auth, but is not setting up the tool himself (admin creates his account) |
| **Frequency of use** | Occasional — tied to the semester schedule of guest speakers, likely 3–8 times per academic year |

---

## The Situation

Before each guest speaker session, the professor assigns students to submit questions in advance via Canvas. Students submit individual PDF or DOCX files. The professor then has to:

1. Download a ZIP of all submissions from Canvas
2. Read through every student's question(s) — potentially 20–50+ files
3. Identify the best questions across the class
4. Organize them into coherent interview themes
5. Prepare a single moderator sheet to run the live session professionally

**This is the pain the app solves.** Steps 2–5 are manual, time-consuming, and cognitively taxing — especially when done under time pressure before a speaker arrives.

---

## Goals

- **Run a tight, impressive guest session.** The professor wants the interview to feel polished and professional — not like he's winging it or reading from a messy stack of papers.
- **Honor student participation.** Attribution matters. Students submitted questions; the professor wants the best ones surfaced and credited.
- **Save prep time.** Reading and synthesizing 30+ individual files is an hour of work. The tool reduces it to a 60-second upload.
- **Have a backup plan for every question.** The 10-section format with primary + backup questions gives him flexibility if a topic runs long or short.
- **Keep a record.** The history page and immutable sessions mean he can look back at past sessions — what speakers came, how many students participated.

---

## Frustrations (Before This Tool)

- **Volume overwhelm.** A class of 30 students generates 30 files. Some ask the same thing; some are gold; most are good-but-generic. Manually triaging is exhausting.
- **No structure.** Raw student questions don't arrive organized by theme — someone has to do that cognitive work.
- **Time pressure.** Speakers are scheduled. There's no "I'll get to it later" — the prep has to happen on a deadline.
- **Format chaos.** Some students submit PDFs, others Word docs. File naming is inconsistent. Opening them one by one is friction.
- **Generic questions waste speaker time.** "What advice do you have for students?" is a dead end in a live interview. He wants tension, specificity, insight — and the AI's ranking rubric reflects exactly this.

---

## Behaviors & Habits

- **Uses Canvas LMS** as his primary course management tool — that's where students submit files and where he downloads the ZIP
- **Prefers downloading a PDF or DOCX** of the final output so he can print it or have it open on a second screen during the session
- **Values attribution** — the `*(StudentName)*` format keeps students engaged ("will the professor use my question?") and holds them accountable for quality
- **Doesn't iterate on the output** — the app is designed for a single generation; sessions are immutable. He runs it once and works from what comes back.
- **Likely runs the tool 1–2 days before** the speaker visit, not the morning-of

---

## What He Expects From the Tool

| Expectation | How the app delivers |
|---|---|
| Fast — no waiting around | 60s Vercel timeout; progress bar manages the wait psychologically |
| Output is immediately usable | 10-section structure is moderator-ready, no editing required |
| Best questions float to the top | AI ranks by quality tier (tension > experience > insight > advice) |
| Student names are preserved | Attribution parsed from filenames, displayed inline |
| Easy to save and use offline | PDF and DOCX export, named `{SpeakerName}_Questions.{ext}` |
| Works reliably — not a toy | Private app, no shared accounts, no self-signup, designed for one user |

---

## Relationship to Technology

- **Not a builder.** He didn't set this up — someone built it for him. His account was created by an admin.
- **Not a tinkerer.** He won't poke at settings or explore edge cases. He uploads a file, gets a result, downloads it. That's the entire interaction.
- **Trusts the system.** The locked-down design (no self-signup, no delete, no edit) actually suits him — there's nothing to misconfigure.
- **Email or Google login.** The dual auth option exists because some professors prefer institutional Google accounts; others prefer a separate email/password.

---

## The Moment That Matters

The professor opens his laptop the evening before a speaker session. He downloads the Canvas submission ZIP, opens the tool, types the speaker's name, drops the file, and waits 30–45 seconds. He clicks "Download PDF," prints or saves it, and walks into class the next morning with a clean 10-question moderator sheet. That's the job.

---

## Design Implications

- **Minimal UI surface.** He uses 3 screens: login, dashboard (upload), preview (download). History is a bonus. Nothing else is needed.
- **Feedback during wait is critical.** The `ProcessingView` animated progress bar isn't decoration — a 30–60 second silent wait would feel broken to a non-technical user.
- **Output must look authoritative.** The serif headings, structured layout, and dark professional aesthetic signal that this is a serious tool producing a serious document — not a toy chatbot.
- **Errors should be clear, not technical.** If a file fails to parse or the AI errors out, the message needs to explain what happened in plain language, not stack traces.
- **The download is the deliverable.** Everything else is pipeline. The PDF/DOCX is what he takes out of the system and into the real world.
