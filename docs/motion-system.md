# CareCue — Motion System

> "Every animation must answer at least one of these: Does it explain state? Does it improve hierarchy? Does it improve feedback? Does it create spatial understanding? Or does it make navigation feel natural?"

---

## 1. Core Principles

CareCue's motion design emphasizes **premium restraint** and **clinical calm**. We avoid gratuitous animations (like confetti or bouncy text) in favor of precise, functional transitions that help users build a spatial mental model of the interface.

### The 5 Rules of CareCue Motion
1. **Never decorate, always inform:** Motion should explain changes in state (e.g., a modal emerging from the surface).
2. **Speed is intelligence:** AI interactions must feel fast and deliberate. No artificial delays.
3. **Respect accessibility unconditionally:** All motion must be gated by `prefers-reduced-motion`.
4. **Use springs for physics, easings for UI:** Use spring physics for 3D interactions (parallax, dragging), but standard ease-out curves for UI fades and slides.
5. **No staggered text animations:** Content should appear as a single block or logical sections, not letter-by-letter or word-by-word.

---

## 2. Motion Tokens (CSS)

CareCue provides standardized motion tokens in `index.css` for consistent timing and easing across the application.

```css
  --motion-ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --motion-ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  
  --motion-duration-fast: 150ms;
  --motion-duration-normal: 250ms;
  --motion-duration-slow: 450ms;
```

### Usage Guide
- **Fast (150ms):** Hover states, button presses (`.btn-press-micro`), micro-interactions, tooltips.
- **Normal (250ms):** Card lifts (`.card-depth-lift`), dropdowns, modal fades, simple transitions.
- **Slow (450ms):** Major layout changes, sidebar collapsing, page transitions.

---

## 3. Signature Animations

### 3.1 Depth & 3D Interactions
We use CSS 3D transforms to create subtle, premium depth. These are restricted to hover states and non-essential visual flourishes.

- **`.card-depth-lift`**: Applied to interactive cards (like Evidence Cards). On hover, it translates the card up and forward (`translateY(-3px) translateZ(8px)`) while applying a custom glow (`--depth-card-glow`).
- **`.btn-press-micro`**: Applied to buttons for tactile feedback. On active press, scales the button down slightly (`scale(0.975)`).

### 3.2 Framer Motion Page Transitions
Page navigation uses a subtle blur-and-scale effect, mimicking premium native applications.

```tsx
<motion.div
  initial={{ opacity: 0, y: 8, scale: 0.98, filter: 'blur(4px)' }}
  animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
  exit={{ opacity: 0, y: -4, scale: 0.98, filter: 'blur(2px)' }}
  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
  className="min-h-full will-change-[opacity,transform,filter]"
>
```

### 3.3 AI Processing Timeline
The signature AI signature processing state uses animated SVGs to draw connecting lines between steps, communicating the flow of data from source document, through dual AI analysis, to final verification.

---

## 4. Accessibility & Reduced Motion

**This is a strict requirement for CareCue.** All motion must respect the user's OS-level motion preferences.

### CSS Implementation
In `index.css`, a global media query disables all transitions and animations:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    transform: none !important;
  }
  .ambient-mesh, .cursor-glow::before {
    display: none !important;
  }
}
```

### Tailwind Implementation
For Tailwind utility classes, use the `motion-reduce:` modifier to disable transitions on specific elements that might not be caught by the global reset (e.g., layout changes).

```tsx
<aside className="transition-[width] duration-400 motion-reduce:transition-none">
```
