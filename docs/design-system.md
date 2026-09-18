# CareCue — Design System

> Premium health-tech · Modern AI product · Calm clinical interface

---

## 1. Design Philosophy

CareCue's visual language communicates **trust, clarity, and intelligence**. It avoids both the sterile coldness of traditional medical software and the superficial polish of generic SaaS templates.

**Three pillars:**

1. **Calm confidence** — Generous whitespace, restrained color, strong typography hierarchy
2. **Visible intelligence** — The Trust Path, verification badges, and evidence linking make the AI's work legible
3. **Premium restraint** — Sophistication through subtlety, not through excess effects

---

## 2. Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | **React 18+** | Component model, ecosystem, hackathon speed |
| Language | **TypeScript** | Type safety for medical data handling |
| Styling | **Tailwind CSS v3** | Utility-first, fast iteration, design token mapping |
| Components | **shadcn/ui** | Copy-paste components, full control, Radix primitives |
| Primitives | **Radix UI** | Accessible, unstyled primitives (dialogs, popovers, tabs) |
| Icons | **Lucide React** | Clean, consistent, healthcare-appropriate |
| Animation | **Framer Motion** | Declarative, performant, `prefers-reduced-motion` support |
| Fonts | **Google Fonts** | Inter (primary), JetBrains Mono (data values) |

---

## 3. Color System

### 3.1 Core Palette

All colors are defined as HSL values for consistent manipulation.

```css
:root {
  /* ─── Backgrounds ─── */
  --bg-primary:        hsl(40, 20%, 98%);     /* Warm white */
  --bg-secondary:      hsl(40, 15%, 95%);     /* Warm off-white */
  --bg-tertiary:       hsl(40, 12%, 91%);     /* Subtle warm gray */
  --bg-surface:        hsl(0, 0%, 100%);      /* Card/panel white */
  --bg-elevated:       hsl(0, 0%, 100%);      /* Modals, popovers */

  /* ─── Typography ─── */
  --text-primary:      hsl(220, 20%, 18%);    /* Deep charcoal */
  --text-secondary:    hsl(220, 12%, 43%);    /* Muted charcoal */
  --text-tertiary:     hsl(220, 8%, 58%);     /* Subtle gray */
  --text-inverse:      hsl(0, 0%, 100%);      /* White on dark */

  /* ─── Brand / Accent ─── */
  --accent-teal:       hsl(172, 46%, 42%);    /* Primary teal — actions, links, success */
  --accent-teal-light: hsl(172, 40%, 94%);    /* Teal background */
  --accent-teal-dark:  hsl(172, 50%, 32%);    /* Teal hover/pressed */

  /* ─── Verification (AI) ─── */
  --ai-lavender:       hsl(262, 38%, 58%);    /* Gemini / verification accent */
  --ai-lavender-light: hsl(262, 35%, 95%);    /* Verification background */
  --ai-lavender-dark:  hsl(262, 42%, 45%);    /* Verification hover */

  /* ─── Status ─── */
  --status-consistent:     hsl(172, 46%, 42%);    /* Teal — both AIs agree */
  --status-consistent-bg:  hsl(172, 40%, 94%);
  --status-review:         hsl(38, 85%, 52%);     /* Amber — needs review */
  --status-review-bg:      hsl(38, 80%, 95%);
  --status-safety:         hsl(0, 55%, 52%);      /* Muted red — safety */
  --status-safety-bg:      hsl(0, 50%, 96%);

  /* ─── Borders ─── */
  --border-default:    hsl(220, 10%, 88%);
  --border-subtle:     hsl(220, 8%, 92%);
  --border-strong:     hsl(220, 12%, 78%);
  --border-focus:      hsl(172, 46%, 42%);    /* Teal focus ring */

  /* ─── Shadows ─── */
  --shadow-sm:   0 1px 2px hsl(220, 10%, 80%, 0.08);
  --shadow-md:   0 2px 8px hsl(220, 10%, 70%, 0.10), 0 1px 3px hsl(220, 10%, 70%, 0.06);
  --shadow-lg:   0 4px 16px hsl(220, 10%, 60%, 0.12), 0 2px 6px hsl(220, 10%, 60%, 0.06);
  --shadow-xl:   0 8px 32px hsl(220, 10%, 50%, 0.14), 0 4px 12px hsl(220, 10%, 50%, 0.06);
}
```

### 3.2 Dark Mode & Semantic Theme Tokens

CareCue supports **Light**, **Dark**, and **System** preference switching via a shared CSS variable architecture.

```css
.dark, [data-theme="dark"] {
  --bg-primary:        hsl(222, 26%, 9%);      /* Deep navy/charcoal */
  --bg-secondary:      hsl(222, 22%, 13%);
  --bg-tertiary:       hsl(222, 18%, 18%);
  --bg-surface:        hsl(222, 24%, 12%);     /* Dark elevated surface */
  --bg-elevated:       hsl(222, 20%, 15%);

  --text-primary:      hsl(210, 25%, 96%);     /* Soft white */
  --text-secondary:    hsl(215, 15%, 72%);
  --text-tertiary:     hsl(215, 10%, 54%);
  --text-inverse:      hsl(222, 26%, 9%);

  --accent-teal:       hsl(172, 50%, 50%);
  --accent-teal-light: hsl(172, 40%, 16%);
  --accent-teal-dark:  hsl(172, 48%, 76%);

  --ai-lavender:       hsl(262, 50%, 70%);
  --ai-lavender-light: hsl(262, 35%, 17%);
  --ai-lavender-dark:  hsl(262, 45%, 82%);

  --border-default:    hsl(222, 16%, 22%);
  --border-subtle:     hsl(222, 14%, 16%);
  --border-strong:     hsl(222, 18%, 32%);
}
```

### 3.3 Color Usage Rules

| Context | Color | Never |
|---------|-------|-------|
| Primary actions | `accent-teal` | Don't use teal for warnings |
| AI/Verification elements | `ai-lavender` | Don't use lavender for primary actions |
| Success/Consistent | `status-consistent` (teal) | Don't use green — teal serves this role |
| Needs Review | `status-review` (amber) | Don't use amber for errors |
| Safety/Error | `status-safety` (muted red) | Only for genuine safety states. Never decorative. |
| Backgrounds | Warm neutrals only | No colored backgrounds for content areas |
| Text | Deep charcoal hierarchy | Never pure black (#000) |

### 3.4 Accessibility Contrast Ratios

| Pair | Ratio | WCAG Level |
|------|-------|------------|
| `text-primary` on `bg-primary` | 12.8:1 | AAA |
| `text-secondary` on `bg-primary` | 5.2:1 | AA |
| `accent-teal` on `bg-surface` | 4.7:1 | AA |
| `status-review` on `bg-surface` | 3.4:1 | AA Large (pair with text label) |
| `status-safety` on `bg-surface` | 4.6:1 | AA |

---

## 4. Typography

### 4.1 Font Stack

```css
--font-display: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-sans:    'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono:    'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
```

### 4.2 Type Scale

Based on a **1.250 (Major Third)** scale from a 16px base.

| Token | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| `display` | 36px / 2.25rem | 700 | 1.2 | -0.025em | Landing page hero |
| `h1` | 30px / 1.875rem | 700 | 1.25 | -0.02em | Page titles |
| `h2` | 24px / 1.5rem | 600 | 1.3 | -0.015em | Section titles |
| `h3` | 20px / 1.25rem | 600 | 1.35 | -0.01em | Card titles, subsections |
| `h4` | 16px / 1rem | 600 | 1.4 | 0 | Labels, small headings |
| `body` | 16px / 1rem | 400 | 1.6 | 0 | Body text |
| `body-sm` | 14px / 0.875rem | 400 | 1.5 | 0.005em | Secondary text, captions |
| `caption` | 12px / 0.75rem | 500 | 1.4 | 0.02em | Metadata, timestamps |
| `mono` | 14px / 0.875rem | 500 | 1.4 | 0 | Data values, code |
| `overline` | 11px / 0.6875rem | 700 | 1.3 | 0.08em | Category labels, uppercase |

### 4.3 Typography Rules

- **Never use more than 3 weights on a single screen** (400, 600, 700)
- **Data values** (lab results, ranges) use `font-mono`
- **Overline text** is always uppercase, always `caption` size with wide tracking
- **Paragraph max-width:** 65ch for readability
- **Medical terms** are styled inline with a subtle underline and tooltip definition

---

## 5. Spacing System

8px base grid. All spacing is a multiple of 4px.

| Token | Value | Usage |
|-------|-------|-------|
| `space-0` | 0 | — |
| `space-1` | 4px | Tight internal padding (icon gaps) |
| `space-2` | 8px | Small padding, form gaps |
| `space-3` | 12px | Compact component padding |
| `space-4` | 16px | Standard component padding |
| `space-5` | 20px | Medium separation |
| `space-6` | 24px | Section gaps |
| `space-8` | 32px | Large section gaps |
| `space-10` | 40px | Major section separation |
| `space-12` | 48px | Page-level spacing |
| `space-16` | 64px | Hero/landing spacing |
| `space-20` | 80px | Major section breaks |
| `space-24` | 96px | Top-level page padding |

---

## 6. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 6px | Badges, small tags |
| `radius-md` | 8px | Buttons, inputs |
| `radius-lg` | 12px | Cards, panels |
| `radius-xl` | 16px | Modals, major surfaces |
| `radius-full` | 9999px | Avatars, pills, circular indicators |

### Philosophy

Rounded, but not bubbly. The `radius-lg` (12px) is the workhorse for cards and panels — it feels modern and warm without being toy-like.

---

## 7. Shadows & Elevation

| Level | Token | Usage |
|-------|-------|-------|
| 0 | None | Flat elements, inline content |
| 1 | `shadow-sm` | Subtle card separation |
| 2 | `shadow-md` | Interactive cards, form fields on focus |
| 3 | `shadow-lg` | Floating panels, dropdown menus |
| 4 | `shadow-xl` | Modals, critical overlays |

### Surface Hierarchy

```
bg-primary (page background)
  └── bg-surface (card) + shadow-sm + border-subtle
        └── bg-elevated (modal/popover) + shadow-lg
```

- Cards use a **subtle border + minimal shadow** — not heavy drop shadows
- Modals use a **stronger shadow + scrim overlay** (black at 40% opacity)
- No layered glassmorphism — depth comes from shadow and border, not blur

---

## 8. Border System

| Token | Value | Usage |
|-------|-------|-------|
| `border-default` | 1px solid `--border-default` | Card outlines, dividers |
| `border-subtle` | 1px solid `--border-subtle` | Internal separators |
| `border-strong` | 1px solid `--border-strong` | Active/focused borders |
| `border-focus` | 2px solid `--border-focus` | Focus rings (accessibility) |

### Rules

- Cards always have a border + subtle shadow (never shadow-only)
- Dividers use `border-subtle` and are `1px`
- Focus rings are `2px` solid teal with a `2px` offset

---

## 9. Component Architecture

### 9.1 Component Hierarchy

```
Design Tokens (CSS Variables)
  └── Primitives (Radix)
        └── Base Components (shadcn/ui, customized)
              └── Composed Components (CareCue-specific)
                    └── Page Layouts
```

### 9.2 Base Components (from shadcn/ui, themed)

| Component | Source | Customization |
|-----------|--------|--------------|
| Button | shadcn/ui | CareCue color tokens, sizes, loading states |
| Input | shadcn/ui | Warm border, teal focus ring |
| Textarea | shadcn/ui | Same styling as Input |
| Select | shadcn/ui (Radix) | Custom dropdown styling |
| Dialog/Modal | shadcn/ui (Radix) | CareCue radius, shadow-xl, scrim |
| Popover | shadcn/ui (Radix) | Evidence detail popovers |
| Tabs | shadcn/ui (Radix) | For session type selection |
| Toast | shadcn/ui | Status-aware (teal/amber/red) |
| Skeleton | shadcn/ui | Warm-toned skeleton loaders |
| Badge | shadcn/ui | Verification status badges |
| Card | shadcn/ui | Warm border + subtle shadow |
| Progress | shadcn/ui | Trust Path progress indicator |
| Sheet | shadcn/ui (Radix) | Mobile bottom sheets |
| Separator | shadcn/ui | Subtle border dividers |
| Tooltip | shadcn/ui (Radix) | Medical term definitions |
| ScrollArea | shadcn/ui (Radix) | Custom scrollbar styling |

### 9.3 Composed Components (CareCue-specific)

| Component | Description | Composition |
|-----------|-------------|-------------|
| **TrustPath** | Horizontal step indicator showing SOURCE → ANALYSIS → VERIFICATION → NEXT STEP | Custom, Framer Motion |
| **PrivacyGateway** | Split-panel showing original vs. minimized content | Card + custom diff view |
| **EvidenceCard** | Insight card with source, value, range, verification status | Card + Badge + Button |
| **EvidenceDetail** | Expanded view of an evidence card showing source + AI comparison | Dialog/Sheet |
| **VerificationBadge** | Consistent / Needs Review / Safety Redirect indicator | Badge + Icon + Tooltip |
| **DualAIComparison** | Side-by-side Bedrock vs. Gemini analysis | Custom panel layout |
| **DoctorBrief** | Printable preparation document | Custom page layout |
| **SafetyBanner** | Persistent safety/disclaimer banner | Alert + custom styling |
| **SessionCard** | History list item showing session type, date, status | Card + metadata |
| **FileUpload** | Drag-and-drop upload zone with preview | Custom + Radix |
| **ProcessingStatus** | Real-time analysis step indicator | TrustPath + status messages |
| **MetricValue** | Lab value display with range indicator | Custom monospace display |
| **StatusIndicator** | Small dot + label for verification status | Custom, color-coded |

### 9.4 Layout Components

| Component | Description |
|-----------|-------------|
| **AppShell** | Main responsive layout: Collapsible desktop sidebar (240px / 72px) with accessible tooltips, top header bar with theme switcher, slide-in mobile drawer sheet, and mobile bottom tab navigation |
| **HeroDepthVisual** | 3D layered landing visual with cursor-responsive parallax, ambient glows, and 4 Trust Path floating depth panels |
| **PageHeader** | Page title + breadcrumb + actions |
| **ContentArea** | Max-width centered content container (responsive padding for 1366px laptops & 390px mobile) |
| **SidebarNav** | Desktop left navigation rail with collapse toggle (`PanelLeft` / `PanelLeftClose`) and persisted state |
| **MobileDrawer** | Accessible slide-in navigation drawer with backdrop blur, Esc key handling, and close button |
| **BottomNav** | Mobile bottom tab navigation |
| **SessionFlow** | Full-screen linear flow wrapper (hides nav) |

---

## 10. Button Hierarchy

| Variant | Usage | Appearance |
|---------|-------|------------|
| **Primary** | Main CTA — one per screen | Teal fill, white text, `radius-md` |
| **Secondary** | Alternative actions | Teal outline, teal text |
| **Ghost** | Tertiary actions, navigation | Transparent, teal text, hover: teal-light bg |
| **Destructive** | Delete actions | Muted red outline, red text. Fill on confirm. |
| **Icon** | Compact actions | Ghost with icon only. Tooltip required. |

| Size | Height | Padding | Font |
|------|--------|---------|------|
| `sm` | 32px | 12px 16px | body-sm |
| `md` | 40px | 16px 24px | body |
| `lg` | 48px | 20px 32px | body (600 weight) |

### Button States

- **Default:** Base color
- **Hover:** Darken 8% (`accent-teal-dark`)
- **Pressed:** Darken 12%, scale 0.98
- **Focused:** `border-focus` ring (2px offset)
- **Disabled:** 50% opacity, cursor not-allowed
- **Loading:** Spinner replaces text (button width preserved)

---

## 11. Form Components

| Component | Styling |
|-----------|---------|
| **Text Input** | 40px height, `radius-md`, `border-default`, teal focus ring, warm bg |
| **Textarea** | Same as input, auto-grow, min 100px |
| **File Upload** | Dashed border zone, teal accent on hover/drag, file preview after upload |
| **Select** | Input-styled trigger, Radix dropdown, checkmark for selected |
| **Checkbox** | Radix, teal fill when checked, focus ring |
| **Radio** | Radix, teal dot when selected |
| **Label** | `body-sm`, `text-secondary`, 4px below label |
| **Help Text** | `caption`, `text-tertiary`, 4px below input |
| **Error Text** | `caption`, `status-safety`, with ⚠ icon |

---

## 12. Status Badges

The verification status badge is a signature CareCue element.

```
┌─────────────────────────┐
│  ● Consistent           │  Teal dot + teal text + teal-light bg
└─────────────────────────┘

┌─────────────────────────┐
│  ◐ Needs Review         │  Amber dot + amber text + amber-light bg
└─────────────────────────┘

┌─────────────────────────┐
│  ⚠ Safety Redirect      │  Red dot + red text + red-light bg
└─────────────────────────┘
```

- Always includes icon + text label (never color alone)
- `radius-full` (pill shape)
- 28px height, `caption` font size
- Accessible: works in grayscale, screenreader-friendly

---

## 13. Card Patterns

### Evidence Card

```
┌──────────────────────────────────────────────────────┐
│  [● Consistent]                        [body system] │  ← Badge + category
│                                                      │
│  Hemoglobin: 11.2 g/dL                               │  ← h3 + mono value
│                                                      │
│  Below the typical reference range of 12.0–17.5      │  ← body text
│  g/dL. Your doctor may want to discuss this.         │
│                                                      │
│  ──────────────────────────────────────────────────   │  ← divider
│  📄 Source: Page 1, CBC Panel                        │  ← caption + link
│  [View Evidence]              [Add to Brief]         │  ← ghost buttons
└──────────────────────────────────────────────────────┘
```

- `bg-surface`, `border-default`, `shadow-sm`, `radius-lg`
- 24px internal padding
- Hover: `shadow-md` transition (150ms)
- Verification badge top-right
- Source reference bottom, always visible

### Session Card (History)

```
┌──────────────────────────────────────────────────────┐
│  📄 Understand a Report                              │  ← icon + session type
│  Blood Work Results — Sept 15, 2026                  │  ← document name + date
│  3 insights · 2 consistent · 1 needs review          │  ← summary
└──────────────────────────────────────────────────────┘
```

### 13.3 Depth & 3D Interactions (Clinical Calm × AI Precision)

CareCue incorporates restrained 3D perspective and elevation tokens:

| Token / Class | Transform / Effect | Purpose |
|---------------|-------------------|---------|
| `perspective-1200` | `perspective: 1200px` | Hero 3D depth canvas |
| `perspective-1000` | `perspective: 1000px` | Trust Path and Dual AI panels |
| `card-depth-lift` | `translateY(-3px) translateZ(8px)` + soft glow | Evidence card & pillar hover state |
| `btn-press-micro` | `transform: scale(0.975)` | Subtle button press feedback |
| `HeroDepthVisual` | Cursor-driven parallax via Framer Motion springs | Landing page signature 3D visual |

*Note: All 3D rotations, parallax shifts, and floating transforms are disabled automatically when `prefers-reduced-motion: reduce` or touch input (`pointer: coarse`) is active.*

---

## 14. Modal / Dialog

- `radius-xl` (16px)
- `shadow-xl`
- Max-width: 520px (small), 680px (medium), 800px (large)
- Scrim: `hsl(220, 18%, 10%, 0.4)` — warm dark overlay
- Enter: fade + scale from 0.95 (200ms ease-out)
- Exit: fade + scale to 0.97 (150ms ease-in)
- Focus-trapped via Radix
- Escape to close, click-outside to close

---

## 15. Toast Notifications

| Variant | Style |
|---------|-------|
| **Info** | `border-left: 3px solid accent-teal` |
| **Success** | `border-left: 3px solid status-consistent` |
| **Warning** | `border-left: 3px solid status-review` |
| **Error** | `border-left: 3px solid status-safety` |

- Bottom-right position (desktop), bottom-center (mobile)
- Auto-dismiss: 5s (info/success), 8s (warning), persistent (error)
- Enter: slide-up + fade (200ms)
- Exit: slide-right + fade (150ms)

---

## 16. Skeleton Loaders

- Use warm `bg-secondary` base with `bg-tertiary` shimmer animation
- Match the shape of the content they replace (rounded for cards, line-height for text)
- Shimmer animation: left-to-right sweep, 1.5s duration, infinite
- Evidence card skeleton: badge placeholder + 3 text lines + 1 action bar
- Brief skeleton: header + 4 section blocks

---

## 17. Responsive Breakpoints

| Breakpoint | Token | Layout |
|------------|-------|--------|
| **≥1280px** | `desktop` | Sidebar + full content. Side-by-side Privacy Gateway. |
| **≥1024px** | `laptop` | Collapsed sidebar (icons). |
| **≥768px** | `tablet` | No sidebar. Top nav. Single column. |
| **<768px** | `mobile` | Bottom tab nav. Full-width cards. Bottom sheets for details. |

### Tailwind Config

```js
screens: {
  'sm': '640px',
  'md': '768px',
  'lg': '1024px',
  'xl': '1280px',
}
```

---

## 18. Icon Strategy

### Source: Lucide React

Selected icons for key concepts:

| Concept | Icon | Usage |
|---------|------|-------|
| Understand a Report | `FileText` | Session type card |
| Care Guidance | `MessageCircle` | Session type card |
| Doctor Visit Brief | `ClipboardList` | Session type card |
| Privacy | `Shield` | Privacy Gateway, Privacy Center |
| Verification | `CheckCircle2` | Consistent status |
| Needs Review | `AlertCircle` | Review status |
| Safety | `AlertTriangle` | Safety redirect |
| Upload | `Upload` | File upload zone |
| Download | `Download` | Brief download |
| History | `Clock` | History navigation |
| Settings | `Settings` | Settings navigation |
| Source | `FileSearch` | Evidence source link |
| AI/Bedrock | `Brain` | Bedrock analysis indicator |
| AI/Gemini | `Sparkles` | Gemini verification indicator |
| Close | `X` | Modal close, dismiss |
| Back | `ArrowLeft` | Navigation back |
| External link | `ExternalLink` | Open in new context |
| Print | `Printer` | Print brief |
| Delete | `Trash2` | Delete session/data |

### Icon Rules

- **Size:** 16px (inline), 20px (buttons), 24px (navigation), 32px (feature cards)
- **Stroke width:** 1.5px (default) — clean and consistent with the typography
- **Color:** Inherits text color unless semantic (status icons use status colors)
- **Always paired with text** for navigation items — no icon-only navigation labels

---

## 19. Animation Guidelines (Framer Motion)

### Timing

| Duration | Usage |
|----------|-------|
| 150ms | Hover states, button presses |
| 200ms | Element entry, fade transitions |
| 300ms | Page transitions, modal open |
| 400ms | Privacy Gateway transformation |
| 50ms (stagger) | Card list entry offset |

### Easing

```js
const easings = {
  standard: [0.2, 0, 0, 1],        // Material Design standard
  enter:    [0, 0, 0.2, 1],         // Decelerate for entering elements
  exit:     [0.4, 0, 1, 1],         // Accelerate for leaving elements
  bounce:   [0.34, 1.56, 0.64, 1],  // Subtle bounce for verification badges
};
```

### Reduced Motion

```jsx
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// All animations must have instant alternatives
const variants = {
  enter: prefersReducedMotion
    ? { opacity: 1 }
    : { opacity: 1, y: 0, transition: { duration: 0.2 } },
};
```

---

## 20. The Trust Path Component (Signature UI)

The most important UI element in CareCue. Always visible during a session.

```
Desktop:
┌────────────────────────────────────────────────────────────┐
│                                                            │
│   ● SOURCE  ──────  ◎ ANALYSIS  ──────  ○ VERIFICATION    │
│                              ──────  ○ NEXT STEP           │
│                                                            │
└────────────────────────────────────────────────────────────┘

States per step:
  ○  Pending    — hollow circle, text-tertiary
  ◎  Active     — pulsing teal ring, text-primary
  ●  Complete   — filled teal circle with checkmark, text-primary
  ✕  Error      — muted red fill, text-primary

Connector lines:
  ──────  Pending    — dashed, border-subtle
  ══════  Complete   — solid, accent-teal, animated fill
```

### Mobile Trust Path

Compact horizontal layout with step abbreviations:

```
[✓ SRC] ─── [◎ ANL] ─── [○ VER] ─── [○ NEXT]
```

---

## 21. File Structure (Component Organization)

```
src/
├── components/
│   ├── ui/                    # shadcn/ui base components (themed)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── toast.tsx
│   │   ├── skeleton.tsx
│   │   ├── tabs.tsx
│   │   ├── progress.tsx
│   │   ├── sheet.tsx
│   │   ├── separator.tsx
│   │   ├── tooltip.tsx
│   │   └── scroll-area.tsx
│   │
│   ├── composed/              # CareCue-specific composed components
│   │   ├── trust-path.tsx
│   │   ├── privacy-gateway.tsx
│   │   ├── evidence-card.tsx
│   │   ├── evidence-detail.tsx
│   │   ├── verification-badge.tsx
│   │   ├── dual-ai-comparison.tsx
│   │   ├── doctor-brief.tsx
│   │   ├── safety-banner.tsx
│   │   ├── session-card.tsx
│   │   ├── file-upload.tsx
│   │   ├── processing-status.tsx
│   │   ├── metric-value.tsx
│   │   └── status-indicator.tsx
│   │
│   └── layout/                # Layout components
│       ├── app-shell.tsx
│       ├── page-header.tsx
│       ├── content-area.tsx
│       ├── sidebar-nav.tsx
│       ├── bottom-nav.tsx
│       └── session-flow.tsx
│
├── pages/                     # Page-level components
│   ├── landing.tsx
│   ├── session/
│   │   ├── select-type.tsx
│   │   ├── document-input.tsx
│   │   ├── privacy-gateway.tsx
│   │   ├── processing.tsx
│   │   ├── results.tsx
│   │   └── doctor-brief.tsx
│   │
│   ├── history/
│   │   ├── list.tsx
│   │   └── detail.tsx
│   │
│   ├── privacy-center.tsx
│   └── settings.tsx
│
├── styles/
│   ├── globals.css            # CSS variables, base styles
│   └── tailwind.config.ts     # Tailwind theme mapping
│
├── lib/
│   ├── api/                   # API client functions
│   ├── hooks/                 # Custom React hooks
│   ├── utils/                 # Utility functions
│   └── types/                 # TypeScript type definitions
│
└── assets/
    └── fonts/                 # Self-hosted font files (if needed)
```
