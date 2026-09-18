# CareCue — Implementation Plan

> Build smart. Ship the Trust Path first. UI is not polish — it's the product.

---

## 1. Implementation Philosophy

### Non-Negotiable Rules

1. **UI is a P0 feature, not a final step.** Every component is built to design-system spec from the start.
2. **End-to-end first.** A working pipeline (upload → analysis → results) matters more than a feature-complete product.
3. **Real AWS from day one.** No mocked services that need to be "swapped in later."
4. **Design system before pages.** Tokens and base components are built first.
5. **No premature optimization.** Ship the happy path. Handle edge cases after.

---

## 2. Tech Stack (Confirmed)

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18+ | UI framework |
| TypeScript | 5+ | Type safety |
| Vite | 5+ | Build tool, dev server |
| Tailwind CSS | 3.x | Utility-first styling |
| shadcn/ui | Latest | Base component library |
| Radix UI | Latest | Accessible primitives |
| Lucide React | Latest | Icon system |
| Framer Motion | 11+ | Animation |
| React Router | 6+ | Client-side routing |
| Zod | 3+ | Runtime validation |
| React Query (TanStack) | 5+ | Server state management |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 20.x | Lambda runtime |
| TypeScript | 5+ | Type safety |
| AWS SDK v3 | Latest | AWS service clients |
| @google/generative-ai | Latest | Gemini API client |
| pdf-parse | Latest | PDF text extraction |
| Zod | 3+ | Input validation |
| uuid | Latest | Session ID generation |

### Infrastructure

| Technology | Purpose |
|-----------|---------|
| AWS SAM | Infrastructure as Code |
| AWS CLI | Deployment |
| GitHub | Source control |

---

## 3. Project Structure

```
carecue/
├── frontend/                   # React SPA
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/            # shadcn/ui components (themed)
│   │   │   ├── composed/      # CareCue-specific components
│   │   │   └── layout/        # App shell, nav, content areas
│   │   ├── pages/             # Route-level page components
│   │   ├── lib/
│   │   │   ├── api/           # API client (fetch wrappers)
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   ├── utils/         # Utilities
│   │   │   └── types/         # TypeScript types
│   │   ├── styles/
│   │   │   └── globals.css    # CSS variables, Tailwind base
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                    # Lambda functions
│   ├── functions/
│   │   ├── session-handler/
│   │   │   └── index.ts
│   │   ├── upload-handler/
│   │   │   └── index.ts
│   │   ├── analyze-handler/
│   │   │   ├── index.ts
│   │   │   ├── privacy-gateway.ts
│   │   │   ├── bedrock-client.ts
│   │   │   └── gemini-client.ts
│   │   ├── guidance-handler/
│   │   │   └── index.ts
│   │   └── brief-handler/
│   │       └── index.ts
│   ├── shared/
│   │   ├── types.ts
│   │   ├── validators.ts
│   │   ├── logger.ts
│   │   └── constants.ts
│   ├── tsconfig.json
│   └── package.json
│
├── infrastructure/             # AWS SAM
│   ├── template.yaml
│   └── samconfig.toml
│
├── docs/                       # This documentation
│   ├── product-spec.md
│   ├── ux-flow.md
│   ├── design-system.md
│   ├── aws-architecture.md
│   ├── security-plan.md
│   ├── implementation-plan.md
│   └── demo-plan.md
│
├── demo/                       # Demo assets
│   └── sample-reports/         # Synthetic medical documents
│
└── README.md
```

---

## 4. Implementation Phases

### Phase 0: Foundation (Day 1, First Half)

**Goal:** Development environment ready. Design system in code. AWS infrastructure deployed.

| Task | Time | Output |
|------|------|--------|
| Initialize Vite + React + TypeScript project | 15 min | Working dev server |
| Install and configure Tailwind CSS | 10 min | Tailwind operational |
| Install shadcn/ui, Radix, Lucide, Framer Motion | 15 min | Dependencies ready |
| Create `globals.css` with all CSS variables (color, typography, spacing) | 30 min | Design tokens in code |
| Configure `tailwind.config.ts` to map CSS variables | 15 min | Tailwind uses design tokens |
| Install initial shadcn/ui components (Button, Card, Badge, Input, Dialog, Toast, Skeleton, Tabs, Progress, Sheet, Separator, Tooltip) | 20 min | Base components themed |
| Create layout components (AppShell, PageHeader, ContentArea, SidebarNav, BottomNav) | 45 min | App skeleton |
| Set up React Router with route structure | 15 min | Navigation working |
| Set up React Query | 10 min | Data fetching ready |
| Deploy AWS infrastructure via SAM (S3, DynamoDB, Lambda stubs, API Gateway) | 45 min | AWS services live |
| Store Gemini API key in Secrets Manager | 5 min | Secret stored |
| Enable Bedrock model access | 5 min | Bedrock available |

**Phase 0 Total: ~3.5 hours**

---

### Phase 1: Trust Path Core (Day 1, Second Half)

**Goal:** The signature end-to-end flow works: upload → Privacy Gateway → Bedrock → results.

| Task | Time | Output |
|------|------|--------|
| Build TrustPath component (step indicator) | 45 min | Animated progress component |
| Build FileUpload component (drag-and-drop) | 30 min | Working upload UI |
| Build upload-handler Lambda (validate + S3) | 30 min | Files reach S3 |
| Build PrivacyGateway component (before/after view) | 60 min | Split-panel with highlights |
| Build privacy-gateway.ts (server-side PII scanning) | 45 min | PII detection working |
| Build bedrock-client.ts (Bedrock invocation) | 45 min | Bedrock analysis returns |
| Build analyze-handler Lambda (extract → privacy → Bedrock) | 60 min | End-to-end analysis |
| Build EvidenceCard component | 45 min | Cards render results |
| Build Results page (summary + evidence cards) | 45 min | Results displayed |
| Build ProcessingStatus component | 30 min | Live progress during analysis |
| Wire frontend API calls (upload → analyze → results) | 30 min | Full flow connected |
| Create synthetic sample report (blood panel PDF) | 20 min | Demo data ready |

**Phase 1 Total: ~7.5 hours**

**End of Day 1: The core flow works — upload a report, see it processed, view results with source evidence.**

---

### Phase 2: Dual-AI & Verification (Day 2, First Half)

**Goal:** Gemini cross-check works. Verification status is visible on evidence cards.

| Task | Time | Output |
|------|------|--------|
| Build gemini-client.ts (Gemini API call via Secrets Manager) | 45 min | Gemini returns verification |
| Extend analyze-handler with Gemini verification step | 30 min | Dual-AI pipeline complete |
| Build VerificationBadge component (Consistent/Review/Safety) | 30 min | Status badges render |
| Build DualAIComparison component | 45 min | Side-by-side AI view |
| Build EvidenceDetail component (drill-down modal/sheet) | 45 min | Full evidence exploration |
| Update Results page with verification statuses | 20 min | Badges appear on cards |
| Graceful degradation when Gemini is unavailable | 15 min | Results still work |

**Phase 2 Total: ~3.5 hours**

---

### Phase 3: Doctor Brief & Session Management (Day 2, Second Half)

**Goal:** Doctor Visit Brief generates. Sessions are listed and deletable.

| Task | Time | Output |
|------|------|--------|
| Build DoctorBrief component (premium document layout) | 60 min | Beautiful, printable brief |
| Build brief-handler Lambda | 30 min | Brief generation API |
| Add brief download (JSON → formatted view → print CSS) | 30 min | Downloadable/printable |
| Build session-handler Lambda (CRUD) | 30 min | Session API working |
| Build History page (session list) | 30 min | Past sessions listed |
| Build SessionCard component | 20 min | Session list items |
| Build session deletion flow (confirm → delete → cleanup) | 20 min | Deletion working |

**Phase 3 Total: ~3.5 hours**

---

### Phase 4: Landing & Polish (Day 2, Evening / Day 3)

**Goal:** Landing page is exceptional. Care Guidance works. All states are handled.

| Task | Time | Output |
|------|------|--------|
| Build Landing page (hero, Trust Path, feature cards, CTA) | 90 min | Stunning first impression |
| Build SessionTypeSelection page (three options) | 30 min | Clean type picker |
| Build Care Guidance flow (text input → results) | 60 min | Q&A flow works |
| Build guidance-handler Lambda | 30 min | Guidance API ready |
| Build empty states (no sessions, no results) | 20 min | Friendly empty states |
| Build error states (upload failure, API error, timeout) | 30 min | Graceful error handling |
| Build SafetyBanner component | 15 min | Disclaimer banners |
| Mobile responsive pass (all pages) | 60 min | Mobile works well |
| Add Framer Motion animations (card entry, Trust Path, Privacy Gateway) | 45 min | Subtle, purposeful animations |
| Accessibility pass (focus rings, ARIA labels, keyboard nav) | 30 min | Accessible |
| Print stylesheet for Doctor Brief | 15 min | Prints cleanly |

**Phase 4 Total: ~7 hours**

---

### Phase 5: Demo Prep (Day 3, Final)

**Goal:** Demo is bulletproof. All flows work. Fallbacks in place.

| Task | Time | Output |
|------|------|--------|
| Create 2 additional synthetic sample reports | 30 min | Multiple demo scenarios |
| Full end-to-end test (upload → results → brief) × 3 | 30 min | Verified working |
| Test Gemini fallback (disable key, verify graceful degradation) | 15 min | Degradation works |
| Test mobile flow end-to-end | 15 min | Mobile verified |
| Screenshot / record demo walkthrough | 15 min | Demo assets ready |
| Fix any discovered bugs | 60 min | Buffer time |
| Final deploy to Amplify | 15 min | Production live |

**Phase 5 Total: ~3 hours**

---

## 5. Total Time Budget

| Phase | Duration | Cumulative |
|-------|----------|-----------|
| Phase 0: Foundation | 3.5 h | 3.5 h |
| Phase 1: Trust Path Core | 7.5 h | 11 h |
| Phase 2: Dual-AI & Verification | 3.5 h | 14.5 h |
| Phase 3: Doctor Brief & Sessions | 3.5 h | 18 h |
| Phase 4: Landing & Polish | 7 h | 25 h |
| Phase 5: Demo Prep | 3 h | 28 h |
| **Buffer** | **4 h** | **32 h** |
| **Total** | | **~32 hours** |

---

## 6. Build Order (Component Dependency Graph)

```
globals.css (design tokens)
  ↓
tailwind.config.ts
  ↓
shadcn/ui components (themed)
  ↓
Layout components (AppShell, Nav)
  ↓
TrustPath component ←──────────────── Signature UI
  ↓
FileUpload component
  ↓
PrivacyGateway component ←─────────── Signature UI
  ↓
EvidenceCard component ←────────────── Signature UI
  ↓
VerificationBadge component
  ↓
Results page
  ↓
DualAIComparison component
  ↓
EvidenceDetail component
  ↓
DoctorBrief component ←────────────── Signature UI
  ↓
Processing status component
  ↓
Landing page
  ↓
History page
  ↓
Care Guidance flow
  ↓
States (empty, error, loading)
```

---

## 7. API Contract

### POST /sessions

```typescript
// Request
{ type: 'report' | 'guidance' | 'brief' }

// Response
{ sessionId: string, createdAt: string, status: 'created' }
```

### POST /sessions/{id}/upload

```typescript
// Request: multipart/form-data
{ file: File, notes?: string }

// Response
{ uploadId: string, fileName: string, status: 'uploaded' }
```

### POST /sessions/{id}/analyze

```typescript
// Request
{ options?: { includeVerification: boolean } }

// Response
{
  sessionId: string,
  status: 'complete' | 'partial',  // partial if Gemini unavailable
  summary: {
    totalInsights: number,
    consistent: number,
    needsReview: number,
    safetyRedirects: number
  },
  insights: Array<{
    id: string,
    category: string,        // e.g., "Hematology", "Lipid Panel"
    claim: string,           // Plain-language insight
    value: string,           // Extracted value
    unit: string,            // e.g., "g/dL"
    referenceRange: string,  // e.g., "12.0–17.5"
    status: 'within_range' | 'outside_range' | 'no_range',
    source: {
      text: string,          // Original source text
      page: number,
      section: string
    },
    verification: {
      status: 'consistent' | 'needs_review' | 'safety_redirect',
      bedrockInterpretation: string,
      geminiAssessment: string,
      reasoning: string
    }
  }>,
  privacyGateway: {
    fieldsDetected: number,
    fieldsMinimized: number,
    categories: string[]     // e.g., ["name", "dob", "phone"]
  },
  disclaimer: string
}
```

### POST /sessions/{id}/brief

```typescript
// Request
{ userNotes?: string, selectedInsightIds?: string[] }

// Response
{
  brief: {
    sessionDate: string,
    documentSummary: string,
    keyFindings: Array<{
      finding: string,
      value: string,
      range: string,
      verificationStatus: string,
      discussWithDoctor: boolean
    }>,
    discussionItems: string[],
    userNotes: string,
    disclaimer: string
  },
  downloadUrl: string  // Presigned S3 URL
}
```

### GET /sessions

```typescript
// Response
{
  sessions: Array<{
    sessionId: string,
    type: string,
    createdAt: string,
    documentName: string,
    insightCount: number,
    status: string
  }>
}
```

### DELETE /sessions/{id}

```typescript
// Response
{ deleted: true }
```

### POST /care-guidance

```typescript
// Request
{ question: string, context?: string }

// Response
{
  response: {
    answer: string,
    evidencePoints: Array<{
      claim: string,
      source: string,
      verification: { status: string, reasoning: string }
    }>,
    relatedQuestions: string[],
    safetyNote: string | null,
    disclaimer: string
  }
}
```

---

## 8. Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **SPA vs SSR** | SPA (Vite) | Simpler deployment via Amplify. No SSR complexity for hackathon. |
| **State management** | React Query + useState | No Redux/Zustand needed. Server state via React Query; minimal client state. |
| **Styling** | Tailwind + CSS Variables | Design tokens as CSS vars, consumed by Tailwind. Best of both worlds. |
| **API client** | Fetch + thin wrapper | No Axios needed. Fetch + typed wrapper is sufficient. |
| **PDF parsing** | pdf-parse (Lambda) | Pure JS, works in Lambda without native dependencies. |
| **Backend language** | TypeScript (ESM) | Shared types between frontend and backend. |
| **IaC** | AWS SAM | Simpler than CDK for this scope. Native Lambda + API Gateway support. |
| **Routing** | React Router v6 | Simple, widely-used, supports nested layouts. |
| **Form handling** | Controlled components + Zod | No form library needed. Zod validates on both client and server. |

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Bedrock model access delay** | Medium | High | Request access immediately. Have a fallback model (Titan) ready. |
| **Gemini rate limiting** | Low | Medium | Graceful degradation: show results without verification. Cache verification for demo. |
| **PDF parsing failures** | Medium | Medium | Support text-paste as alternative. Use simple, clean synthetic PDFs for demo. |
| **Lambda cold starts slow the demo** | Medium | Medium | Pre-warm Lambdas before demo. Keep function sizes small. |
| **Design system takes too long** | Low | High | Use shadcn/ui defaults aggressively. Customize only colors, radius, and typography. |
| **CORS issues** | Medium | Low | Test CORS early. API Gateway CORS config is well-documented. |
| **Amplify build failures** | Low | Medium | Test deployment early. Keep build simple (standard Vite). |
| **Scope creep** | High | High | Enforce P0/P1/P2 priorities ruthlessly. No P2 before all P0s are done. |

---

## 10. Hackathon Shortcuts (Intentional Compromises)

| Shortcut | What We Skip | Why It's OK |
|----------|-------------|-------------|
| No auth | Cognito integration | Demo doesn't need login. API key is sufficient. |
| Scan-based history | DynamoDB Scan instead of GSI query | < 100 items during hackathon. Scan is fine. |
| No image OCR | Photos of documents won't work | PDF text extraction + paste covers demo needs. |
| Simple PII regex | No NLP-based NER | Pattern matching catches most common PII formats. Honest about limitations. |
| No dark mode | Light theme only | Design system defines dark tokens but we don't implement them. |
| In-memory caching | Gemini key cached in Lambda memory | No external cache needed at this scale. |
| No CI/CD | Manual deploy | `sam deploy` + Amplify auto-deploy from GitHub is sufficient. |
| Client-side brief rendering | No server-side PDF generation | HTML/CSS + print stylesheet is faster to build than PDF generation. |

---

## 11. Definition of Done (Per Feature)

A feature is "done" when:

- [ ] It renders correctly on desktop (≥1280px) and mobile (<768px)
- [ ] It uses design system tokens (no hardcoded colors, spacing, or fonts)
- [ ] It handles loading, error, and empty states
- [ ] It is keyboard-navigable with visible focus indicators
- [ ] It includes appropriate disclaimers (for AI-generated content)
- [ ] It works with the real AWS backend (not mocked)
- [ ] It looks like it belongs in the "Best UI" category
