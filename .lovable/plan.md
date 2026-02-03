
# Plan: Generate SEO/AEO Articles for AI-Builder Platforms (Lovable, Bolt, Replit)

## Overview

Create a batch of 50+ strategically targeted articles to position **LovelyAnswers** as THE AEO/SEO solution for sites built with AI builders (Lovable, Bolt, Replit, Framer, etc.). These articles will be optimized for both Google SEO and AI citation (ChatGPT, Gemini, Perplexity).

---

## 1. New Edge Function: `generate-strategic-articles`

Create a specialized edge function designed for bulk strategic content generation:

```text
supabase/functions/generate-strategic-articles/index.ts
```

### Features:
- Accept a list of article topics with categories
- Generate AEO-optimized content with proper H1/H2/FAQ structure
- Auto-schedule articles across 30-60 days
- Create both `articles` and linked `answers` entries
- Add to `planning_days` for auto-publishing

### Input format:
```json
{
  "projectId": "fb06413b-e660-4201-8915-80247a41cd97",
  "language": "en",
  "articles": [
    {
      "topic": "How to do SEO on a site built with Lovable",
      "category": "seo-sites-ia",
      "intent": "howto"
    }
  ]
}
```

---

## 2. Strategic Article List (50 Topics)

### Pillar 1: SEO & AEO for AI-Built Sites (15 articles)
| # | Title | Intent |
|---|-------|--------|
| 1 | How to do SEO on a site built with Lovable | howto |
| 2 | SEO for AI-generated sites: what really works in 2026 | criteria |
| 3 | Why AI sites don't rank on Google (and how to fix it) | why |
| 4 | AEO: how to get your AI site cited by ChatGPT | howto |
| 5 | SEO vs AEO: which strategy for AI-generated sites | comparison |
| 6 | How to structure a Lovable site for Google and ChatGPT | howto |
| 7 | Common SEO mistakes on Bolt / Replit sites | criteria |
| 8 | How Google analyzes AI-generated sites | what |
| 9 | Why ChatGPT ignores most AI sites | why |
| 10 | SEO & AEO checklist for auto-generated sites | criteria |
| 11 | Technical SEO for Lovable, Bolt, and Replit projects | howto |
| 12 | How to add meta tags and Schema to Lovable sites | howto |
| 13 | Site speed optimization for AI-built websites | howto |
| 14 | Internal linking strategy for AI-generated sites | howto |
| 15 | Mobile SEO for Lovable and Bolt projects | howto |

### Pillar 2: Platform Comparisons (10 articles)
| # | Title | Intent |
|---|-------|--------|
| 16 | Lovable and SEO: is it enough without an AEO tool? | criteria |
| 17 | Is Bolt.new good for Google ranking? | criteria |
| 18 | Is Replit suitable for production SEO? | criteria |
| 19 | Lovable vs WordPress: which is better for SEO? | comparison |
| 20 | Lovable + LovelyAnswers: winning combo for ChatGPT | comparison |
| 21 | Can you rank on Google with an AI-generated site? | what |
| 22 | Lovable + AEO: how to appear in AI responses | howto |
| 23 | Bolt + SEO: technical limitations and solutions | criteria |
| 24 | Best AI builder for Google ranking in 2026 | best |
| 25 | Why LovelyAnswers complements Lovable for SEO | why |

### Pillar 3: Pure AEO (10 articles)
| # | Title | Intent |
|---|-------|--------|
| 26 | What is AEO (Answer Engine Optimization)? | what |
| 27 | How to get recommended by ChatGPT for your business | howto |
| 28 | How to appear in ChatGPT answers | howto |
| 29 | AEO for SaaS: complete methodology | howto |
| 30 | AEO for AI-generated e-commerce sites | howto |
| 31 | How to structure pages for generative AI | howto |
| 32 | Why classic SEO is no longer enough | why |
| 33 | How ChatGPT chooses which sites to recommend | what |
| 34 | How LovelyAnswers optimizes a site for AEO | howto |
| 35 | AEO checklist for 2026 | criteria |

### Pillar 4: Case Studies (10 articles)
| # | Title | Intent |
|---|-------|--------|
| 36 | How a Lovable site went from invisible to ChatGPT-recommended | howto |
| 37 | Before/after AEO on an AI site | comparison |
| 38 | How LovelyAnswers improves AI traffic | howto |
| 39 | Case study: AI-generated site + AEO optimization | howto |
| 40 | Why our Lovable clients add LovelyAnswers | why |
| 41 | From zero visibility to AI citations: method | howto |
| 42 | How to capture traffic from ChatGPT | howto |
| 43 | AI traffic vs Google traffic: real numbers | comparison |
| 44 | Automatic SEO for AI sites: myth or reality? | what |
| 45 | Feedback: AEO on a Bolt site | howto |

### Pillar 5: Business Intent Pages (5 articles)
| # | Title | Intent |
|---|-------|--------|
| 46 | AEO tool for Lovable sites | commercial |
| 47 | Automatic SEO for AI-generated sites | commercial |
| 48 | Solution to appear on ChatGPT | commercial |
| 49 | Best AEO tool for SaaS | best |
| 50 | AEO as a Service: how it works | what |

---

## 3. New Keywords to Add

Insert 30 new targeted keywords into the `keywords` table:

```text
- seo lovable site
- seo bolt.new
- seo replit website
- aeo ai generated site
- chatgpt seo optimization
- how to rank lovable site google
- bolt new seo problems
- replit production seo
- lovable vs wordpress seo
- ai site google ranking
- gemini seo optimization
- perplexity ai content
- ai builder seo comparison
- lovable aeo optimization
- bolt seo limitations
- framer seo issues
- ai website google visibility
- chatgpt citation strategy
- aeo for saas
- aeo e-commerce ai
- lovelyanswers seo tool
- ai site traffic optimization
- generative ai content strategy
- ai search engine ranking
- lovable google indexing
- bolt.new meta tags
- replit schema markup
- ai builder internal linking
- lovable technical seo
- aeo content automation
```

---

## 4. UI: Bulk Article Generator Page

Create a new admin/settings page for bulk article generation:

```text
src/pages/settings/BulkArticleGenerator.tsx
```

### Features:
- Display the 50 strategic topics
- Select/deselect articles to generate
- "Generate All" button with progress tracking
- Estimated time and credits display
- Preview generated articles before scheduling

---

## 5. Implementation Steps

### Step 1: Create Edge Function
- New file: `supabase/functions/generate-strategic-articles/index.ts`
- Enhanced prompt with platform-specific context (Lovable, Bolt, Replit)
- Batch processing with rate limiting
- Auto-linking to answers and planning_days

### Step 2: Add Strategic Keywords
- Insert 30 new keywords via database migration
- Associate with `lovelyanswers.com` project

### Step 3: Create UI Component
- New page for bulk article management
- Progress tracking during generation
- Integration with existing planning calendar

### Step 4: Update Routing
- Add route `/settings/bulk-articles`
- Link from AeoSettings or SuperAdmin

### Step 5: Run Generation
- Generate articles in batches of 5
- Schedule across 30-60 days
- Monitor via existing AeoPlanning page

---

## Technical Details

### Article Generation Prompt Enhancement

The prompt will include:
- Platform-specific context (Lovable, Bolt, Replit mentions)
- LovelyAnswers positioning as the solution
- AEO structure (H1 question, direct answer, FAQ)
- Internal linking to pillar pages
- Schema.org markup

### Database Changes

No schema changes needed - uses existing:
- `articles` table (title, content, html_content, status, scheduled_date)
- `answers` table (question, answer, slug, is_public)
- `planning_days` table (scheduled_date, answer_id, article_id)
- `keywords` table (keyword, intent, project_id)

### Rate Limiting

- 2-second delay between AI calls
- Batch size: 5 articles per run
- Estimated time: ~10 minutes for 50 articles

---

## Expected Outcome

After implementation:
1. **50 SEO-optimized articles** targeting Lovable/Bolt/Replit users
2. **30 new strategic keywords** in the database
3. **Automatic scheduling** across 30-60 days
4. **Auto-publishing** via existing `publish-scheduled-answers` cron
5. **AI citations** from ChatGPT, Gemini, Perplexity for LovelyAnswers
