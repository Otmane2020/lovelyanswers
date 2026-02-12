

# Fix Build Error in AeoReddit.tsx

## Problem
Line 68 in `src/pages/AeoReddit.tsx` has a syntax error:
```
const [visibilityMode, setVisibilityMode<VisibilityMode>("soft");
```
It's missing `] = useState` -- the correct syntax should be:
```
const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>("soft");
```

## Fix
One single line change in `src/pages/AeoReddit.tsx` at line 68:
- Replace `setVisibilityMode<VisibilityMode>("soft");` with `setVisibilityMode] = useState<VisibilityMode>("soft");`

This will resolve all ~100 cascading build errors since they all stem from this one broken `useState` declaration.

