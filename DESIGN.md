---
name: TaskScheduler React
description: Sharp, minimalist operational workspace for internal task scheduling and execution.
colors:
  paper-field: "oklch(97.6% 0.004 225)"
  panel-plane: "oklch(99% 0.002 225)"
  grid-line: "oklch(87.8% 0.006 225)"
  grid-line-strong: "oklch(78.6% 0.008 225)"
  ink-strong: "oklch(24.8% 0.014 232)"
  ink-base: "oklch(34.6% 0.014 232)"
  ink-muted: "oklch(55.2% 0.012 232)"
  command-blue: "oklch(42.6% 0.075 220)"
  confirm-green: "oklch(42.5% 0.075 154)"
  fault-red: "oklch(46.8% 0.105 28)"
typography:
  ui:
    fontFamily: "\"Segoe UI Variable Text\", \"Segoe UI\", system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  strong:
    fontFamily: "\"Segoe UI Variable Text\", \"Segoe UI\", system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "13px"
    fontWeight: 650
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "\"Segoe UI Variable Text\", \"Segoe UI\", system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "normal"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  none: "0px"
  control: "2px"
  panel: "4px"
spacing:
  grid: "8px"
  gap: "16px"
  block: "24px"
  section: "32px"
  page: "40px"
components:
  button-primary:
    backgroundColor: "{colors.command-blue}"
    textColor: "{colors.panel-plane}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "32px"
  button-secondary:
    backgroundColor: "{colors.panel-plane}"
    textColor: "{colors.ink-base}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "32px"
  nav-link-active:
    backgroundColor: "transparent"
    textColor: "{colors.command-blue}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "32px"
  status-text-success:
    textColor: "{colors.confirm-green}"
    fontWeight: 650
  status-text-danger:
    textColor: "{colors.fault-red}"
    fontWeight: 650
  panel-shell:
    backgroundColor: "{colors.panel-plane}"
    textColor: "{colors.ink-strong}"
    rounded: "{rounded.panel}"
    padding: "24px"
---

# Design System: TaskScheduler React

## 1. Overview

**Creative North Star: "Modern Sharp Minimal Operations"**

TaskScheduler React is a sharp minimalist control surface for internal operators. The interface should feel precise, expensive, and professional because every element is aligned, necessary, and quiet. Shape, spacing, and grid discipline are the design language. Decoration is not.

The product must look like a serious GitHub-grade admin tool: direct, structured, text-led, and predictable. Use generous white space, strict alignment, square geometry, small typography, and restrained color. The system should help operators read tasks, schedules, steps, and logs with no visual clutter between them and the work.

The previous soft operational style is replaced. No hero sections, note blocks, badges, shadows, hover animation, decorative gradients, or rounded icon language. Components should be flatter, sharper, smaller, quieter, and easier to scan.

**Key Characteristics:**
- Modern Sharp Minimal: simple surfaces with precise geometric edges.
- Strict grid system: all layout, spacing, controls, and panels align to an 8px grid.
- Small unified typography: 13px everywhere, with hierarchy created by weight, spacing, alignment, and position.
- Generous white space: more room between groups, less decoration inside groups.
- Text-led status: state is shown as concise text, not badges or noisy markers.

## 2. Colors

The palette is restrained and nearly neutral. Color is used only for primary commands and semantic status text. Surfaces stay pale, clean, and matte.

### Base Neutrals
- **Paper Field** (`oklch(97.6% 0.004 225)`): page background. Use it as the quiet field around the grid.
- **Panel Plane** (`oklch(99% 0.002 225)`): panels, forms, tables, and control surfaces.
- **Grid Line** (`oklch(87.8% 0.006 225)`): default 1px separator and border.
- **Grid Line Strong** (`oklch(78.6% 0.008 225)`): active table row edges, focused boundaries, and major dividers.
- **Ink Strong** (`oklch(24.8% 0.014 232)`): primary content, task names, selected navigation, and table values.
- **Ink Base** (`oklch(34.6% 0.014 232)`): standard text.
- **Ink Muted** (`oklch(55.2% 0.012 232)`): secondary metadata and helper labels.

### Action And Status
- **Command Blue** (`oklch(42.6% 0.075 220)`): primary actions, selected navigation text, focused control outlines, and links.
- **Confirm Green** (`oklch(42.5% 0.075 154)`): successful or enabled status text only.
- **Fault Red** (`oklch(46.8% 0.105 28)`): failed, disabled, destructive, or disconnected status text only.

### Named Rules
**The No Gradient Rule.** Do not use gradients anywhere: backgrounds, buttons, text, panels, overlays, or decorative accents.

**The No Badge Rule.** Do not use badges, pills, dots, decorative markers, status chips, counters, or attention marks. State must be text-led and table-led.

**The Color Budget Rule.** At least 90% of every screen must be neutral. Accent color is reserved for command, selection, focus, and semantic text.

## 3. Typography

**UI Font:** Segoe UI Variable Text, Segoe UI, system-ui, -apple-system, BlinkMacSystemFont, sans-serif
**Mono Font:** ui-monospace, SFMono-Regular, Consolas, Liberation Mono, monospace

All UI text uses the same small size: `13px`. Do not scale headings up for drama. Hierarchy comes from weight, position, alignment, whitespace, borders, and table structure.

### Type Roles
- **UI** (`400`, `13px`, `1.5`): default interface text, descriptions, rows, form values, and navigation.
- **Strong** (`650`, `13px`, `1.5`): page titles, selected items, table headers, primary values, and section names.
- **Label** (`600`, `13px`, `1.5`): form labels, compact metadata, and field captions.
- **Mono** (`400`, `13px`, `1.5`): logs, payloads, URLs, headers, and machine-shaped values.

### Named Rules
**The One Size Rule.** All text stays at `13px`. Do not create large hero typography, oversized counters, marketing headlines, or decorative display text.

**The Copy Discipline Rule.** Remove explanatory text unless it prevents operator error. Do not add notes, helper paragraphs, redundant captions, welcome copy, or repeated headings.

## 4. Elevation

There is no elevation system. TaskScheduler React is flat by rule. Depth is created only by grid placement, separators, and whitespace.

### Named Rules
**The No Shadow Rule.** Do not use `box-shadow`, glow, drop shadow, inner shadow, blurred glass, or simulated depth.

**The Border Discipline Rule.** Use only 1px borders and separators. Avoid double borders, nested card borders, and decorative side stripes.

## 5. Components

### Grid System
Every visible object must align to the grid.

- **Base Unit:** `8px`.
- **Control Height:** `32px`.
- **Primary Gap:** `16px`.
- **Group Spacing:** `24px`.
- **Section Spacing:** `32px`.
- **Page Padding:** `40px` on desktop, reduced only at small breakpoints.
- **Rule:** sibling panels use equal gaps. Mixed spacing requires a structural reason.

### Buttons
Buttons are small rectangular commands.

- **Height:** `32px`.
- **Radius:** `2px` maximum.
- **Padding:** `0 12px`.
- **Primary:** Command Blue background, Panel Plane text, 1px Command Blue border.
- **Secondary:** Panel Plane background, Ink Base text, 1px Grid Line border.
- **Hover:** color may change instantly. No movement, scaling, fading, easing, or animated transition.

### Status Text
Status is text, not a badge.

- **Success:** Confirm Green text with `650` weight.
- **Failure:** Fault Red text with `650` weight.
- **Neutral:** Ink Muted text with `400` or `600` weight.
- **Placement:** status belongs in table columns, form rows, or compact metadata fields.
- **Forbidden:** pills, chips, dots, counters, alert icons, decorative markers, and boxed labels.

### Panels And Tables
Panels are flat working planes.

- **Radius:** `4px` maximum for panels, `2px` maximum for controls, `0px` allowed and preferred for tables.
- **Background:** Panel Plane.
- **Border:** 1px Grid Line.
- **Padding:** `24px`, aligned to the 8px grid.
- **Shadow:** prohibited.
- **Nested Cards:** prohibited. Use sections, rows, separators, and tables instead.

Tables are the primary information surface. Favor table columns, row grouping, and inline actions over card lists.

### Inputs And Forms
Forms stay compact and exact.

- **Height:** `32px` for simple controls.
- **Radius:** `2px` maximum.
- **Labels:** always `13px`, same line rhythm as the rest of the UI.
- **Spacing:** form rows align to the 8px grid and use consistent vertical rhythm.
- **Help Text:** avoid unless it prevents a destructive or ambiguous action.

### Navigation
Navigation is geometric, quiet, and low decoration.

- **Desktop:** left navigation may remain, but it must be slim and grid-aligned.
- **Active State:** Command Blue text and a 1px boundary or underline. No filled pill, no badge, no icon flourish.
- **Hover:** instant text or border color change only. No movement or animation.
- **Copy:** one or two words per item where possible.

### Icons
Icons must be geometric.

- Use straight-line or angular icons when an icon is necessary.
- Prefer icons with square, bracket, grid, chevron, slash, corner, or line-based geometry.
- Avoid soft circular icons, rounded decorative pictograms, bubbly symbols, and cute metaphors.
- Never use icons to decorate a heading or empty space.

## 6. Do's and Don'ts

### Do:
- **Do** use an 8px grid and keep spacing mathematically consistent.
- **Do** keep all typography at `13px` and create hierarchy through weight and spacing.
- **Do** use generous white space around panels and dense precision inside tables.
- **Do** use neutral planes, 1px grid lines, and sharp low-radius geometry.
- **Do** make every visible word, border, and action earn its place.
- **Do** use geometric icons only when they improve recognition.

### Don't:
- **Don't** create hero sections.
- **Don't** create note blocks, callouts, tips, or explanatory filler panels.
- **Don't** use badges, chips, dots, counters, or attention markers.
- **Don't** use shadows, glow, blur, or glass effects.
- **Don't** use hover animation, movement, scaling, fading, or animated transitions.
- **Don't** use decorative gradients anywhere.
- **Don't** use large border radius, pill buttons, pill navigation, or soft rounded cards.
- **Don't** add unnecessary text or repeated labels.
- **Don't** use icons with rounded, cute, soft, or highly curved shapes.
