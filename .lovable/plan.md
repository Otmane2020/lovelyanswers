

## Update Logo SVG

The user provided an updated SVG logo with a white background (`#ffffff`) and lighter border (`#e8eaf0`), replacing the previous gradient background. The SVG content is otherwise identical.

### Changes

1. **Replace `src/assets/autopilotgeo-logo-light.svg`** with the new SVG code provided by the user (white bg, light border, no grid lines).

2. **Update `src/components/AnimatedLogo.tsx`** to import the SVG instead of the PNG for the `full` variant, so the crisp vector version is used everywhere.

### Files to modify
- `src/assets/autopilotgeo-logo-light.svg` -- replace content with new SVG
- `src/components/AnimatedLogo.tsx` -- switch full variant import from `.png` to `.svg`

