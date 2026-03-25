```markdown
# Design System Specification: The Tactile Command

## 1. Overview & Creative North Star
The core philosophy of this design system is **"The Culinary Concierge."** In the high-velocity environment of a professional kitchen or dining room, a POS should not feel like a computer—it should feel like an intuitive extension of the server’s movements. 

We move beyond the "generic tablet app" by employing **Organic Functionalism**. This approach rejects rigid, boxed-in grids in favor of floating layers and soft tonal shifts. By using intentional asymmetry in layout and high-contrast editorial typography, we create an interface that is both authoritative (professional) and appetizing (warm). The system avoids the "engineered" look of traditional software, opting instead for a sophisticated, editorial aesthetic that mirrors a high-end menu.

---

## 2. Colors: Tonal Depth & Warmth
Our palette is anchored by `primary` (#ac2d00), a sophisticated, sun-ripened terracotta that triggers appetite while signaling action.

### The "No-Line" Rule
To achieve a premium feel, **1px solid borders are strictly prohibited for sectioning.** We define space through background shifts. For example, a sidebar should use `surface_container_low` against a main content area of `surface`. This creates a seamless, modern "wash" of color rather than a fragmented grid.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of materials.
*   **Base Level:** `surface` (#f9f9f9) for the overall application background.
*   **Sub-sections:** `surface_container` (#eeeeee) for persistent areas like the "Current Order" sidebar.
*   **Interactive Cards:** `surface_container_lowest` (#ffffff) to provide the highest contrast for menu items.

### The Glass & Gradient Rule
For high-priority floating elements (like a "Pay Now" modal), utilize **Glassmorphism**. Combine `surface_container_lowest` at 80% opacity with a `backdrop-filter: blur(20px)`. 
*   **Signature Texture:** Use a subtle linear gradient on primary action buttons: `primary` (#ac2d00) to `primary_container` (#d53e0b) at a 135-degree angle. This prevents the primary action from looking "flat" and adds a touch of light-reflective "soul."

---

## 3. Typography: Editorial Utility
We utilize a pairing of **Manrope** for high-level brand expression and **Inter** for rapid-fire data processing.

*   **Display & Headlines (Manrope):** These are our "Editorial" moments. Use `display-md` for daily specials or table numbers. The wide aperture of Manrope adds a modern, premium character that balances the "workhorse" nature of the POS.
*   **Titles & Body (Inter):** Inter is chosen for its exceptional legibility at small sizes. Use `title-md` for menu item names and `body-md` for modifications (e.g., "No onions").
*   **Hierarchy as Navigation:** By using a massive scale jump between `headline-lg` (2rem) and `label-sm` (0.6875rem), we guide the eye to the most important information—the price and the item—without needing bold colors or heavy boxes.

---

## 4. Elevation & Depth: The Layering Principle
Depth is achieved through **Tonal Layering** rather than structural lines.

*   **Ambient Shadows:** For floating elements like Modals or Pop-overs, use an "Ambient Lift."
    *   *Shadow:* `0px 20px 40px rgba(91, 65, 57, 0.08)` (a tinted shadow using the `on_surface_variant` color to mimic natural warmth).
*   **The "Ghost Border" Fallback:** If a border is required for accessibility on a button, use `outline_variant` at 20% opacity. Never use 100% opaque outlines; they "choke" the design.
*   **Tactile Feedback:** When a card is pressed, it should transition from `surface_container_lowest` to `surface_container_high`, creating a physical "sinking" effect that confirms the touch.

---

## 5. Components: Functional Elegance

### Buttons (The Interaction Core)
*   **Primary:** Gradient fill (`primary` to `primary_container`), `xl` roundedness (0.75rem), and `title-sm` typography. Padding: `spacing-4` vertical, `spacing-8` horizontal.
*   **Secondary:** `surface_container_highest` fill with `on_surface` text. No border.
*   **Tertiary:** Transparent background with `primary` text. Use for low-emphasis actions like "Add Note."

### Cards & Lists (The Order Flow)
*   **Menu Cards:** Use `surface_container_lowest` with an `xl` corner radius. **Forbid dividers.** Separate the item name from the price using `spacing-10` of vertical whitespace.
*   **The "Active State":** An active table or selected item should be indicated by a 4px vertical pill of `tertiary` (#005ea2) on the left edge, rather than changing the entire card color.

### Input Fields
*   **Style:** Minimalist. A subtle `surface_container_high` background with a bottom-only "Ghost Border" that expands to a 2px `primary` underline on focus. This keeps the screen feeling "light" despite the high density of information.

### Signature POS Components
*   **Status Orbs:** For table status (Occupied, Cleaning, Reserved), use a soft glow (8px blur) of the status color behind a `label-md` text element, rather than a harsh solid circle.
*   **Modality Drawer:** Instead of a centered pop-up, use a right-aligned "Glass" drawer for order modifications. This keeps the left-hand menu context visible.

---

## 6. Do's and Don'ts

### Do
*   **Do** use `spacing-16` or `spacing-20` for "Safe Touch Zones" around primary buttons to prevent mis-taps during rush hour.
*   **Do** use `tertiary` (#005ea2) exclusively for informational or secondary system feedback (e.g., "Order Sent to Kitchen") to avoid clashing with the appetizing `primary` red/orange.
*   **Do** leverage the `surface_bright` token for active toggle states to make them feel "illuminated."

### Don't
*   **Don't** use pure black (#000000). Always use `secondary` (#546067) or `on_surface` (#1a1c1c) for text to maintain a high-end, softer contrast.
*   **Don't** use "Default" shadows. If a shadow doesn't have a hint of the brand's warm `on_surface_variant` color, it will look like unstyled "default" software.
*   **Don't** crowd the screen. If the UI feels tight, increase the `surface` spacing rather than shrinking the text. A premium system "breathes."