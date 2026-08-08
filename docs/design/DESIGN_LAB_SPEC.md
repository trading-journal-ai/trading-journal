# Next.js Design Lab — Functional Specification

> Status: Active · Last updated: 2026-08-08 · Implementation: Phase 1 complete

## Decision summary

Build the interactive design-development tooling inside the existing Next.js
application. Extend the dev-only `/design-system` surface first; do not attempt
to run the control system inside Paper.

The Design Lab will audition semantic tokens, component treatments, and realistic
component states against production React components. Paper remains the editable
layout and composition surface described in
[`PAPER_WORKFLOW.md`](PAPER_WORKFLOW.md).

## Implementation progress

Phase 1 is implemented on `feat/design-lab`:

- `/design-system?lab=1` activates the editor while `/design-system` remains the
  read-only living reference;
- the Lab can switch its base theme without writing the persisted theme;
- validated semantic-color overrides are scoped to the preview root;
- the panel exposes the full production token inventory, individual revert, and
  reset-all controls;
- the existing token, typography, primitive, and feature-module specimens remain
  the live preview surface;
- focused unit coverage protects token validation, filtering, merging, and color
  input normalization.

Component registration, preview-state controls, local snapshots, and exports
remain Phase 2 work.

## Problem

The current `/design-system` route is a reliable read-only reference: it renders
the live tokens and production components, so it cannot drift from code. It does
not yet support the exploratory loop needed for the next visual-system rollout:

- adjust a candidate palette without editing `globals.css` repeatedly;
- evaluate global changes across several real components;
- manipulate component-specific states and treatments;
- save and compare a coherent set of choices;
- hand an intentional token snapshot to code or Paper.

One-off prototype controls have proved the value of this loop, but their variables
mix theme decisions, component styling, application state, and temporary hex
overrides. The shared Lab needs to separate those scopes.

## Goals

1. Provide a safe, dev-only place to audition the emerging white, neutral,
   enterprise-leaning light direction.
2. Apply global semantic-token overrides to real production components.
3. Let each registered component expose only its meaningful design and preview
   controls.
4. Save, restore, reset, and export reproducible design snapshots.
5. Make token promotion explicit instead of accumulating component-specific
   one-offs in the global system.
6. Produce outputs the agent can intentionally apply to `globals.css` and Paper.

## Non-goals

- A production theme editor or end-user customization feature.
- Automatic writes to `globals.css`, component source, or Paper.
- A general-purpose visual page builder.
- Replacing Paper for structural layout exploration.
- Replacing Browser Tweaks for targeted Tailwind/class changes on rendered pages.
- Mirroring every route and application state.
- Adding a new shipped theme before the white direction is approved.

## Tool boundaries

| Tool | Owns |
| --- | --- |
| Next.js Design Lab | Live token experiments, component controls, preview states, reproducible snapshots |
| Paper | Editable component structure, page composition, and approved visual intent |
| Browser Tweaks | Targeted class-level adjustments against a running route |
| Production code | Shipped tokens, component contracts, behavior, accessibility, and data |

The Lab exports a proposal. An agent or developer reviews and translates that
proposal into production source; the Lab never silently crosses that boundary.

## Activation and safety

### MVP

- Keep `/design-system` unavailable in production, preserving its existing
  `NODE_ENV === "production"` 404 behavior.
- Activate editing with `/design-system?lab=1`.
- Without `lab=1`, `/design-system` remains the current read-only living
  reference.
- Apply experimental CSS variables to a preview-root element, not
  `document.documentElement`. Overrides must not change the saved application
  theme or leak beyond the Lab preview.
- Restore the preview root cleanly when a snapshot is reset or the Lab unmounts.

### Later

An opt-in `?lab=1` overlay may be added to a small allowlist of development
routes after the component registration and cleanup model is proven. Do not put
a global client provider in the application layout for the MVP.

## Information architecture

The Lab has one shared shell and a modular panel. The main area renders the
selected production component or specimen; the panel is divided by scope:

1. **Foundations** — base theme and global semantic-token overrides.
2. **Component** — treatment controls registered by the selected component.
3. **States** — data, interaction, authorization, empty/loading, and other
   preview-only conditions.
4. **Experiments** — temporary overrides, reset, named snapshots, and export.

Each control displays its scope. A user should be able to tell whether changing
it proposes a global token, affects only one component, or merely changes the
preview scenario.

## Control-scope model

### Global semantic tokens

These are candidate design-system decisions that can affect multiple components.
The first editable groups should come from the existing token inventory:

- surfaces: `--background`, `--surface`, `--surface-2`, `--panel`;
- structure: `--border`, `--hairline`;
- text: `--foreground`, `--body`, `--muted`, `--faint`;
- interaction: `--accent`, `--accent-strong`, `--action`,
  `--action-foreground`;
- trading and tag semantics, grouped separately so their meaning remains clear.

The active white direction begins as a named Lab snapshot based on the current
`light` theme. It is not added to `THEMES` and does not replace `daylight` until
the theme decision is approved.

### Component treatment controls

These affect one component's visual contract: density, orientation, selected
treatment, chip treatment, or another deliberate variant. They are not global
tokens by default.

If a component treatment survives review:

- promote it to an existing global token when it expresses a shared semantic
  role;
- introduce a narrowly named component token when the value is durable but
  truly component-specific;
- keep it as a component prop when it represents a supported variant.

### Preview-state controls

These demonstrate behavior and data. Examples include traded/not traded,
selected day, authorization state, empty state, and compact navigation on/off.
They never become design tokens.

### Temporary experiments

Raw hex inputs and percentage sliders are temporary overrides. Export must label
them as unresolved unless they map to an existing or proposed semantic token.
An experiment does not become a system value merely because it looks good once.

## Component registration

One registry powers the shared shell. Each specimen supplies defaults, controls,
supported states, and a renderer. The exact TypeScript may evolve, but the
contract should resemble:

```ts
type LabControlScope = "component" | "preview";

type LabControl =
  | { key: string; label: string; scope: LabControlScope; kind: "toggle" }
  | { key: string; label: string; scope: LabControlScope; kind: "select"; options: readonly string[] }
  | { key: string; label: string; scope: "component"; kind: "color"; token?: string }
  | { key: string; label: string; scope: "component"; kind: "range"; min: number; max: number; step: number };

type DesignLabSpec<Props extends Record<string, unknown>> = {
  id: string;
  label: string;
  description: string;
  defaults: Props;
  controls: readonly LabControl[];
  tokenNames: readonly string[];
  render: (props: Props) => React.ReactNode;
};
```

Requirements:

- Registry IDs are stable and unique.
- Defaults render a valid, representative state.
- Controls use typed keys; do not use `any` or arbitrary property mutation.
- Components own their fixtures and state descriptions near the registry entry.
- A new component should work with existing tokens first. New token proposals
  require a semantic name and rationale.
- Controls manipulate public props or an explicit preview adapter, never private
  component internals.

## MVP specimens

### 1. Calendar week strip

The first page-level harness because it exercises several state types at once.

- Preview: selected day, today, traded/not traded, account authorization, and
  representative populated/empty days.
- Component: compact rail on/off, selection treatment, chip treatment, and
  density where those are intentional variants.
- Global: surface, hover/selected candidates, text hierarchy, borders, accent,
  and semantic P&L colors.

If the current page implementation cannot be mounted independently, extract the
smallest reusable week-strip component or create a thin preview adapter. Do not
copy the visual markup into the Lab.

### 2. Metric strip

- Preview: positive, negative, neutral, and longer-value scenarios.
- Component: stacked/single-row variant only if both remain supported contracts;
  otherwise compare them as separate candidates before promotion.
- Global: metric typography, muted text, spacing, and semantic P&L color.

### 3. Trade-review tags

- Preview: reinforcing, review, neutral pattern, settled emotion, and activated
  emotion states using the canonical taxonomy.
- Component: density and icon-size experiments if needed.
- Global: tag semantic colors and foreground contrast.

## Snapshot model

Persist local experiments under a versioned key such as
`trading-journal:design-lab:v1`. A snapshot should contain only serializable,
validated values:

```ts
type DesignLabSnapshot = {
  version: 1;
  name: string;
  baseTheme: "dark" | "light" | "daylight" | "evening";
  globalTokens: Record<string, string>;
  specimenId: string;
  componentValues: Record<string, string | number | boolean>;
  previewValues: Record<string, string | number | boolean>;
  createdAt: string;
};
```

- Save to local storage only for the MVP.
- Validate imported snapshots and reject unknown versions, token names, control
  keys, and malformed values.
- Reset restores the chosen base theme plus the specimen defaults.
- Loading a snapshot must not change the application's persisted theme.
- Snapshots do not contain private trading data.

## Export contract

The MVP exports two representations:

1. **CSS variables** — only token overrides that differ from the base theme,
   formatted for review and later placement in the correct theme block.
2. **JSON snapshot** — the complete reproducible Lab state, including component
   and preview controls.

Export requirements:

- Include snapshot name, base theme, and generation timestamp.
- Separate existing token overrides from unresolved experiments and proposed
  tokens.
- Never write source files automatically.
- Do not export preview-state controls as CSS.
- Provide Copy and Download actions with clear success/failure feedback.

## Paper handoff

The Next.js Lab is the interactive engine; Paper receives selected outcomes.

1. Save and export a named candidate snapshot.
2. Review which changes are global tokens, component treatments, or preview-only.
3. Apply approved token overrides to the relevant Paper file through its theme
   workflow or MCP.
4. Transfer the rendered component to Paper as an editable snapshot when useful,
   then continue structural composition there.
5. Keep the Paper artboard status aligned with the workflow: Lab experiments map
   to **Explore**; a reviewed snapshot may become **Candidate**.

Paper is not expected to execute the Lab's React state or JavaScript controls.

## Functional requirements

- **FR-1:** `/design-system?lab=1` enables the editor only outside production.
- **FR-2:** The user can choose a base theme without changing the application's
  persisted theme.
- **FR-3:** The user can override supported semantic tokens and see every visible
  registered specimen update immediately.
- **FR-4:** The user can select a registered specimen and see only its declared
  Component and State controls.
- **FR-5:** Invalid colors, ranges, snapshot values, and unknown control keys are
  rejected with a useful message.
- **FR-6:** Reset returns to the base theme and registry defaults.
- **FR-7:** Named snapshots survive a reload locally and can be loaded or deleted.
- **FR-8:** CSS and JSON exports reproduce the current supported state.
- **FR-9:** Unmounting or leaving Lab mode removes all preview overrides.
- **FR-10:** Read-only `/design-system` behavior remains unchanged without
  `lab=1`.

## UX and accessibility requirements

- Use a docked right panel on wide screens and a dismissible drawer on narrow
  screens; the preview must remain usable while editing.
- Group controls by scope and use human labels while also exposing the underlying
  token name where relevant.
- Support keyboard operation, visible focus, programmatic labels, and correct
  selected/expanded states.
- Color controls show both a picker and validated text value.
- Never communicate semantic state through color alone in previews.
- Show unsaved changes, the active snapshot name, and the current base theme.
- Reset and delete actions require clear targeting; resetting the current draft
  must not delete saved snapshots.

## Suggested implementation shape

No new dependency is required for the MVP.

```text
src/components/design-lab/
  DesignLab.tsx
  DesignLabPanel.tsx
  DesignLabPreview.tsx
  controls/
  specimens/
src/lib/designLab.ts
src/lib/designLabSnapshot.ts
```

Extend `DesignSystemBrowser` to enter Lab mode and reuse the existing token
metadata from `src/lib/designSystem.ts`. Keep serialization, validation, and
token-diff logic in small pure functions.

## Validation

- Unit-test snapshot validation, serialization, token diffing, and reset logic.
- Type-check every registry entry against its specimen props.
- Verify read-only and Lab modes in the browser.
- Verify keyboard access and focus behavior for the panel and drawers.
- Verify overrides do not persist after leaving Lab mode and do not change the
  stored application theme.
- Verify production still returns 404 for `/design-system`, with or without the
  query flag.

## Acceptance criteria

The MVP is complete when:

1. `/design-system?lab=1` opens a dev-only editor without changing the read-only
   route or saved application theme.
2. A user can adjust the core white-theme semantic tokens and see the three MVP
   specimens respond live.
3. Each specimen exposes meaningful typed component and preview controls without
   leaking those controls into the global token set.
4. Reset, save, load, delete, CSS export, and JSON export work predictably.
5. A saved snapshot can be reproduced after reload and reviewed for promotion to
   code or Paper.
6. Leaving Lab mode removes every experimental override.

## Delivery phases

### Phase 1 — Lab foundation

Add the dev-only mode, scoped token overrides, panel shell, validation, reset,
and the existing design-system specimens.

### Phase 2 — Component registry and snapshots

Register the Calendar week strip, Metric strip, and Tags; add component/state
controls, local snapshots, and CSS/JSON export.

### Phase 3 — Workflow expansion

After the MVP is accepted, consider allowlisted route overlays, side-by-side
snapshot comparison, Paper-oriented export helpers, and additional components.

## Open decisions

- Whether the approved white direction replaces `light`, replaces `daylight`,
  or becomes the default while both existing themes remain available.
- Whether stacked and single-row metric strips are both supported variants or
  competing candidates.
- Whether route-level Lab overlays provide enough value after component harnesses
  are working.
- Whether approved snapshots should eventually be committed as fixtures; MVP
  snapshots remain local and uncommitted.
