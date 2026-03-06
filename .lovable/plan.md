

## Logo Consistency Fix

### Problem
The logo SVG (`autopilotgeo-logo-light.svg`) has a built-in background pill (`<rect>` with gradient fill and border stroke) that creates a visible box. When rendered at small sizes (h-8), the full 520x120 wordmark becomes tiny and unreadable. It also appears duplicated in both the sidebar and header.

### Plan

**1. Fix the SVG asset** -- Remove the background rect and border stroke from `src/assets/autopilotgeo-logo-light.svg` so it renders transparently and blends with any background. Also remove the subtle grid lines. Keep all orbit graphics and text.

**2. Create an icon-only SVG** -- Extract just the orbit/core graphic (viewBox ~15 15 90 90) into `src/assets/autopilotgeo-icon.svg` for use when the sidebar is collapsed or space is tight.

**3. Update AnimatedLogo component** -- Add a `variant` prop: `"full"` (wordmark, default) and `"icon"` (orbit only). Adjust size classes so the full logo renders at readable sizes (h-10 sidebar, h-9 header).

**4. Update AeoSidebar** -- Use `variant="icon"` when sidebar is collapsed (`state !== "expanded"`), `variant="full"` when expanded. Match the sidebar top area background to `linear-gradient(135deg, #f0f4ff, #e8eeff)` so the logo blends.

**5. Update DashboardLayout header** -- Keep the gradient background (`#f0f4ff` to `#e8eeff`). Use `AnimatedLogo` with `variant="full"` at proper size. Remove border so it blends seamlessly with the page background.

**6. Verify other usages** -- All ~20 files already use `<AnimatedLogo />`, so fixes propagate automatically. Spot-check pages with dark backgrounds (Auth, landing) to ensure the transparent logo still looks good; add a white/light container if needed.

### Files to modify
- `src/assets/autopilotgeo-logo-light.svg` -- remove background rect, border, grid lines
- `src/assets/autopilotgeo-icon.svg` -- new file, icon only
- `src/components/AnimatedLogo.tsx` -- add variant prop
- `src/components/layout/AeoSidebar.tsx` -- responsive variant + background
- `src/components/layout/DashboardLayout.tsx` -- clean header styling

