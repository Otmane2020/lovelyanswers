

# Remove All Violet/Mauve -- Match Temso's True Color Palette

## Problem
The current site uses `violet-400`, `violet-500`, `violet-600` everywhere (889 occurrences in 34 files). Temso's actual palette has **no purple/violet at all**. It uses:
- Dark navy background: `hsl(222,47%,11%)`
- Pure white text and CTA buttons
- A subtle **blue/white starburst glow** (not violet)
- Light sections: white background, dark text, no colored accents

## Correct Temso Color Palette (from reference images)

| Element | Temso | Current (wrong) |
|---|---|---|
| Hero CTA button | White bg, dark text | `bg-violet-500` |
| Gradient text highlights | None (just white) | `from-violet-500 to-violet-400` |
| Icon backgrounds | `bg-white/10` | `bg-violet-500/10` |
| Active sidebar state | Dark bg, white text | `text-primary` (violet) |
| Hero glow orb | Blue-white `bg-blue-400/15` | `bg-violet-500/20` |
| Feature card accents | Gray/neutral | `text-violet-500` |
| Badges | `bg-white/10 text-white/70` | `bg-primary/10 text-primary` |
| Footer link hover | White | `text-violet-400` |

## Changes Required

### 1. CSS Variables (`src/index.css`)
- Change `--primary` from violet `262 83% 58%` to blue `222 47% 55%` (navy-blue accent)
- Update `--gradient-primary` to use blue tones instead of violet
- Update `--ring` to match new primary

### 2. Index.tsx (Homepage) -- ~40 replacements
- Remove ALL `violet-` classes
- CTA buttons: `bg-white text-[hsl(222,47%,11%)]` on dark sections, `bg-[hsl(222,47%,11%)] text-white` on light sections
- Gradient text highlights: remove colored gradients, use plain white or bold styling
- Hero glow orbs: `bg-blue-400/10` and `bg-blue-500/8` instead of violet
- Feature icon backgrounds: `bg-foreground/5 text-foreground` instead of violet
- Testimonial avatars: `bg-[hsl(222,47%,11%)]` instead of `bg-violet-500`
- Showcase card tops: `bg-[hsl(222,47%,14%)]` solid instead of violet gradients
- Mock chart bars: `from-blue-400/30 to-blue-300/10` instead of violet
- Sticky mobile CTA: white bg, dark text

### 3. AeoSidebar.tsx
- Brand text: remove `text-primary` / violet gradient, use plain `text-foreground`
- Active state: use `bg-foreground/5 text-foreground` instead of `bg-primary/5 text-primary`
- Badges: `bg-foreground/10 text-foreground/70`

### 4. PublicFooter.tsx
- Remove all `text-violet-400`, replace with `text-white/60` or `text-white`
- Hover links: `hover:text-white` instead of `hover:text-violet-400`

### 5. AnimatedLogo.tsx
- Keep logo gradient (pink/violet/blue) as brand identity -- logos are exempt

### 6. Dashboard Pages (~10 files)
Replace all `violet-` classes:
- `AeoDashboard.tsx`: stat icons, action cards, banners
- `AeoAnalytics.tsx`, `AeoArticles.tsx`, `AeoHistory.tsx`, `AeoLocal.tsx`, `AeoReddit.tsx`, `AeoOpportunities.tsx`, `Answers.tsx`: badges, icons, accents
- `AeoPlanning.tsx`: calendar legend colors, badges
- `AeoBilling.tsx`, `AeoSettings.tsx`: any violet accents

### 7. Pricing.tsx
- CTA buttons: white on dark
- Remove any violet accent classes

### 8. Shared Components
- `SoftPaywallBanner.tsx`: use `bg-blue-500/10 border-blue-500/30` or neutral
- `SocialProofToast.tsx`: remove `text-primary` (violet), use neutral
- `ExitIntentPopup.tsx`: neutral accent
- `UrgencyBanner.tsx`: neutral accent
- Nudge components: replace `bg-primary/10 text-primary` with neutral styling

### 9. Tailwind Config
- Update custom violet color palette references if used directly

## Color Mapping Summary

```text
Current                               --> New
bg-violet-500                         --> bg-white text-[hsl(222,47%,11%)]  (CTAs on dark)
bg-violet-500 hover:bg-violet-600     --> bg-[hsl(222,47%,11%)] text-white  (CTAs on light)
text-violet-400, text-violet-500      --> text-white/70 or text-foreground
bg-violet-500/10 text-violet-500      --> bg-foreground/5 text-foreground
bg-violet-500/20                      --> bg-blue-400/10 or bg-white/10
from-violet-500 to-violet-400         --> (remove gradient, use plain text)
border-violet-500/30                  --> border-white/10 or border-border
hover:text-violet-400                 --> hover:text-white
bg-gradient-to-r from-violet-*        --> bg-[hsl(222,47%,14%)] solid
--primary: 262 83% 58%               --> --primary: 222 47% 55%
```

## Files to Edit (~20 files)

```text
src/index.css
src/pages/Index.tsx
src/pages/Pricing.tsx
src/pages/AeoDashboard.tsx
src/pages/AeoAnalytics.tsx
src/pages/AeoArticles.tsx
src/pages/AeoHistory.tsx
src/pages/AeoLocal.tsx
src/pages/AeoReddit.tsx
src/pages/AeoOpportunities.tsx
src/pages/AeoPlanning.tsx
src/pages/AeoBilling.tsx
src/pages/AeoSettings.tsx
src/pages/Answers.tsx
src/components/layout/AeoSidebar.tsx
src/components/layout/PublicFooter.tsx
src/components/aeo/SoftPaywallBanner.tsx
src/components/nudges/SocialProofToast.tsx
src/components/nudges/ExitIntentPopup.tsx
src/components/nudges/UrgencyBanner.tsx
tailwind.config.ts (optional cleanup)
```

## Principle
No violet/purple anywhere except the AnimatedLogo (brand mark). Everything is dark navy, white, and subtle blue glow. Matches Temso exactly.
