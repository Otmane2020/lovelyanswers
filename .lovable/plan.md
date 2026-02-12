

# Force Light Theme on Onboarding Page

## Problem
The `/onboarding` page uses a dark navy background (`bg-[hsl(222,47%,11%)]`) with white text, as shown in the screenshot. The user wants every page -- including onboarding -- to use the light theme.

## Changes (single file: `src/pages/Onboarding.tsx`)

### 1. Root container
- Replace `bg-[hsl(222,47%,11%)]` with `bg-background` (light white)

### 2. Header
- Replace `border-white/10` with `border-border`
- Replace `text-white` with `text-foreground`
- Replace `text-violet-400` with `text-primary`

### 3. Step 1 (URL Input)
- Remove `from-primary/10 to-violet-500/10` and `border-primary/20` badge gradient -- use `bg-muted border-border`
- Replace gradient text `from-primary to-violet-500` with plain `text-primary`
- Remove violet from testimonial avatar gradient

### 4. Step 4 (Analyzing)
- Replace `from-primary/30 to-violet-500/30` glow with `bg-primary/20`
- Text colors already use `text-foreground` / `text-muted-foreground` via CSS variables (correct for light)

### 5. Step 3 (Email gate)
- Replace `from-primary/20 to-violet-500/20` icon bg with `bg-primary/10`

### 6. Step 7 (Pain/FOMO)
- Replace `from-primary/10 via-violet-500/10 to-fuchsia-500/10` solution card with `bg-primary/5 border-primary/20`

### 7. Step 6 (Pricing)
- Any remaining violet references

### 8. Bottom progress bar and CTA
- Replace dark-themed sticky bar (`bg-[hsl(222,47%,11%)]`, `border-white/10`) with `bg-background border-border`
- Replace white CTA button with `bg-primary text-primary-foreground` (navy button, white text)
- Step indicators: use `border-foreground` / `bg-foreground` instead of `border-white` / `bg-white`

All text using `text-white` explicitly will be changed to `text-foreground` so it renders dark on the light background.

## Files to edit
- `src/pages/Onboarding.tsx` (single file, ~30 class replacements)

