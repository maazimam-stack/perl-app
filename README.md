# Perl

Clerkship debriefs and CI MED school deadlines in one private app: https://maazimam-stack.github.io/perl-app/

This repository holds only the **built site** that GitHub Pages serves. It's the same code every visitor's browser downloads. Source, tests and build scripts live elsewhere.

- Sign-in and storage: Supabase. Each person's data is in their own rows, protected by row-level security.
- Claude features and account deletion: Supabase Edge Functions. Keys never reach the browser.
- Nobody's journal or plan is stored here.

Unofficial student tool. CI MED policies were read Oct 26, 2026; the linked PDFs govern.
