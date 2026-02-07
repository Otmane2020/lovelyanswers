

# Plan: Fix Google Search Console Indexing Pipeline

## Current Situation

- 178 articles published, **0 successfully indexed** by Google
- 50 articles failed with "Google did not accept indexation request"
- 128 articles never even attempted (bug: only articles from last 24h are checked)
- The dynamic sitemap only lists Q&A answers, **not the 164 blog articles** from `published_articles`
- Valid Google OAuth tokens exist for the connected account (`oben.rockman@gmail.com`)

## Problems Identified

1. **24-hour window bug**: The cron job only processes articles created in the last 24 hours, so older articles are permanently skipped
2. **Sitemap gap**: The sitemap Edge Function doesn't include `published_articles`, making articles invisible to Google's crawler
3. **No retry mechanism**: Failed articles (50) are permanently stuck with no way to retry
4. **No bulk indexing trigger**: No way to manually trigger indexing for all unindexed articles
5. **URL construction**: The function builds URLs from `articles.slug` but the actual blog serves from `published_articles.slug` (which has hash suffixes)

## Plan

### Step 1 -- Fix the Sitemap Edge Function

Update the `sitemap` Edge Function to also query `published_articles` and include all blog articles in the XML sitemap. This ensures Google can discover them organically.

- Query `published_articles` table
- Add each article as `https://lovelyanswers.com/blog/{slug}`
- This alone will help Google discover all 164 articles over time

### Step 2 -- Rewrite `index-published-articles` Edge Function

Fix the cron job with the following changes:

- **Remove the 24-hour filter** -- process ALL articles with `gsc_indexed IS NULL` or `gsc_indexed = false`
- **Use `published_articles` table** as the URL source (since that's what the blog actually serves)
- **Limit batch size** to 50 per run (Google quota is 200/day)
- **Add retry logic** with exponential backoff (like `gsc-test-indexation` already has)
- **Reset failed articles** so they can be retried (change `gsc_indexed = false` back to `NULL` after a cooldown period)
- **Build correct URLs** from `published_articles.slug` instead of `articles.slug`

### Step 3 -- Add Manual "Index All" Capability

Create a new Edge Function `bulk-index-articles` that:

- Accepts a POST request with a user ID
- Fetches all unindexed published articles for that user's project
- Submits them to the Google Indexing API in batches (with 500ms delay between requests)
- Can be triggered manually from the dashboard or via API call
- Respects the 200/day Google quota limit

### Step 4 -- Reset Failed Articles

Run a data update to reset the 50 failed articles (`gsc_indexed = false`) back to `NULL` so the improved cron job can retry them.

### Step 5 -- Update the Blog/AeoPublicAnswer Page

Ensure the `/blog/:slug` route can also serve articles from `published_articles` table (not just `answers`), so the indexed URLs actually return valid content.

---

## Technical Details

### Sitemap Changes (`supabase/functions/sitemap/index.ts`)

- Add a second query to `published_articles` table
- Merge both answer URLs and article URLs into the sitemap XML
- Deduplicate by slug if needed

### `index-published-articles` Rewrite

```text
Flow:
1. Query published_articles WHERE NOT EXISTS in articles with gsc_indexed = true
2. For each article, build URL: https://lovelyanswers.com/blog/{slug}
3. Get user tokens from profiles (hardcoded user for now since single project)
4. Refresh token if expired
5. Call Google Indexing API with retry
6. Track results in articles table (match by source_id)
7. Rate limit: 500ms between requests, max 50 per run
```

### `bulk-index-articles` New Function

- Accepts `{ userId }` in POST body
- Service role key for DB access
- Processes up to 200 articles per call (daily quota)
- Returns detailed results: `{ indexed, failed, skipped, errors[] }`

### Config Update (`supabase/config.toml`)

- Add `[functions.bulk-index-articles]` with `verify_jwt = false`

### Data Reset Query

```sql
UPDATE articles 
SET gsc_indexed = NULL, gsc_index_error = NULL 
WHERE project_id = 'fb06413b-e660-4201-8915-80247a41cd97' 
AND gsc_indexed = false
```

