# CareCue — UX Flow & User Journey

> Every screen answers: *What is happening? Why? What data is used? Was it cross-checked? What do I do next?*

---

## 1. UX Principles

### 1.1 Five Pillars of Clarity

Every screen in CareCue must answer five questions:

| Question | How CareCue Answers |
|----------|-------------------|
| **What is happening?** | Clear, specific headline on every state. No ambiguous spinners. |
| **Why is it happening?** | Contextual subtext explains the purpose of each step. |
| **What data is being used?** | Privacy Gateway shows exactly what is sent where. |
| **Was the information cross-checked?** | Verification status is visible on every insight. |
| **What should I do next?** | A single, clear primary action on every screen. |

### 1.2 Interaction Model

- **Structured content first.** Use cards, sections, and evidence panels — not chat bubbles.
- **Conversational input where useful.** Text input for health questions and notes. Not a chatbot-first experience.
- **Progressive disclosure.** Show the essential insight first. Source evidence is one tap away.
- **Trust through transparency.** The Trust Path is always visible. The user always knows where they are.

### 1.3 Information Architecture Philosophy

- **Linear flow, not a dashboard.** The primary experience is a guided session, not a command center.
- **Minimal navigation.** Sessions, History, Privacy — three top-level concepts.
- **Depth over breadth.** Fewer screens, each doing its job well.

---

## 2. Sitemap

```
CareCue
├── Landing Page
│   └── Start Care Session →
│
├── Care Session (linear flow)
│   ├── Choose Session Type
│   │   ├── Understand a Report
│   │   ├── Care Guidance
│   │   └── Prepare for Doctor Visit
│   │
│   ├── Input
│   │   ├── Document Upload (PDF/image)
│   │   └── Text Entry (for Care Guidance)
│   │
│   ├── Privacy Gateway (visible processing)
│   │
│   ├── Processing State (analysis + verification)
│   │
│   ├── Results
│   │   ├── Evidence Cards (with verification status)
│   │   ├── Evidence Detail (source drill-down)
│   │   └── Verification Detail (dual-AI comparison)
│   │
│   └── Doctor Visit Brief (generated document)
│
├── History
│   ├── Session List
│   └── Session Detail (past results + brief)
│
├── Privacy Center
│   ├── Data Overview
│   ├── What We Send Where
│   └── Delete Data
│
├── Settings
│   └── Preferences
│
└── Error / Empty / Loading States
    ├── Error States (upload failure, API failure, timeout)
    ├── Empty States (no sessions, no results)
    └── Loading / Skeleton States
```

---

## 3. Primary User Journey: "Understand a Report"

This is the signature flow. It demonstrates the full Trust Path.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  LANDING PAGE                                                   │
│  ─────────────                                                  │
│  Hero: "Understand. Verify. Prepare."                           │
│  Trust Path visualization (subtle, ambient)                     │
│  CTA: "Start Care Session"                                      │
│                                                                 │
│  ↓                                                              │
│                                                                 │
│  SESSION TYPE SELECTION                                         │
│  ──────────────────────                                         │
│  Three cards:                                                   │
│  [📄 Understand a Report]  ← user selects                      │
│  [💬 Care Guidance]                                             │
│  [📋 Prepare for Doctor Visit]                                  │
│                                                                 │
│  ↓                                                              │
│                                                                 │
│  DOCUMENT INPUT                                                 │
│  ─────────────                                                  │
│  Upload zone (drag & drop or file picker)                       │
│  Supported: PDF, JPG, PNG                                       │
│  Optional: paste text directly                                  │
│  Optional: add personal notes                                   │
│  CTA: "Begin Analysis"                                          │
│                                                                 │
│  ↓                                                              │
│                                                                 │
│  PRIVACY GATEWAY                                                │
│  ───────────────                                                │
│  Split view:                                                    │
│  LEFT:  Original extracted content (with PII highlighted)       │
│  RIGHT: Privacy-minimized payload (PII replaced/removed)        │
│                                                                 │
│  Visual transformation animation (subtle, purposeful)           │
│  Labels: "What you uploaded" → "What is sent for verification"  │
│  Explanation: why we minimize, what happens next                 │
│                                                                 │
│  CTA: "Continue to Analysis"                                    │
│                                                                 │
│  ↓                                                              │
│                                                                 │
│  PROCESSING STATE                                               │
│  ────────────────                                               │
│  Trust Path progress bar:                                       │
│  [SOURCE ✓] → [ANALYSIS ◎] → [VERIFICATION ○] → [NEXT STEP ○] │
│                                                                 │
│  Step-by-step status messages:                                  │
│  "Extracting document structure..."                             │
│  "Analyzing with Amazon Bedrock..."                             │
│  "Cross-checking with independent verification..."              │
│  "Preparing your insights..."                                   │
│                                                                 │
│  Skeleton preview of results (anticipatory loading)             │
│                                                                 │
│  ↓                                                              │
│                                                                 │
│  RESULTS / INSIGHTS                                             │
│  ──────────────────                                             │
│  Trust Path: [SOURCE ✓] → [ANALYSIS ✓] → [VERIFICATION ✓] →   │
│              [NEXT STEP ◎]                                      │
│                                                                 │
│  Summary banner: "X insights found, Y verified consistent"      │
│                                                                 │
│  Evidence Cards (stacked):                                      │
│  ┌─────────────────────────────────────────────┐                │
│  │ [Consistent ●]                              │                │
│  │ Hemoglobin: 11.2 g/dL                       │                │
│  │ "Below the typical reference range of       │                │
│  │  12.0–17.5 g/dL. Your doctor may want       │                │
│  │  to discuss this."                           │                │
│  │                                              │                │
│  │ Source: Page 1, CBC Panel                    │                │
│  │ [View Evidence] [Add to Brief]               │                │
│  └─────────────────────────────────────────────┘                │
│                                                                 │
│  ┌─────────────────────────────────────────────┐                │
│  │ [Needs Review ●]                             │                │
│  │ Cholesterol: 215 mg/dL                       │                │
│  │ "Slightly above the desirable range.         │                │
│  │  The verification model noted additional     │                │
│  │  context may be relevant."                   │                │
│  │                                              │                │
│  │ Source: Page 2, Lipid Panel                  │                │
│  │ [View Evidence] [View Verification] [Brief]  │                │
│  └─────────────────────────────────────────────┘                │
│                                                                 │
│  Persistent footer: "This is not medical advice"                │
│  CTA: "Generate Doctor Visit Brief"                             │
│                                                                 │
│  ↓                                                              │
│                                                                 │
│  EVIDENCE DETAIL (drill-down)                                   │
│  ────────────────────────────                                   │
│  Shows: original source text (highlighted region)               │
│  Shows: Bedrock interpretation                                  │
│  Shows: Gemini verification response                            │
│  Shows: verification status with reasoning                      │
│  Back: returns to results list                                  │
│                                                                 │
│  ↓ (from Results CTA)                                           │
│                                                                 │
│  DOCTOR VISIT BRIEF                                             │
│  ──────────────────                                             │
│  Premium document layout:                                       │
│  - CareCue header                                               │
│  - Session date                                                 │
│  - Document summary                                             │
│  - Key findings table (value, range, status)                    │
│  - Items to discuss with your doctor                            │
│  - Your notes (editable)                                        │
│  - Disclaimer                                                   │
│                                                                 │
│  Actions: [Download PDF] [Print] [Save to History]              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Secondary Journey: "Care Guidance"

```
Session Type → Care Guidance
       ↓
Text Input
  "What does an elevated TSH level mean?"
  Optional: attach a document for context
       ↓
Privacy Gateway (if document attached)
       ↓
Processing (Bedrock analysis → Gemini verification)
       ↓
Structured Response
  - Plain-language explanation
  - Evidence cards (sourced from medical knowledge)
  - Verification status per claim
  - Related questions
  - "Discuss with your doctor" CTA
       ↓
Add to Doctor Visit Brief (optional)
```

---

## 5. Secondary Journey: "Prepare for Doctor Visit"

```
Session Type → Prepare for Doctor Visit
       ↓
Multi-Document Input
  Upload one or more documents
  Add notes: "Questions I want to ask"
  Add context: "Follow-up from last visit"
       ↓
Privacy Gateway (per document)
       ↓
Processing (consolidated analysis)
       ↓
Consolidated Results
  Evidence cards from all documents
  Cross-document patterns highlighted
       ↓
Doctor Visit Brief (pre-populated, editable)
  User can reorder, add notes, remove items
       ↓
Download / Print / Save
```

---

## 6. Navigation Architecture

### Desktop

```
┌────────────────────────────────────────────────────────┐
│  🏥 CareCue              [New Session]    [⚙ Settings] │
├──────────┬─────────────────────────────────────────────┤
│          │                                             │
│ Sessions │          Main Content Area                  │
│ History  │                                             │
│ Privacy  │                                             │
│          │                                             │
└──────────┴─────────────────────────────────────────────┘
```

- **Left rail:** Minimal, icon + label navigation. Three items max.
- **Top bar:** Logo, new session action, settings.
- **Main area:** Full content. No sidebar clutter during a session flow.
- During an active session, the left rail collapses or dims to reduce distraction.

### Mobile

```
┌────────────────────────────┐
│  🏥 CareCue          [≡]  │
├────────────────────────────┤
│                            │
│     Main Content Area      │
│     (full width)           │
│                            │
├────────────────────────────┤
│ [Sessions] [History] [More]│
└────────────────────────────┘
```

- **Bottom navigation:** Three tabs. "More" contains Privacy Center and Settings.
- **Full-screen session flow:** During an active session, the bottom nav hides. A back/progress indicator replaces it.
- **Cards stack vertically.** Evidence cards, verification details, and briefs all work as single-column layouts.

---

## 7. State Design

### 7.1 Loading States

| Context | Pattern |
|---------|---------|
| Initial page load | Full-page skeleton with content-shaped placeholders |
| Document upload | Progress bar + file preview thumbnail |
| Analysis in progress | Trust Path progress bar + step-by-step status messages + skeleton evidence cards |
| Brief generation | Document skeleton with section placeholders |

### 7.2 Empty States

| Context | Message | Action |
|---------|---------|--------|
| No sessions | "Start your first Care Session to understand a report, get guidance, or prepare for a doctor visit." | [Start Care Session] |
| No results yet | "Your analysis is being prepared." | Trust Path progress indicator |
| No history | "Your past sessions will appear here." | [Start Care Session] |

### 7.3 Error States

| Error | User Message | Recovery |
|-------|-------------|----------|
| Upload failed | "We couldn't process this file. Please try a different format." | [Try Again] [Paste Text Instead] |
| Bedrock timeout | "Analysis is taking longer than expected." | [Retry] [Contact Support] |
| Gemini unavailable | "Independent verification is temporarily unavailable. Your analysis from Amazon Bedrock is still available." | Show results without verification badges |
| Network error | "Connection lost. Your data is safe." | [Retry When Ready] |

### 7.4 Safety States

| Trigger | UI Response |
|---------|------------|
| Diagnosis request | Amber banner: "CareCue helps you understand health information but cannot diagnose conditions. Please consult a healthcare professional." |
| Emergency indicators | Red banner with emergency services guidance. Prominent. Cannot be dismissed easily. |
| Prescription request | Amber banner with redirect to "discuss with your doctor." |

---

## 8. Micro-Interactions

Purposeful, restrained animations — not decorative.

| Interaction | Animation |
|-------------|-----------|
| Trust Path step completion | Gentle fill + checkmark morph (200ms ease-out) |
| Privacy Gateway transformation | Left-to-right wipe revealing minimized content (400ms) |
| Evidence card entry | Staggered fade-up, 50ms offset per card |
| Verification status reveal | Badge scales from 0→1 with a subtle bounce (250ms) |
| Document upload success | File icon → checkmark morph |
| Error state entry | Gentle shake (not aggressive) + fade-in of message |
| Brief generation | Section-by-section fade-in (anticipatory reveal) |

---

## 9. Accessibility Requirements

| Requirement | Implementation |
|-------------|---------------|
| Color contrast | WCAG 2.2 AA minimum (4.5:1 for text, 3:1 for large text) |
| Color independence | Never use color alone. All statuses have icon + label + color. |
| Keyboard navigation | Full keyboard support. Visible focus rings. Logical tab order. |
| Screen reader | Semantic HTML. ARIA labels on interactive elements. Live regions for status updates. |
| Reduced motion | `prefers-reduced-motion` respected. All animations have instant alternatives. |
| Text scaling | UI functional at 200% zoom. No horizontal scrolling at standard breakpoints. |
| Touch targets | Minimum 44×44px on mobile. |
| Focus management | Focus moves logically during the session flow. Modal focus trapping. |

---

## 10. Content Guidelines

### Tone

- **Calm, not clinical.** Warm but professional. Not cold. Not casual.
- **Clear, not dumbed-down.** Explain without condescending. Use plain language but don't avoid technical terms — define them inline.
- **Helpful, not authoritative.** "This may indicate..." not "This means..."
- **Honest about limits.** "CareCue helps you prepare, not diagnose."

### Writing Patterns

| Do | Don't |
|----|-------|
| "This value is below the typical reference range." | "Your hemoglobin is dangerously low." |
| "Your doctor can help clarify what this means for you." | "You should get treated immediately." |
| "Both AI systems produced compatible interpretations." | "This result has been verified and is accurate." |
| "We've minimized identifying information before verification." | "Your data has been fully anonymized." |

---

## 11. Screen Inventory (MVP)

| # | Screen | Priority | Notes |
|---|--------|----------|-------|
| 1 | Landing page | P0 | First impression. Must be exceptional. |
| 2 | Session type selection | P0 | Three clear choices. |
| 3 | Document upload | P0 | Drag-and-drop, file picker, text paste. |
| 4 | Privacy Gateway | P0 | Signature differentiator. Must be visually clear. |
| 5 | Processing state | P0 | Trust Path progress. |
| 6 | Results / Insights | P0 | Evidence cards with verification. Core screen. |
| 7 | Evidence detail | P1 | Drill-down from an evidence card. |
| 8 | Doctor Visit Brief | P1 | Premium document. Printable. |
| 9 | History list | P1 | Past sessions. |
| 10 | Session detail | P2 | Re-view past results. |
| 11 | Care Guidance input | P1 | Text-based Q&A entry. |
| 12 | Care Guidance results | P1 | Structured response. |
| 13 | Privacy Center | P2 | Data transparency. |
| 14 | Settings | P2 | Minimal. |
| 15 | Error states | P0 | Graceful failures. |
| 16 | Empty states | P0 | First-run experience. |
| 17 | Loading / skeleton states | P0 | Trust Path progress. |
| 18 | Mobile navigation | P0 | Bottom nav. |
| 19 | Mobile results | P0 | Single-column evidence cards. |
| 20 | Dashboard | P2 | Optional session overview. |

---

## 12. Responsive Behavior

| Breakpoint | Layout |
|------------|--------|
| **≥1280px (Desktop)** | Sidebar nav + full content area. Privacy Gateway uses side-by-side comparison. Evidence cards in 1–2 column grid. |
| **768px–1279px (Tablet)** | Collapsed sidebar (icon-only). Privacy Gateway stacks vertically. Single-column evidence cards. |
| **<768px (Mobile)** | Bottom tab navigation. Full-width content. Stacked layouts throughout. Bottom sheet for evidence detail. |
