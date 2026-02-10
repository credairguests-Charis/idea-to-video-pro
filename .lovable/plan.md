

# Production-Grade Onboarding Redesign

## Current Problems

1. **Welcome Dialog feels generic** -- icon-in-a-circle with bullet points looks templated and AI-generated, not branded
2. **OnboardingSpotlight tooltip** uses a flat primary-colored box with CSS border-arrow -- looks dated
3. **Two redundant tooltip components** exist (`OnboardingTooltip.tsx` and `OnboardingSpotlight.tsx`) creating confusion
4. **No visual hierarchy or delight** -- no illustrations, no micro-interactions, no personality
5. **Flow feels mechanical** -- click next, next, next with no sense of progression or reward

---

## Design Philosophy

Inspired by onboarding from Notion, Linear, and Figma:
- **Minimal chrome, maximum clarity** -- one message at a time, generous whitespace
- **Branded visuals** -- use the Charis logo/brand colors, not generic Lucide icons
- **Subtle motion** -- spring animations, not slideshows
- **Contextual, not instructional** -- spotlight tooltips that feel like gentle nudges, not manuals
- **Completion reward** -- a satisfying end-state, not just the dialog closing

---

## Redesigned Flow

```text
  [Sign Up] --> [Welcome Dialog (single screen)] --> [Close]
       |
       v
  [Spotlight 1: Actor Selection] --> [Spotlight 2: Script Input]
       |                                      |
       v                                      v
  [Spotlight 3: Generate Button] --> [Spotlight 4: Credits]
       |
       v
  [Completion confetti / "You're all set!" toast]
```

---

## Changes

### 1. WelcomeDialog.tsx -- Complete Redesign

Replace the 4-step slideshow with a single, elegant welcome screen:

- **Remove** the multi-step carousel (users skip multi-step dialogs)
- **Single screen** with the Charis logo at top, a warm headline ("Welcome to Charis"), a brief one-liner subtitle, and 3 concise value props as a clean list with subtle check icons
- **Two actions**: "Take a quick tour" (primary) and "Skip" (ghost, bottom-left)
- **Visual polish**: soft radial gradient background behind the logo area, slightly larger dialog (`sm:max-w-[440px]`), rounded corners
- **Animation**: fade-in with a gentle scale spring on mount, staggered list items

### 2. OnboardingSpotlight.tsx -- Visual Upgrade

Redesign the spotlight tooltip to look hand-crafted:

- **Tooltip card**: replace the flat `bg-primary` box with a white card (`bg-white`) with a subtle shadow (`shadow-xl`), dark text, and a thin left-border accent line in brand color
- **Arrow**: replace CSS border-hack arrow with an SVG arrow for crisp rendering at any angle
- **Progress**: replace dot indicators with a minimal text label ("1 of 4") and a thin progress bar underneath the content
- **Typography**: title in `font-semibold text-sm text-foreground`, description in `text-xs text-muted-foreground`
- **Actions**: "Next" as a small solid primary button, "Skip tour" as an underlined text link (not a second button)
- **Backdrop**: reduce overlay opacity from 60% to 40% for a lighter feel, add a subtle `backdrop-blur-sm`
- **Spotlight ring**: add a soft pulsing glow ring around the highlighted element (2px primary-colored ring with animation)
- **Transition**: tooltip enters with `spring` physics (`stiffness: 300, damping: 24`) instead of linear easing

### 3. Remove OnboardingTooltip.tsx

Delete the unused `OnboardingTooltip.tsx` component -- `OnboardingSpotlight.tsx` fully replaces it.

### 4. Completion State

When the last spotlight is dismissed:

- Show a brief success toast via `sonner`: "You're all set! Start creating." with a checkmark icon
- This replaces silently closing and gives the user a sense of accomplishment

### 5. Spotlight Content Refinement

Update the copy in `BottomInputPanel.tsx` and `CreditBar.tsx` spotlight wrappers to be shorter and more conversational:

| Step | Title | Description |
|------|-------|-------------|
| 1 - Actors | "Pick your actors" | "Choose who appears in your video. Select one or several for A/B testing." |
| 2 - Script | "Write your script" | "Type what your actor will say. Keep it 30-60 seconds for best results." |
| 3 - Generate | "Hit generate" | "When you're ready, tap here to create your video." |
| 4 - Credits | "Your credits" | "Each video costs credits. You can see your balance and buy more here." |

### 6. CSS Additions (index.css)

Add a subtle pulsing spotlight ring animation:

```css
@keyframes spotlight-pulse {
  0%, 100% { box-shadow: 0 0 0 2px hsl(var(--primary) / 0.4); }
  50% { box-shadow: 0 0 0 6px hsl(var(--primary) / 0.1); }
}
```

---

## Technical Details

### Files Modified
- `src/components/onboarding/WelcomeDialog.tsx` -- rewrite to single-screen design
- `src/components/onboarding/OnboardingSpotlight.tsx` -- redesign tooltip visuals and animations
- `src/components/BottomInputPanel.tsx` -- update spotlight copy for steps 1-3
- `src/components/CreditBar.tsx` -- update spotlight copy for step 4
- `src/index.css` -- add spotlight-pulse keyframes

### Files Deleted
- `src/components/onboarding/OnboardingTooltip.tsx` -- redundant, unused

### Files Unchanged
- `src/hooks/useOnboarding.tsx` -- the hook logic and flow sequencing remain identical
- No database changes needed

### Dependencies
- No new packages -- uses existing `framer-motion`, `sonner`, `lucide-react`, and Radix primitives

