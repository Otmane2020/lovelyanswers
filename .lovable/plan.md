

# Fix Google Search Console FAQPage Errors

## Problem
Google Search Console reports 2 invalid FAQPage structured data issues:
1. **"Element sans nom"** -- FAQPage JSON-LD is missing the required `name` property
2. **"Champ FAQPage en double"** -- Multiple pages have overlapping/duplicate FAQ questions (e.g., "Can I really cancel anytime?" appears in both Index and Pricing)

## Solution

### 1. Add `name` property to all FAQPage schemas (fixes "unnamed element")

Google requires a `name` field on FAQPage. We need to add it to all 3 files:

- **Index.tsx** (line ~274): Add `"name": "LovelyAnswers FAQ"`
- **AiSeo.tsx** (line ~173): Add `"name": "AI SEO FAQ"`  
- **AeoPublicAnswer.tsx** (line ~191): Add `"name": "Answer FAQ"`

### 2. Remove duplicate FAQPage from Index.tsx (fixes "duplicate" error)

The homepage (Index.tsx) and AiSeo.tsx have overlapping FAQ questions. Since the homepage already has Organization + SoftwareApplication schemas, we will **remove the FAQPage schema from Index.tsx entirely** and keep unique FAQs only on their dedicated pages:

- **Index.tsx**: Remove the FAQPage JSON-LD block (lines 270-281). The FAQ section stays visible on the page, just without the structured data markup.
- **AiSeo.tsx**: Keep its FAQPage schema with `name` added -- it has unique AI SEO questions.
- **AeoPublicAnswer.tsx**: Keep with `name` added -- it's per-answer, no duplication risk.

### 3. Deduplicate Pricing.tsx FAQ questions

The Pricing page doesn't have a FAQPage schema (only Product schema), so it's fine. But its visible FAQ questions overlap with Index.tsx -- this is acceptable since there's no structured data duplication.

## Files to modify
- `src/pages/Index.tsx` -- Remove FAQPage JSON-LD block
- `src/pages/AiSeo.tsx` -- Add `name` to FAQPage schema
- `src/pages/AeoPublicAnswer.tsx` -- Add `name` to FAQPage schema

## Technical Details

```text
Before (Index.tsx):
  Organization schema
  SoftwareApplication schema
  FAQPage schema  <-- REMOVE THIS

After (Index.tsx):
  Organization schema
  SoftwareApplication schema
  (no FAQPage)
```

```text
Before (AiSeo.tsx):
  { "@type": "FAQPage", mainEntity: [...] }

After (AiSeo.tsx):
  { "@type": "FAQPage", "name": "AI SEO FAQ", mainEntity: [...] }
```

