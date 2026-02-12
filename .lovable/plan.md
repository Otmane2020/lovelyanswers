

# Harmonize All Pages with Temso Color Palette

## Goal
Apply the same minimal, professional color scheme as Temso's homepage across every page: dark navy base, white typography, and only subtle violet/rose accents for logos and data visualizations. No excessive color variety.

## Color Palette Reference (from Temso)
- **Dark navy background**: `hsl(222,47%,11%)` (already used on public pages)
- **Text**: White on dark, near-black on light sections
- **Accent**: Violet-500 only -- used sparingly for logos, active states, graph highlights
- **Secondary data colors**: Muted blue/cyan only when needed for charts (no orange, emerald, fuchsia, etc.)
- **CTA buttons**: White on dark backgrounds, dark navy on white backgrounds
- **Borders**: `white/10` on dark, `border` on light

## Scope of Changes

### 1. Public Pages (already mostly aligned, minor cleanup)

**Index.tsx**
- Remove multi-color gradients (`from-cyan-500`, `from-fuchsia-500`, `from-violet-600 to-blue-600`)
- Replace showcase feature colors with uniform subtle violet tones
- Change the bottom CTA banner from `bg-gradient-to-r from-violet-600 to-blue-600` to solid dark navy with white CTA
- Remove "LovelyAnswers" text references (replace with brand-agnostic or just logo)

**Pricing.tsx**
- Already dark navy. Minor: remove orange badge color, use white/10 badge instead

**Auth.tsx, Signup.tsx, Onboarding.tsx**
- Ensure consistent dark navy + white text aesthetic
- Remove any colorful gradients that don't match

### 2. Dashboard Pages (major changes)

**DashboardLayout.tsx**
- Keep light background but ensure accent colors are only violet
- Progress bar: use violet instead of default primary gradient

**AeoSidebar.tsx**
- Remove "LovelyAnswers" branding text (keep logo only)
- Active state: keep violet accent only

**AeoDashboard.tsx**
- Replace multi-color stat icon gradients (emerald, blue, orange) with a single violet shade
- Quick action cards: uniform violet icon background instead of varied colors
- Subscription banner: use violet instead of emerald/teal for subscribed state
- "Getting Started" card: violet only, no blue gradient

### 3. All Other Dashboard Pages
- **AeoAnalytics.tsx, AeoHistory.tsx, AeoArticles.tsx, etc.**: Replace any colorful accent badges/icons with violet-only variants
- **AeoSettings.tsx, AeoBilling.tsx**: Clean up any stray color usage
- **AeoLocal.tsx, AeoReddit.tsx**: Standardize card/badge colors to violet

### 4. Shared Components
- **SoftPaywallBanner.tsx**: Replace `from-violet-500/20 to-blue-500/20` with a single violet tone
- **AnimatedLogo.tsx**: Keep as-is (logo colors stay)
- **PublicFooter.tsx**: Ensure dark navy background, white text, violet links only

### 5. Global CSS (index.css)
- Update `--gradient-primary` to be pure violet (no blue mix)
- Update `--gradient-accent` to remove fuchsia, keep violet only
- Ensure `--primary` stays at violet `262 83% 58%`

## Technical Details

### Files to Edit (~15-20 files)
```text
src/index.css                          -- Simplify gradient tokens
src/pages/Index.tsx                    -- Remove multi-color gradients
src/pages/Pricing.tsx                  -- Minor badge color fix
src/pages/AeoDashboard.tsx             -- Unify stat/action colors to violet
src/components/layout/AeoSidebar.tsx   -- Remove brand text
src/components/layout/DashboardLayout.tsx -- Violet progress bar
src/components/aeo/SoftPaywallBanner.tsx -- Violet-only gradient
src/pages/AeoAnalytics.tsx             -- Violet accents
src/pages/AeoArticles.tsx              -- Violet accents
src/pages/AeoHistory.tsx               -- Violet accents
src/pages/AeoLocal.tsx                 -- Violet accents
src/pages/AeoReddit.tsx                -- Violet accents
src/pages/AeoSettings.tsx              -- Violet accents
src/pages/AeoBilling.tsx               -- Violet accents
src/pages/AeoOpportunities.tsx         -- Violet accents
src/pages/Answers.tsx                  -- Violet accents
```

### Color Mapping
```text
Current                          --> New
from-emerald-500 to-teal-500     --> bg-violet-500/10 text-violet-500
from-blue-500 to-cyan-500        --> bg-violet-500/10 text-violet-500
from-orange-500 to-amber-500     --> bg-violet-500/10 text-violet-500
from-fuchsia-500 to-violet-600   --> bg-violet-500
from-violet-600 to-blue-600      --> bg-[hsl(222,47%,11%)]
from-cyan-500 to-blue-600        --> bg-violet-500
text-emerald-400                 --> text-violet-400
text-cyan-400                    --> text-white/70
```

### Principle
Only violet-500 as accent color. Everything else is dark navy, white, or gray. Data visualizations in charts can use violet shades (violet-300 to violet-600) for differentiation instead of rainbow colors.

