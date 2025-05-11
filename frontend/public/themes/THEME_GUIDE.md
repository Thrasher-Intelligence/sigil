# Sigil UI Theme Guide (v2)

This guide explains how to create custom themes for the Sigil UI frontend using the updated CSS variable structure. Sigil supports two approaches to theme creation: a standard approach with direct variable definitions, and a namespaced approach for more complex thematic color systems.

## Theme File Format

Theme files are standard CSS files placed in the `frontend/public/themes/` directory (e.g., `MyCoolTheme.css`).

Themes define CSS custom properties (variables) within a `:root` block. The UI components use these variables to style themselves.

The structure provides variables for both **dark mode (default)** and **light mode**. A `body.light-mode` rule at the end of the theme file overrides the base variables for light mode display.

## Core Concepts

1.  **Dark Mode First:** Define all `--variable-dark` colors within the main `:root` block. These are the defaults.
2.  **Light Mode Variants:** Define corresponding `--variable-light` colors within the main `:root` block.
3.  **Base Variables:** Define base variables (e.g., `--background`, `--primary`) that point to the *dark mode* versions initially.
4.  **Light Mode Overrides:** Use the `body.light-mode` selector at the end of the file to switch the base variables to their *light mode* counterparts (e.g., `body.light-mode { --background: var(--background-light); --primary: var(--primary-light); }`).
5.  **Variable Organization Approaches:**
   - **Standard Approach:** Define UI variables directly with color values (see `Starshine.css`, `AlienBlood.css`)
   - **Namespaced Approach:** First define a theme-specific color palette with semantic names, then map those to UI variables (see `Gambler.css`)

## CSS Variable Structure

Sigil's theme system supports both the standard direct approach and a namespaced approach for more complex themes:

- **Standard Approach:** Refer to `Starshine.css` or `AlienBlood.css` for examples of direct variable definition
- **Namespaced Approach:** Refer to `Gambler.css` for an example using theme-specific palette variables

Here's a breakdown of the variable groups:

### 1. Original Mappings & Theme-Specific Palette (Optional)

It's helpful to include original mappings or a theme-specific color palette:

#### Standard Approach (Direct Mappings)
```css
/* Original Mappings (Example) */
--button-background-base: #00E0C6; /* Mapped to --primary-dark */
--header-text-color: #a369ff;
/* ... etc ... */
```

#### Namespaced Approach (Theme-Specific Palette)
```css
/* Theme Palette - Dark Mode (Example) */
--theme-dark-background: #0F0718; /* Deep purple-black */
--theme-dark-accent1: #FF0090; /* Neon pink */
--theme-dark-accent2: #FFD700; /* Gold */

/* Theme Palette - Light Mode (Example) */
--theme-light-background: #F2E6D0; /* Light sandy tone */
--theme-light-accent1: #C56C39; /* Terracotta */
--theme-light-accent2: #7CA1BF; /* Desert sky blue */
```

You can look at `Gambler.css` for a real-world example of theme-specific namespaces with variables like `--vegas-neon-pink` (dark mode) and `--mojave-sand` (light mode).

### 2. Derived & Default Colors

This is the main section where you define the specific colors for your theme for both dark and light modes.

*   **Backgrounds:**
    *   `--background-dark`, `--background-light`: Overall page background.
    *   `--surface-dark`, `--surface-light`: Background for main content areas like the chat container.
    *   `--panel-bg-dark`, `--panel-bg-light`: Background for side panels.
*   **Inputs:**
    *   `--input-bg-dark`, `--input-bg-light`: Background of text inputs, textareas.
    *   `--disabled-bg-dark`, `--disabled-bg-light`: Background for disabled elements.
    *   `--disabled-fg-dark`, `--disabled-fg-light`: Foreground (text) for disabled elements.
*   **Panel Tabs:**
    *   `--panel-tab-bg-dark`, `--panel-tab-bg-light`: Background of inactive panel tabs.
    *   `--panel-tab-active-bg-dark`, `--panel-tab-active-bg-light`: Background of the active panel tab.
    *   `--panel-tab-text-dark`, `--panel-tab-text-light`: Text color of inactive tabs.
    *   `--panel-tab-active-text-dark`, `--panel-tab-active-text-light`: Text color of the active tab.
    *   `--panel-container-bg-dark`, `--panel-container-bg-light`: Background of the content area below the tabs.
*   **Buttons:**
    *   `--primary-dark`, `--primary-light`: Background color for primary action buttons (e.g., Send, Apply Settings).
    *   `--primary-hover-dark`, `--primary-hover-light`: Hover background for primary buttons.
    *   `--button-foreground-dark`, `--button-foreground-light`: Text color *on* primary buttons.
    *   `--button-bg-dark`, `--button-bg-light`: Background for *secondary* buttons (e.g., Load Model).
    *   `--button-hover-bg-dark`, `--button-hover-bg-light`: Hover background for secondary buttons.
    *   `--button-border-dark`, `--button-border-light`: Border color for secondary buttons.
    *   `--button-text-dark`, `--button-text-light`: Text color for secondary buttons.
*   **Focus Ring:**
    *   `--primary-focus-dark`, `--primary-focus-light`: Color (often semi-transparent) for the focus outline around interactive elements.
*   **Settings Panel & Input Details:** (These often reuse other variables but allow specific overrides)
    *   `--surface-input-dark`, `--surface-input-light`: Input background within settings panels.
    *   `--border-input-dark`, `--border-input-light`: Input border within settings panels.
    *   `--focus-ring-accent-dark`, `--focus-ring-accent-light`: Accent color used in focus styles.
    *   `--focus-ring-color-dark`, `--focus-ring-color-light`: Main color for focus ring styles.
    *   `--text-secondary-dark`, `--text-secondary-light`: Color for secondary text/labels.
    *   `--primary-contrast-dark`, `--primary-contrast-light`: Contrast color for text on primary backgrounds.
    *   `--surface-disabled-dark`, `--surface-disabled-light`: Background for disabled surfaces.
    *   `--text-disabled-dark`, `--text-disabled-light`: Text color for disabled elements.
    *   `--surface-hover-dark`, `--surface-hover-light`: Background color for hovered surfaces (like list items).
    *   `--border-input-hover-dark`, `--border-input-hover-light`: Border color for inputs on hover.

### 3. Base Variable Definitions

Define the base variables used by the UI, initially pointing to the dark mode versions.

```css
/* --- Base variables that will be switched --- */
--background: var(--background-dark);
--surface: var(--surface-dark);
--panel-bg-color: var(--panel-bg-dark);
--input-bg: var(--input-bg-dark);
/* ... etc for all groups ... */
--primary: var(--primary-dark);
--button-foreground: var(--button-foreground-dark);
--button-bg: var(--button-bg-dark);
/* ... etc ... */
```

### 4. Light Mode Overrides

Use the `body.light-mode` selector to switch the base variables to their light counterparts.

```css
/* --- Light Mode Overrides --- */
body.light-mode {
  /* Base */
  --background: var(--background-light);
  --surface: var(--surface-light);
  --panel-bg-color: var(--panel-bg-light);
  --input-bg: var(--input-bg-light);
  /* ... etc for all groups ... */
  --primary: var(--primary-light);
  --button-foreground: var(--button-foreground-light);
  --button-bg: var(--button-bg-light);
  /* ... etc ... */
}
```

## Creating a New Theme

There are two approaches you can use when creating a theme:

### Standard Approach

1.  **Copy:** Duplicate an existing theme file (like `Starshine.css`).
2.  **Rename:** Rename the file (e.g., `MyTheme.css`).
3.  **Modify Colors:** Adjust the `--variable-dark` and `--variable-light` values in the "Derived & Default Colors" section to match your desired palette. You can use standard CSS color formats (`#rrggbb`, `rgb()`, `hsl()`, etc.).
4.  **Test:** Select your theme from the Interface panel in the UI to see the results.

**Benefits of the Standard Approach:**
- **Simplicity:** Fewer variables to manage
- **Directness:** Clearer connection between color values and their uses in the UI
- **Easier to maintain:** Less indirection makes updates simpler
- **Better for simple themes:** Ideal when you don't need complex color relationships
- **Example:** See `Starshine.css` or `AlienBlood.css` for implementations

### Namespaced Approach

For more complex themes with distinct color palettes for light/dark modes, or themes with strong conceptual identities (like "Vegas Night" in `Gambler.css`), you might prefer the namespaced approach:

1.  **Define Theme-Specific Variables:** Start by defining your color palette using semantically named, theme-specific variables.

    ```css
    /* Theme-specific palette */
    --theme-dark-primary: #FF0090;
    --theme-dark-secondary: #00E1FF;
    --theme-light-primary: #E5D1A4;
    --theme-light-secondary: #C56C39;
    ```

2.  **Map to UI Variables:** Reference these palette variables when defining the standard UI variables:

    ```css
    /* Map to standard UI variables */
    --primary-dark: var(--theme-dark-primary);
    --button-bg-dark: var(--theme-dark-secondary);
    --primary-light: var(--theme-light-primary);
    --button-bg-light: var(--theme-light-secondary);
    ```

3.  **Continue with Base Variables:** The rest of the theme structure remains the same as the standard approach.

**Benefits of the Namespaced Approach:**
- **Conceptual organization:** Colors are grouped by their thematic purpose
- **Color relationships:** Easier to see which colors are related in the theme's palette
- **Reusability:** Theme-specific colors can be reused across multiple UI elements
- **Semantic naming:** Variables can have names that reflect the theme's concept
- **Better for complex themes:** Ideal for themes with strong visual identities
- **Example:** See `Gambler.css` for implementation using Vegas/Mojave namespaces

## Choosing the Right Approach

When deciding between the standard and namespaced approaches, consider:

- **Theme Complexity**: If your theme uses multiple related colors derived from a few key colors, the namespaced approach helps manage these relationships.
- **Theme Concept**: If your theme has a strong conceptual identity (like "Vegas Night" or "Ocean Depths"), namespaced variables can better express those concepts.
- **Maintainability**: For simple themes, the standard approach is more direct and easier to maintain. For complex themes, the namespaced approach can make relationships clearer.
- **Reuse**: If you plan to reuse the same color in multiple UI elements, the namespaced approach reduces duplication.

There's no wrong choice - both approaches work with the Sigil theme system. Choose the one that makes your theme easier to understand and maintain.

## Helper Script (Coming Soon!)

A helper script is planned to simplify the process of generating a new theme template by prompting for key colors and deriving the rest automatically. Stay tuned!