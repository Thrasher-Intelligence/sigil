// Define a mapping from Ghostty theme keys to CSS variable names (without -- prefix)
// We'll prioritize specific keys and fallback to palette colors if needed.
const keyMap = {
  background: 'bg-primary',
  foreground: 'text-primary',
  'cursor-color': 'accent-primary', // Often a good primary accent
  'selection-background': 'bg-selection', // Can be used for highlights or secondary accent
  'selection-foreground': 'text-selection', // Text on selection
  // Fallback palette indices for common UI elements if specific keys are missing
  palette2: 'accent-secondary', // Often a green/cyan, good for buttons/success
  palette1: 'accent-negative', // Often a red, good for errors
  palette8: 'bg-secondary',    // Often a dimmer bg color
  palette0: 'bg-tertiary',   // Often a darker bg/element color
  palette7: 'text-secondary',  // Often a dimmer text color
  palette15: 'border-color',   // Often a light grey/contrast color
};

// Default theme structure in case a theme file is incomplete
export const defaultThemeColors = {
  'bg-primary': '#1e1e1e',
  'bg-secondary': '#252525',
  'bg-tertiary': '#333333',
  'bg-selection': '#444444',
  'text-primary': '#e0e0e0',
  'text-secondary': '#aaaaaa',
  'text-selection': '#ffffff',
  'border-color': '#555555',
  'accent-primary': '#bb86fc',
  'accent-secondary': '#03dac6',
  'accent-positive': '#03dac6', // Default positive to secondary accent
  'accent-negative': '#cf6679',
};

function parseThemeFile(themeContent) {
  const lines = themeContent.split('\\n');
  const rawColors = {};
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) return; // Skip empty lines and comments

    const parts = trimmedLine.split('=');
    if (parts.length === 2) {
      const key = parts[0].trim().replace(/^palette\s*/, 'palette'); // Normalize 'palette = X' to 'paletteX'
      const value = parts[1].trim();
      if (/^#[0-9A-Fa-f]{6}$/.test(value)) { // Validate hex code
        rawColors[key] = value;
      }
    }
  });

  const theme = { ...defaultThemeColors }; // Start with defaults

  // Map specific keys first
  for (const [ghosttyKey, cssVarName] of Object.entries(keyMap)) {
     // Handle direct keys like 'background'
     if (ghosttyKey !== 'palette' && rawColors[ghosttyKey]) {
       theme[cssVarName] = rawColors[ghosttyKey];
     }
     // Handle specific palette indices defined in keyMap (e.g., 'palette2')
     else if (ghosttyKey.startsWith('palette') && rawColors[ghosttyKey]) {
         theme[cssVarName] = rawColors[ghosttyKey];
     }
  }

  // Fill potential gaps using defaults or other palette colors if needed
  // (Example: if accent-positive wasn't set by palette2, maybe try palette10?)
  // For simplicity, we'll rely on the defaults and the initial mapping for now.
  // Ensure specific accent colors have fallbacks if not mapped directly
  theme['accent-positive'] = theme['accent-positive'] || theme['accent-secondary'];
  theme['accent-negative'] = theme['accent-negative'] || rawColors.palette1 || defaultThemeColors['accent-negative'];
  theme['border-color'] = theme['border-color'] || theme['text-secondary']; // Fallback border

  return theme;
}

export async function getTheme(themeName) {
  // Construct the path relative to the public directory root
  // Vite typically serves assets from the root during dev and copies them in build.
  // Ensure theme files are in a location Vite serves (like `public` or `assets`).
  // If they are in `src/assets`, Vite should handle them correctly.
  const themePath = `/assets/themes/${themeName}`; // Path relative to domain root

  try {
    const response = await fetch(themePath);

    if (!response.ok) {
      // Throw an error if the file wasn't found or there was a server error
      throw new Error(`HTTP error! status: ${response.status} for ${themePath}`);
    }

    // Get the raw text content of the theme file
    const themeContent = await response.text();

    // Parse the content
    return parseThemeFile(themeContent);

  } catch (error) {
    console.error(`Error fetching or parsing theme '${themeName}' from ${themePath}:`, error);
    // Return default colors if loading fails to prevent breaking the app
    return { ...defaultThemeColors };
  }
}

// Function to get available theme names (you might want to improve this)
// This relies on the specific import structure. A better way might be needed
// if the number of themes grows significantly or if you need metadata.
export function getAvailableThemes() {
    // Manually list themes based on the files found previously
    // Replace this with a more dynamic method if needed (e.g., fetch from server, build-time script)
    return [
      'starshine',
      'AlienBlood',
      'Brogrammer',
      'HaX0R_BLUE',
      'HaX0R_GR33N',
      'HaX0R_R3D',
      'Kanagawa Dragon',
      'Kanagawa Wave',
      'Shaman',
      'catppuccin-frappe',
      'catppuccin-macchiato',
      'catppuccin-mocha',
    ];
}

// Function to apply theme colors as CSS variables to the root element
export function applyThemeToDocument(themeColors) {
  console.log("--- applyThemeToDocument called with:", themeColors); // Log input
  const root = document.documentElement;
  for (const [key, value] of Object.entries(themeColors)) {
    // Add the requested log here
    console.log('Applying variable:', `--${key}`, 'Value:', value);
    root.style.setProperty(`--${key}`, value);
  }
  console.log("--- applyThemeToDocument finished ---"); // Log completion
} 