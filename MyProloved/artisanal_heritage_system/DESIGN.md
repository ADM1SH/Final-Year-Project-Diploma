---
name: Artisanal Heritage System
colors:
  surface: '#f9f9f8'
  surface-dim: '#dadad9'
  surface-bright: '#f9f9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f3'
  surface-container: '#eeeeed'
  surface-container-high: '#e8e8e7'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#404941'
  inverse-surface: '#2f3130'
  inverse-on-surface: '#f1f1f0'
  outline: '#717970'
  outline-variant: '#c0c9be'
  surface-tint: '#306a43'
  primary: '#002c13'
  on-primary: '#ffffff'
  primary-container: '#014421'
  on-primary-container: '#76b284'
  inverse-primary: '#97d5a5'
  secondary: '#a73a15'
  on-secondary: '#ffffff'
  secondary-container: '#fe794f'
  on-secondary-container: '#6a1b00'
  tertiary: '#735c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#cca72f'
  on-tertiary-container: '#4e3d00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b2f1bf'
  primary-fixed-dim: '#97d5a5'
  on-primary-fixed: '#00210d'
  on-primary-fixed-variant: '#14512d'
  secondary-fixed: '#ffdbd0'
  secondary-fixed-dim: '#ffb59f'
  on-secondary-fixed: '#3a0a00'
  on-secondary-fixed-variant: '#852400'
  tertiary-fixed: '#ffe088'
  tertiary-fixed-dim: '#e9c349'
  on-tertiary-fixed: '#241a00'
  on-tertiary-fixed-variant: '#574500'
  background: '#f9f9f8'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.3'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 120px
---

## Brand & Style

The brand personality is curated, conscious, and sophisticated. It bridges the gap between high-end boutique retail and sustainable community commerce. The design system targets affluent, eco-conscious consumers who value longevity and "pre-loved" luxury over fast fashion.

The visual style is **Modern Social Commerce with a Tactile Minimalist** foundation. It prioritizes high-quality product photography and human-centric profiles. Key stylistic drivers include:
- **Glassmorphism:** Applied to functional overlays and navigation to maintain a sense of lightness and transparency.
- **Bento-Grid Architecture:** A structured yet flexible layout for dashboards and information-dense views.
- **Organic Softness:** Avoiding harsh lines in favor of deep shadows and rounded geometry to evoke a "lifestyle" rather than "utility" feel.

## Colors

The palette is anchored in **Forest Green**, representing sustainability and premium growth. This is paired with a **Warm Cream** background to provide a softer, more sophisticated canvas than pure white or clinical gray.

- **Primary (Forest Green):** Used for primary branding, heavy CTAs, and sustainability-related metrics.
- **Secondary (Coral/Marigold):** Reserved for high-energy social triggers like "Top Up," "Place Bid," or active notifications.
- **Tertiary (Warm Gold):** Applied to 'Grade B' status and secondary premium markers.
- **Semantic Mint:** A soft, desaturated green for 'Grade A' status badges to signify mint condition without overwhelming the primary brand green.

## Typography

This design system utilizes a high-contrast typographic pairing to signal "Premium Lifestyle." 

**Playfair Display** is used for all major headings and display titles. Its elegant serifs provide a literary, editorial feel. 

**Plus Jakarta Sans** serves as the functional workhorse for body text, price tags, and UI labels. Its modern, slightly rounded letterforms maintain the "friendly" aspect of a marketplace while ensuring legibility at small sizes. 

Use semi-bold and bold weights of the sans-serif for prices and numeric data to ensure they stand out against the more decorative serif headings.

## Layout & Spacing

The layout follows a **Fluid Bento-Grid** philosophy. Content is organized into modular "tiles" that can vary in size (1x1, 2x1, 2x2) to create visual interest in dashboards and profile views.

- **Grid:** 12-column system for desktop, 4-column for mobile.
- **Rhythm:** An 8px linear scale guides all padding and margins.
- **Bento Logic:** Dashboard elements should have equal gutters (16px) to create a cohesive "tiled" appearance.
- **Product Feed:** Product cards use a masonry or flexible grid approach to highlight items of varying aspect ratios, though 1:1 is preferred for standard consistency.

## Elevation & Depth

Hierarchy is established through soft depth and environmental lighting rather than borders.

- **Cards:** No borders. Depth is created via an ultra-soft, multi-layered shadow: `0px 4px 20px rgba(0, 0, 0, 0.05)`.
- **Glassmorphism:** Navigation bars and floating action buttons use a 20px backdrop blur with a 60% white opacity fill and a 1px semi-transparent white top-border to simulate a glass edge.
- **Z-Axis Layers:** 
  - **Level 0:** Warm Cream Background (#FBFBFA)
  - **Level 1:** White Surface Cards (#FFFFFF)
  - **Level 2:** Floating Glass Overlays (Nav/Modals)

## Shapes

The shape language is consistently rounded to feel approachable and "human." 

- **Cards:** Use `rounded-lg` (16px) for standard product and bento cards.
- **Buttons:** Use `rounded-xl` (24px) or full pill-shape for primary actions.
- **Badges:** Always pill-shaped to differentiate status markers from interactive buttons.
- **Profile Placeholders:** Use soft, hand-drawn vector silhouettes or organic circular enclosures.

## Components

### Buttons & Actions
- **Primary Action:** Solid Forest Green with white text. High-energy actions (Bidding/Top Up) use Coral-to-Marigold horizontal gradients.
- **Ghost Actions:** Borderless text buttons with primary color font, used for "See More" or secondary filters.

### Product Cards
- **Borderless Aesthetic:** Images sit flush to the top and sides of the card.
- **Info Stack:** Title in Serif, Price in Bold Sans, followed by the pill-shaped status badge.

### Status Badges (Pills)
- **Grade A:** Soft Mint Green background with dark green text.
- **Grade B:** Warm Gold background with dark brown text.
- **Like New:** Forest Green background with white text.

### Navigation
- **Floating Nav:** A glassmorphic bar positioned at the bottom of the screen with haptic-ready icons. The "Sell" (+) button is elevated as a centered, floating circular element.

### Profile Modules
- Humanized silhouettes for users without photos, using a soft peach or clay color palette to maintain the "lifestyle" aesthetic.