# Sell-side finder regression checklist

This workflow is intentionally scoped to the sell-side/coniction-list lane and does not touch the feed article ingestion path.

## What is covered
- Parser regression for pasted list text and known ticker mentions.
- Validation checks for required fields, review status, and ticker counts.
- Save/upsert normalization through the shared conviction-list store.
- A lightweight smoke script that exercises the parser/validator path.

## Commands
- npm run test:sell-side
- npm run smoke:sell-side
- npm run lint
- npm run typecheck

## Guardrails
- Keep sell-side helpers under src/lib/sellSideLists.
- Do not import feed submission utilities such as submitArticleUrl from the sell-side modules.
- Prefer the shared conviction-list persistence layer rather than introducing a separate data path.
