
# Add Lovable Prompt Instructions to Integration Guide

## Objective
Update the Lovable.dev integration guide to include a specific prompt that users can copy-paste into their other Lovable projects to get the Edge Function URL and API Key credentials.

---

## Current State
The existing guide (lines 155-164) is generic:
```
"Lovable.dev is an AI-powered web app builder"
"Use the Webhook or API integration to connect"
"Set up an Edge Function to receive published content"
```

## Proposed Solution
Add a clear, copy-pasteable prompt that users can send to Lovable in their other projects.

---

## Implementation Details

### File: `src/components/integrations/IntegrationConfigModal.tsx`

**Update the `PLATFORM_GUIDES.lovable` section (lines 155-164):**

```typescript
lovable: {
  title: "How to Connect Another Lovable Project",
  steps: [
    "Open your other Lovable project",
    "Copy and paste this prompt to Lovable:",
    "💬 \"I want to receive published articles from another app via API. Create an Edge Function called 'receive-article' that accepts POST requests with { title, body, type, sourceId } and saves them to a 'published_articles' table. Give me the Edge Function URL and the Supabase Anon Key.\"",
    "Lovable will create the Edge Function and database table",
    "Copy the Edge Function URL (format: https://xxx.supabase.co/functions/v1/receive-article)",
    "Copy the Anon Key from the response",
    "Paste both values in the fields below",
  ],
},
```

---

## Technical Summary

| Component | Change |
|-----------|--------|
| `IntegrationConfigModal.tsx` | Update `PLATFORM_GUIDES.lovable.steps` with detailed prompt instructions |

## Expected Result
Users will see a step-by-step guide with a copy-pasteable prompt to send to their other Lovable projects, making it easy to get the required Edge Function URL and API Key.
