# What Changed and Why It's Better

**Date:** February 22, 2026
**Audience:** Non-technical stakeholders, project managers

---

## The Short Version

We cleaned up the codebase that powers the internal ops dashboard. Nothing visible to users changed. The app works exactly the same way it did before. What changed is the code underneath — how it's organized, how much of it there is, and how easy it is to work on going forward.

Think of it like reorganizing a storage room. The room serves the same purpose. You can still find everything you need. But now things are labelled, duplicates have been thrown out, and there's a clear system for where new things go.

---

## What Was Wrong

Over time, the codebase accumulated three kinds of problems:

**1. Code that did nothing.**
About 16% of the files in the project were for a database system (called D1) that was set up but never actually turned on. The app always used a different database (Airtable). These dead files sat around doing nothing except confusing anyone who opened the project.

**2. Copy-pasted code.**
The same logic was duplicated across the codebase instead of written once and shared. For example, the code that fetches the product list from the database was copy-pasted 6 times. The code that handles paginating through database results was duplicated 11 times. This is a maintenance problem: if you find a bug in one copy, you have to find and fix all the other copies too.

**3. A confusing filing system.**
Files were organized under a folder called "domains" that mixed different types of code together. There was no obvious rule for where a new file should go, which meant different developers made different choices, and nothing was where you'd expect.

---

## What Was Fixed

**Dead code was deleted.** Roughly 29 files were removed entirely. The largest file in the project shrank from 756 lines to 180 lines — that's 76% smaller — because three-quarters of it was code for the database system that was never used.

**Duplication was eliminated.** The product-fetching code is now written once. The pagination code is now written once. If either needs to change in the future, one developer changes one file instead of hunting for copies.

**Files now have a clear home.** The project follows a simple three-layer system:
- "Pages" — one file per screen, pure routing and layout
- "Components" — visual building blocks (buttons, tables, panels)
- "Features" — the business logic for each area (campaigns, videos, scripts, etc.)

Every new file has an obvious place to go. Every existing file is where you'd expect it.

**Naming was standardized.** The reusable logic units (called "hooks" by developers) used to have 5 different naming styles. Now they have 3, each with a clear meaning. This makes it faster to understand what a piece of code does just by reading its name.

---

## What This Means Going Forward

**Faster development.** Developers spend less time figuring out where things are and more time building new features.

**Fewer bugs from duplication.** When logic lives in one place, a fix applies everywhere at once.

**Lower onboarding cost.** A new developer joining the project can orient themselves much faster with a clear, documented structure.

**The app itself is unchanged.** Every feature that existed before still works exactly the same way. The cleanup was purely internal.

---

## What Still Needs Attention

A few things were noted but left for future work:

- One screen (Campaign View) is still very large and will benefit from further cleanup in a future sprint.
- The app's initial load size is on the larger side — an optimization pass could make it load faster for users on slower connections.
- There are no automated tests yet — this is the most significant long-term investment needed.

None of these are emergencies. The overall risk level of the project is **low**.
