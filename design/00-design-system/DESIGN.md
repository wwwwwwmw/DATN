---
name: Clinical Precision
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#434653'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#737784'
  outline-variant: '#c3c6d5'
  surface-tint: '#1d59c1'
  primary: '#003c90'
  on-primary: '#ffffff'
  primary-container: '#0f52ba'
  on-primary-container: '#bcceff'
  inverse-primary: '#b0c6ff'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#840f00'
  on-tertiary: '#ffffff'
  tertiary-container: '#af1700'
  on-tertiary-container: '#ffc0b3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d9e2ff'
  primary-fixed-dim: '#b0c6ff'
  on-primary-fixed: '#001945'
  on-primary-fixed-variant: '#00419c'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#ffdad3'
  tertiary-fixed-dim: '#ffb4a6'
  on-tertiary-fixed: '#3f0300'
  on-tertiary-fixed-variant: '#8f1100'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.25rem
  margin: 1rem
  margin-desktop: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system establishes an authoritative, high-density clinical environment tailored for physicians, nurses, health informatics teams, and telehealth specialists. It communicates total diagnostic reliability, cognitive calm under pressure, and systematic speed.

The design movement merges **Corporate / Modern enterprise utility** with **Clinical Precision Minimalism**:
- **Zero Ambiguity:** Visual noise, excessive ornamentation, and whimsical animations are eliminated. Visual hierarchy is strictly driven by structured typography, categorical borders, and semantic triage coding.
- **Cognitive Ergonomics:** High visual acuity interfaces configured for extended 12-hour hospital shifts, surgical theater displays, and rapid telehealth triage consultations.
- **Diagnostic Rigor:** Visual components emphasize structured tabular records, longitudinal timeline traces, instant patient vitals status, and unequivocal clinical indicators.

## Colors

The color palette centers on reliable medical navy, clinical neutrals, and deterministic triage alerts:

- **Primary (`#0F52BA` - Sapphire / Navy Clinical):** Anchors primary commands, focused navigation items, patient chart record highlights, and active telemetry selection.
- **Secondary (`#0D9488` - Deep Teal):** Distinguishes telehealth interactions, live video states, care-team communications, and secondary diagnostic telemetry.
- **Tertiary / Emergency (`#D9381E` - Clinical Red):** Dedicated exclusively to immediate risk thresholds (>50% risk triage), severe allergies, critical lab values, and emergency alerts.
- **Neutral (`#1E293B` - Deep Slate):** High-contrast textual information and crisp categorical headers ensuring strict WCAG AAA legibility against clinical canvas surfaces.
- **Canvas & Surface Palette:**
  - Base Clinical Canvas: `#F4F7F9`
  - High-Density Card & Table Surface: `#FFFFFF`
  - Subtle Muted Layer: `#EDF2F7`
  - Structural Dividing Borders: `#E2E8F0`
- **Clinical Semantic Roles:**
  - *Emergency / High Risk:* `#D9381E` text with `#FEE2E2` background and `#FCA5A5` border.
  - *Normal / Optimal Stability:* `#16A34A` text with `#DCFCE7` background and `#86EFAC` border.
  - *Warning / Clinical Review Required:* `#D97706` text with `#FEF3C7` background and `#FCD34D` border.
  - *Neutral Observation / Pending:* `#475569` text with `#F1F5F9` background and `#CBD5E1` border.

## Typography

Typography prioritizes high data density, tabular number alignment, and instantaneous reading accuracy under high stress. **Inter** is deployed universally across displays for its optical clarity, neutral counters, and tall x-height.

- **Tabular Figures:** All numeric fields (dosage metrics, blood pressure, heart rate, lab percentiles, timestamps) must use CSS OpenType feature `font-feature-settings: "tnum" 1, "cv05" 1` to ensure numbers align neatly in vertical tabular layouts.
- **Medical Codes & Rx Notation:** Diagnoses identifiers (ICD-10, CPT, LOINC) leverage `code-md` via a precise monospaced font to avoid optical confusion between `0` and `O` or `1` and `l`.
- **Labels & Micro-data:** `label-sm` enforces uppercase styling with generous tracking (`0.04em`) for compact clinical tags, triage score indicators, and table header rows.

## Layout & Spacing

The layout philosophy follows a strict, compact fluid grid optimized for dual-panel and multi-column clinical charts, teleconsultation feeds, and EHR records.

- **Grid Architecture:** 12-column responsive layout with constrained maximum gutters to maintain data density on widescreen workstation monitors (1920px+). 
- **Panels & Splits:**
  - *Left Persistent Navigation / Patient Master Index:* 240px–280px fixed width.
  - *Center Clinical Record / Primary Vitals:* 8-column flexible workspace.
  - *Right Side Telehealth / Diagnostics Context Panel:* 320px–380px contextual drawer for live video feed, real-time vitals, or AI risk summaries.
- **Responsive Adaptations:**
  - *Desktop (≥1200px):* Full 3-column triage layout; simultaneous table and encounter view.
  - *Tablet (768px - 1199px):* Side drawers convert into collapsible sliding sheets; vital tables shift to horizontal scroll containers.
  - *Mobile (<768px):* Single-column stacked triage view with bottom-anchored action bars for bedside rounding and emergency confirmations.

## Elevation & Depth

This system intentionally departs from diffuse, cloudy shadows in favor of **low-contrast structural outlines and crisp boundary delineation**:

- **Borders over Shadows:** All containers, data cards, and table headers utilize solid `1px solid #E2E8F0` outlines to enforce rigorous structural separation without soft blur distractions.
- **Layer 0 (Canvas Base):** Background tint `#F4F7F9`. No elevation.
- **Layer 1 (Card & Data Containers):** Background `#FFFFFF`, border `1px solid #E2E8F0`. Shadow: `0 1px 2px 0 rgba(15, 23, 42, 0.04)`.
- **Layer 2 (Dropdowns, Clinical Context Menus, Tooltips):** Background `#FFFFFF`, border `1px solid #CBD5E1`. Shadow: `0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
- **Layer 3 (Modals, Emergency Overlays, Telehealth Fullscreen Overlays):** Background `#FFFFFF`, border `1px solid #94A3B8`. Shadow: `0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06)`. Accompanied by a 60% opacity `#0F172A` backdrop mask.

## Shapes

The design system employs **Soft (`1`) geometry** (base corner radius of `4px` / `0.25rem`). This provides crisp, professional structure suitable for high-density enterprise software while avoiding sharp, severe corners.

- **Inputs, Buttons, and Form Controls:** Strictly `4px` (`rounded-sm`) to maximize horizontal and vertical pixel density in tight data fields.
- **Cards, Modals, and Clinical Panels:** `8px` (`rounded-lg`) to gently isolate major chart modules from the canvas.
- **Triage Status Badges & Pill Tags:** Fully rounded pill shapes (`9999px`) are reserved solely for status indicators, triage severity flags, and presence beacons to visually contrast against square-cornered data blocks.

## Components

### Buttons
- **Primary:** Background `#0F52BA`, text `#FFFFFF`, border `1px solid #0D47A1`, corner radius `4px`. Hover: `#0D47A1`. Active: `#0A377D`. Height: 36px (compact) or 32px (dense).
- **Secondary / Outline:** Background `#FFFFFF`, text `#0F52BA`, border `1px solid #0F52BA`. Hover: `#F0F6FF`.
- **Critical / Emergency Action:** Background `#D9381E`, text `#FFFFFF`, border `1px solid #B91C1C`.
- **Ghost / Table Action:** Background transparent, text `#475569`, border `1px solid transparent`. Hover: `#F1F5F9` background, text `#1E293B`.

### Triage Badges & Status Chips
- Height: 22px; Padding: `0 8px`; Border radius: `9999px`; Typography: `label-sm`.
- **Emergency / High Risk (>50%):** Background `#FEE2E2`, border `1px solid #FCA5A5`, text `#991B1B`, leading 6px pulsing dot `#DC2626`.
- **Normal / Optimal:** Background `#DCFCE7`, border `1px solid #86EFAC`, text `#166534`.
- **Warning / Review Required:** Background `#FEF3C7`, border `1px solid #FCD34D`, text `#92400E`.
- **Inactive / Historical:** Background `#F1F5F9`, border `1px solid #CBD5E1`, text `#475569`.

### Data Tables (EHR Records & Lab Results)
- **Header:** Background `#F8FAFC`, bottom border `2px solid #E2E8F0`, typography `label-md` uppercase, color `#64748B`. Row height: 36px.
- **Rows:** Background `#FFFFFF`, bottom border `1px solid #E2E8F0`, typography `body-md`. Dense row height: 40px; Regular: 48px.
- **Row States:** Hover: `#F8FAFC`. Selected: `#EFF6FF` with `3px solid #0F52BA` left accent border.
- **Numeric Cells:** Right-aligned, `font-variant-numeric: tabular-nums`.

### Form Inputs & Select Controls
- Height: 36px (compact default). Background `#FFFFFF`, border `1px solid #CBD5E1`, radius `4px`, padding `0 10px`, font size `14px`.
- **Focus:** Border `1px solid #0F52BA`, ring `2px solid rgba(15, 82, 186, 0.15)`, outline none.
- **Error / Invalid Dose:** Border `1px solid #D9381E`, ring `2px solid rgba(217, 56, 30, 0.15)`.

### Checkboxes & Radios
- Size: 16px × 16px. Border `1px solid #94A3B8`, radius `3px` (checkbox) or `50%` (radio).
- Checked: Background `#0F52BA`, border `#0F52BA`, icon `#FFFFFF`.

### Clinical Chart Cards & Encounter Panels
- Background `#FFFFFF`, border `1px solid #E2E8F0`, radius `8px`.
- Card Header: Integrated toolbar row with 44px height, light bottom border `1px solid #F1F5F9`, housing module title (`headline-sm`) and quick filters.

### Clinical Navigation Tabs
- Flat underline style. Height: 40px. Active tab features bottom border `2px solid #0F52BA` and font weight `600` in `#0F52BA`. Inactive tabs use text color `#64748B` with hover color `#1E293B`.