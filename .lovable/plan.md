

## Auto-trigger AI Generation on Dialog Open

Currently, when the user opens the "Créer Campagne PMax" dialog, they see a placeholder screen with a "Générer avec l'IA" button that must be clicked manually. This change makes the AI generation start automatically when the dialog opens.

### Change

**File: `src/components/admin/ads/CreatePmaxCampaignDialog.tsx`**

- Add a `useEffect` that watches the `open` state. When the dialog opens and `aiGenerated` is `false` and `isGenerating` is `false`, automatically call `handleAIGenerate()`.
- Remove the static placeholder screen (the `!aiGenerated && !isGenerating` block with the Brain icon and manual button) since generation now starts automatically -- the user will see the loading spinner immediately.

### Technical Detail

```text
useEffect(() => {
  if (open && !aiGenerated && !isGenerating) {
    handleAIGenerate();
  }
}, [open]);
```

The existing loading state (`isGenerating`) and the generated form (`aiGenerated`) already handle the rest of the UX correctly.

### File Modified

1. `src/components/admin/ads/CreatePmaxCampaignDialog.tsx` -- Add auto-trigger useEffect, remove manual button placeholder

