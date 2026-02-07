

## Problem

The "Create My Account & Fix My Site" buttons on the `/audit` results page navigate to `/onboarding`, which sends users back through the full onboarding funnel instead of leading them to account creation. Since these users have **already completed the free audit**, they should go directly to sign up.

## Solution

Change the `handleGetStarted` function in `src/pages/Audit.tsx` to:

1. **Save the audit URL as onboarding data** in `localStorage` so the Auth page can pick it up after signup and auto-create a project from it.
2. **Navigate to `/auth?mode=signup`** instead of `/onboarding`, so users land directly on the signup form.

This way:
- Users skip the redundant onboarding steps (they already provided their URL via the audit).
- After signing up, the existing logic in `Auth.tsx` will detect the saved onboarding data, create the project, and redirect to checkout/dashboard.

## Technical Details

### File: `src/pages/Audit.tsx`

**Change the `handleGetStarted` function** (line 246-248):

From:
```ts
const handleGetStarted = () => {
  navigate(`/onboarding?url=${encodeURIComponent(websiteUrl || urlFromParams)}`);
};
```

To:
```ts
const handleGetStarted = () => {
  const url = websiteUrl || urlFromParams;
  // Save minimal onboarding data so Auth page can auto-create the project
  const onboardingData = {
    websiteUrl: url.startsWith('http') ? url : `https://${url}`,
    language: 'en',
    businessDescription: '',
    targetAudiences: [],
    keywords: [],
  };
  localStorage.setItem('onboarding_data', JSON.stringify(onboardingData));
  localStorage.setItem('onboarding_email', '');
  // Go directly to signup instead of onboarding
  navigate('/auth?mode=signup');
};
```

This leverages the existing `Auth.tsx` logic (lines 168-265) which already checks for `onboarding_data` in localStorage and auto-creates a project when a new user signs up.

No other files need to change -- the Auth page already handles the `mode=signup` query param (line 28) and the project creation from localStorage data.

