import os
import json
import tempfile
import argparse
import glob
import re
from typing import Dict, List, Tuple, Optional

from dotenv import load_dotenv
from openai import OpenAI

# Schema for Sigil CSS theme (as a string to be embedded in the prompt)
SIGIL_CSS_SCHEMA_DESCRIPTION = """
/* [THEME_NAME] Theme - CSS Variables */
:root {
  /* --- Original Palette Mappings (Optional Comments) --- */
  --button-background-base: #HEX_COLOR; /* palette-4: Used for button background base */
  --header-text-color: #HEX_COLOR; /* palette-9: Used for header text (chat, settings) */
  --input-text-color: #HEX_COLOR; /* palette-15/foreground: Used for text in settings inputs/textareas */
  --ui-text-primary: #HEX_COLOR; /* Default UI text color - palette-15/foreground */
  --user-message-glow-color: #HEX_COLOR; /* palette-1 */
  --backend-message-glow-color: #HEX_COLOR; /* palette-9 */

  /* --- Backgrounds --- */
  /* Default (Dark Mode) */
  --background-dark: #HEX_COLOR; /* palette-0/background */
  --surface-dark: #HEX_COLOR; /* Slightly lighter than background */
  --panel-bg-dark: #HEX_COLOR; /* Even lighter for panels */

  /* Light Mode Variations */
  --background-light: #HEX_COLOR; /* Light appropriate background */
  --surface-light: #HEX_COLOR; /* Very Light appropriate surface */
  --panel-bg-light: #HEX_COLOR; /* Light appropriate panel background */

  /* --- Input Area Colors --- */
  --input-bg-dark: #HEX_COLOR; /* Slightly lighter than background */
  --input-bg-light: #HEX_COLOR; /* White or very light color for light mode */
  --disabled-bg-dark: #HEX_COLOR; /* Lighter shade for dark mode */
  --disabled-bg-light: #HEX_COLOR; /* Muted shade for light mode */
  --disabled-fg-dark: #HEX_COLOR; /* Dark mode disabled text */
  --disabled-fg-light: #HEX_COLOR; /* Light mode disabled text */

  /* --- Panel Tab/Container Colors --- */
  --panel-tab-bg-dark: #HEX_COLOR; /* Slightly lighter than background */
  --panel-tab-bg-light: #HEX_COLOR; /* Match panel bg light */
  --panel-tab-active-bg-dark: #HEX_COLOR; /* Even lighter for active tabs */
  --panel-tab-active-bg-light: #HEX_COLOR; /* Match surface light */
  --panel-tab-text-dark: #HEX_COLOR; /* Dark mode inactive tab text */
  --panel-tab-text-light: #HEX_COLOR; /* Light mode inactive tab text */
  --panel-tab-active-text-dark: #HEX_COLOR; /* Dark mode active tab text */
  --panel-tab-active-text-light: #HEX_COLOR; /* Light mode active tab text */
  --panel-container-bg-dark: #HEX_COLOR; /* Match panel-bg-dark */
  --panel-container-bg-light: #HEX_COLOR; /* Match panel bg light */

  /* --- Button Colors --- */
  --primary-dark: #HEX_COLOR; /* Primary button color for dark mode */
  --primary-light: #HEX_COLOR; /* Primary button color for light mode */
  --primary-hover-dark: #HEX_COLOR; /* Dark mode hover color - slightly darker */
  --primary-hover-light: #HEX_COLOR; /* Light mode hover color - slightly darker */
  --button-foreground-dark: #HEX_COLOR; /* Dark mode text on primary */
  --button-foreground-light: #HEX_COLOR; /* Light mode text on primary */

  --button-bg-dark: #HEX_COLOR; /* Secondary button background - dark mode */
  --button-bg-light: #HEX_COLOR; /* Secondary button background - light mode */
  --button-hover-bg-dark: #HEX_COLOR; /* Secondary button hover - dark mode */
  --button-hover-bg-light: #HEX_COLOR; /* Secondary button hover - light mode */
  --button-border-dark: #HEX_COLOR; /* Button border color - dark mode */
  --button-border-light: #HEX_COLOR; /* Button border color - light mode */
  --button-text-dark: #HEX_COLOR; /* Button text color - dark mode */
  --button-text-light: #HEX_COLOR; /* Button text color - light mode */

  /* --- Focus Ring Color --- */
  --primary-focus-dark: rgba(R, G, B, A); /* Based on primary color with alpha - dark mode */
  --primary-focus-light: rgba(R, G, B, A); /* Based on primary color with alpha - light mode */

  /* --- Settings Panel & Input Details --- */
  --surface-input-dark: #HEX_COLOR; /* Slightly darker than input-bg */
  --surface-input-light: #HEX_COLOR; /* Light mode input surface */
  --border-input-dark: #HEX_COLOR; /* Dark mode input border */
  --border-input-light: #HEX_COLOR; /* Light mode input border */
  --focus-ring-accent-dark: var(--primary-dark); /* Use primary color */
  --focus-ring-accent-light: var(--primary-light); /* Use primary light color */
  --focus-ring-color-dark: var(--primary-focus-dark); /* Use focus ring with alpha */
  --focus-ring-color-light: var(--primary-focus-light); /* Use focus ring with alpha */
  --text-secondary-dark: #HEX_COLOR; /* Secondary text color - dark mode */
  --text-secondary-light: #HEX_COLOR; /* Secondary text color - light mode */
  --primary-contrast-dark: var(--button-foreground-dark); /* Match primary button text */
  --primary-contrast-light: var(--button-foreground-light); /* Match primary button text */
  --surface-disabled-dark: #HEX_COLOR; /* Same as --disabled-bg-dark */
  --surface-disabled-light: var(--disabled-bg-light); /* Same as light disabled bg */
  --text-disabled-dark: #HEX_COLOR; /* Same as --disabled-fg-dark */
  --text-disabled-light: var(--disabled-fg-light); /* Same as light disabled fg */
  --surface-hover-dark: #HEX_COLOR; /* Lighter than panel background */
  --surface-hover-light: #HEX_COLOR; /* Slightly darker light background */
  --border-input-hover-dark: #HEX_COLOR; /* Lighter than default input border */
  --border-input-hover-light: #HEX_COLOR; /* Darker than default light input border */

  /* Base variables that will be switched */
  --background: var(--background-dark);
  --surface: var(--surface-dark);
  --panel-bg-color: var(--panel-bg-dark);
  --input-bg: var(--input-bg-dark);
  --disabled-bg: var(--disabled-bg-dark);
  --disabled-fg: var(--disabled-fg-dark);
  --panel-tab-bg: var(--panel-tab-bg-dark);
  --panel-tab-active-bg: var(--panel-tab-active-bg-dark);
  --panel-tab-text: var(--panel-tab-text-dark);
  --panel-tab-active-text: var(--panel-tab-active-text-dark);
  --panel-container-bg: var(--panel-container-bg-dark);

  /* Button Base Variables */
  --primary: var(--primary-dark);
  --primary-hover: var(--primary-hover-dark);
  --button-foreground: var(--button-foreground-dark);
  --button-bg: var(--button-bg-dark);
  --button-hover-bg: var(--button-hover-bg-dark);
  --button-border: var(--button-border-dark);
  --button-text: var(--button-text-dark);
  --primary-focus: var(--primary-focus-dark);

  /* Settings Panel Base Variables */
  --surface-input: var(--surface-input-dark);
  --border-input: var(--border-input-dark);
  --focus-ring-accent: var(--focus-ring-accent-dark);
  --focus-ring-color: var(--focus-ring-color-dark);
  --text-secondary: var(--text-secondary-dark);
  --primary-contrast: var(--primary-contrast-dark);
  --surface-disabled: var(--surface-disabled-dark);
  --text-disabled: var(--text-disabled-dark);
  --surface-hover: var(--surface-hover-dark);
  --border-input-hover: var(--border-input-hover-dark);
}

/* --- Light Mode Overrides --- */
body.light-mode {
  /* Override root colors for light mode */
  --ui-text-primary: #HEX_COLOR; /* Text color for light mode */
  --input-text-color: #HEX_COLOR; /* Input text for light mode */
  --header-text-color: #HEX_COLOR; /* Header text for light mode */
  --user-message-glow-color: #HEX_COLOR; /* User message glow for light mode */
  --backend-message-glow-color: #HEX_COLOR; /* Backend message glow for light mode */
  --button-background-base: #HEX_COLOR; /* Override original mapping */

  /* Base */
  --background: var(--background-light);
  --surface: var(--surface-light);
  --panel-bg-color: var(--panel-bg-light);
  --input-bg: var(--input-bg-light);
  --disabled-bg: var(--disabled-bg-light);
  --disabled-fg: var(--disabled-fg-light);

  /* Panel Tabs */
  --panel-tab-bg: var(--panel-tab-bg-light);
  --panel-tab-active-bg: var(--panel-tab-active-bg-light);
  --panel-tab-text: var(--panel-tab-text-light);
  --panel-tab-active-text: var(--panel-tab-active-text-light);
  --panel-container-bg: var(--panel-container-bg-light);

  /* Button Base Variables */
  --primary: var(--primary-light);
  --primary-hover: var(--primary-hover-light);
  --button-foreground: var(--button-foreground-light);
  --button-bg: var(--button-bg-light);
  --button-hover-bg: var(--button-hover-bg-light);
  --button-border: var(--button-border-light);
  --button-text: var(--button-text-light);
  --primary-focus: var(--primary-focus-light);

  /* Settings Panel Base Variables */
  --surface-input: var(--surface-input-light);
  --border-input: var(--border-input-light);
  --focus-ring-accent: var(--focus-ring-accent-light);
  --focus-ring-color: var(--focus-ring-color-light);
  --text-secondary: var(--text-secondary-light);
  --primary-contrast: var(--primary-contrast-light);
  --surface-disabled: var(--surface-disabled-light);
  --text-disabled: var(--text-disabled-light);
  --surface-hover: var(--surface-hover-light);
  --border-input-hover: var(--border-input-hover-light);
}
"""

def load_api_key():
    """Loads the OpenAI API key from the environment, .env file, or user input."""
    # Try loading from ~/sigil/.env for backward compatibility
    env_path = os.path.join(os.path.expanduser('~'), 'sigil', '.env')
    if os.path.exists(env_path):
        load_dotenv(dotenv_path=env_path)
    else:
        # Otherwise, look for local .env file in current directory or parent dirs
        load_dotenv()

    # Try to get API key from environment
    api_key = os.getenv("OPENAI_API_KEY")
    
    # If no API key found, prompt the user
    if not api_key:
        print("No OpenAI API key found in environment or .env files.")
        print("You can enter your API key now, or exit and configure it later.")
        
        # Get API key from user input
        api_key = input("Enter your OpenAI API key (starts with 'sk-'), or press Enter to exit: ").strip()
        
        if not api_key:
            print("No API key provided. Exiting.")
            exit(0)
            
        # Ask if they want to save it to a .env file
        save_key = input("Would you like to save this API key to a .env file for future use? (y/N): ").strip().lower()
        if save_key == 'y':
            env_file = ".env"
            with open(env_file, "w") as f:
                f.write(f"OPENAI_API_KEY={api_key}\n")
            print(f"API key saved to {os.path.abspath(env_file)}")
        
    # Basic check for placeholder key
    if "YOUR_API_KEY_HERE" in api_key:
        print("Error: Placeholder API key detected. Please replace 'YOUR_API_KEY_HERE' with your actual OpenAI API key.")
        exit(1)
        
    # Basic validation for the API key format
    if not api_key.startswith('sk-'):
        print("Warning: Your API key doesn't start with 'sk-', which is unusual for OpenAI API keys.")
        proceed = input("Continue anyway? (y/N): ").strip().lower()
        if proceed != 'y':
            print("Exiting as requested.")
            exit(0)
        
    return api_key

def get_theme_name():
    """Prompts the user for a theme name."""
    while True:
        theme_name = input("Enter a theme concept (e.g., 'Cyberpunk Neon', 'Ocean Depths'): ").strip()
        if not theme_name:
            print("Theme name cannot be empty. Please try again.")
            continue
            
        if all(c.isalnum() or c.isspace() or c in ['-', '_'] for c in theme_name):
            # Create file-safe name (for the actual filename)
            file_safe_name = "".join(c if c.isalnum() or c in ['-', '_'] else '' if c.isspace() else '_' for c in theme_name)
            print(f"\nGenerating '{theme_name}' theme (will be saved as '{file_safe_name}.css')...")
            return theme_name, file_safe_name
        else:
            print("Invalid theme name. Please enter a name containing only letters, numbers, spaces, hyphens, or underscores.")

def extract_theme_colors(css_content: str) -> Dict[str, str]:
    """
    Extracts key color values from a theme CSS file.
    Returns a dictionary of variable names and their hex values.
    """
    colors = {}
    # Extract hex color values (both 6-digit and 8-digit with alpha)
    color_pattern = r'--([a-zA-Z0-9_-]+):\s*(#[0-9a-fA-F]{6}|rgba?\([^)]+\))'
    matches = re.findall(color_pattern, css_content)
    
    for var_name, color_value in matches:
        colors[var_name] = color_value
        
    return colors

def analyze_existing_themes() -> Tuple[List[Dict], str]:
    """
    Analyzes existing theme files in the themes directory to extract color palettes and style information.
    Returns a list of theme info dictionaries and a string with example code snippets.
    """
    # Get the parent directory (themes folder)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(current_dir)
    
    # Find all CSS files in the themes directory
    css_files = glob.glob(os.path.join(parent_dir, "*.css"))
    
    theme_info = []
    example_snippets = ""
    
    for css_file in css_files[:5]:  # Limit to first 5 themes to keep the prompt manageable
        theme_name = os.path.basename(css_file).replace(".css", "")
        
        try:
            with open(css_file, 'r') as f:
                content = f.read()
                
            # Extract color values
            colors = extract_theme_colors(content)
            
            # Add theme info
            theme_info.append({
                "name": theme_name,
                "colors": colors
            })
            
            # Extract key sections to use as examples
            light_mode_section = re.search(r'body\.light-mode\s*{[^}]+}', content, re.DOTALL)
            if light_mode_section and len(example_snippets) < 5000:  # Keep examples under a reasonable size
                example_snippets += f"\n\n/* Example light mode from {theme_name} */\n"
                example_snippets += light_mode_section.group(0)
                
        except Exception as e:
            print(f"Error analyzing theme {theme_name}: {e}")
    
    return theme_info, example_snippets

def generate_css_theme(api_key, theme_name):
    """
    Generates a CSS theme file for Sigil using OpenAI.
    """
    client = OpenAI(api_key=api_key)
    
    # Analyze existing themes
    print("Analyzing existing themes for inspiration...")
    existing_themes, example_snippets = analyze_existing_themes()
    
    # Create a condensed summary of existing themes
    theme_summaries = []
    for theme in existing_themes:
        # Include key colors from each theme
        key_colors = {k: v for k, v in theme["colors"].items() if any(key in k for key in [
            "background-dark", "background-light", "primary-dark", "primary-light", 
            "button-text", "ui-text-primary", "panel-bg"
        ])}
        
        if key_colors:
            theme_summaries.append(f"'{theme['name']}' theme uses: " + 
                                 ", ".join([f"{k}: {v}" for k, v in key_colors.items()]))
    
    theme_summary_text = "\n".join(theme_summaries)

    prompt_content = f"""
    You are a helpful assistant that generates CSS themes for the Sigil application.
    The user wants a theme inspired by the keyword: "{theme_name}".

    Please generate a complete CSS theme file with variables for both dark and light modes.
    Your response should be a complete CSS file following the structure in the template below.
    Replace all #HEX_COLOR values with appropriate color values that create a cohesive theme matching the "{theme_name}" style.
    
    ABSOLUTELY CRITICAL: Do NOT use near-black colors (#000000, #111111, etc.) for backgrounds or near-white colors (#FFFFFF, #FAFAFA) for light mode. The theme MUST be colorful and expressive!
    
    IMPORTANT GUIDANCE FOR CREATING THEMES:
    
    1. COLOR DEPTH AND EXPRESSIVENESS:
       - Avoid using too many blacks or grays as primary colors
       - Use vibrant, expressive colors that match the theme concept
       - Create a rich, varied color palette (not just variations of a single hue)
       - Use color theory principles (complementary, analogous, etc.) to create harmony
       - For a "{theme_name}" theme, select colors that evoke the emotion and imagery associated with this concept
    
    2. DARK MODE CONSIDERATIONS:
       - Dark backgrounds should have color tinting, NOT pure black (#000000) or near-black (#0A0A0A, #111111)
       - GOOD dark background examples: #1E1E2E, #1F2335, #282C34, #2D2A4A, #1A1B26, #24283B
       - BAD dark background examples: #000000, #0A0A0A, #111111, #121212, #0D0D0D
       - Create depth with multiple shades of the background color (3-4 different shades minimum)
       - Background-surface-panel relationship should follow a consistent gradient of lightness
       - Ensure text has high contrast against backgrounds (WCAG AA minimum 4.5:1 ratio)
       - Use saturated accent colors that pop against the dark background
       
       Examples of good dark mode color combinations:
       • Ocean theme dark: background: #1A2B3C, surface: #243447, panel: #2C3E50, accent: #38BDF8
       • Forest theme dark: background: #1E2A20, surface: #2A3C2D, panel: #344739, accent: #7AC74F
       • Cyberpunk theme dark: background: #2B213A, surface: #3A2D50, panel: #47377A, accent: #F900E8
    
    3. LIGHT MODE CONSIDERATIONS:
       - Don't just invert dark mode - reimagine the theme for light backgrounds
       - GOOD light background examples: #F5F5F5, #F0F4F8, #F8F8FA, #EEF1F8, #FBFBFE
       - BAD light background examples: #FFFFFF (pure white), #FAFAFA (near-white), #DDDDDD (mid-gray)
       - Use softer, gentler colors for light mode text (#333333, #444444, #2D3748) instead of pure black
       - Light mode should feel cohesive with dark mode, sharing the same color identity but adapted
       - Surface elements should have subtle differentiation (#F5F5F5 background, #FFFFFF surface)
       - Maintain theme identity by keeping accent colors consistent but desaturated for light mode
       - Buttons in light mode should have sufficient contrast with backgrounds
       
       Examples of good light mode color combinations:
       • Ocean theme light: background: #EBF4FA, surface: #F5FAFF, panel: #E0F1FF, accent: #0EA5E9
       • Forest theme light: background: #F1F8F2, surface: #F8FCF9, panel: #E9F5EB, accent: #4D9C2D
       • Cyberpunk theme light: background: #F2F0FB, surface: #F9F7FF, panel: #F0E8FF, accent: #D008B6
       
       Specific light mode techniques:
       • Use tinted off-whites rather than pure white (add a touch of your theme color)
       • Reduce saturation of accent colors by 10-20% for light mode
       • Ensure dark text has enough contrast with light backgrounds (WCAG AA minimum)
       • Use subtle color shifts between background and surface elements
       • Dark mode accent colors can often be darkened for light mode use
    
    Here are summaries of existing themes for inspiration:
    {theme_summary_text}
    
    {example_snippets}
    
    For the focus ring colors that use rgba(), calculate appropriate values with alpha transparency (0.0-1.0).
    
    Template CSS structure:
    {SIGIL_CSS_SCHEMA_DESCRIPTION}
    
    Replace [THEME_NAME] with '{theme_name}' and each #HEX_COLOR with an appropriate color value.
    """

    try:
        print(f"\nGenerating '{theme_name}' theme using OpenAI...")
        completion = client.chat.completions.create(
            model="gpt-4o", # Using a modern model with good creative capabilities
            messages=[
                {"role": "system", "content": "You are an expert CSS designer specializing in color theory and theme creation. You create expressive, visually appealing themes with carefully selected color palettes. Design both dark and light modes with thoughtfulness, avoiding basic black/white approaches in favor of rich, cohesive aesthetics. Each theme should have a distinct personality with deliberate color choices that evoke the theme's concept. For dark themes, use colored backgrounds not blacks. For light themes, use tinted backgrounds not whites. Never use pure black (#000000) or pure white (#FFFFFF). Your response must be only the complete CSS file with no explanation or markdown. Follow the color guidelines for dark and light themes closely."},
                {"role": "user", "content": prompt_content}
            ],
            response_format={"type": "text"} # Plain text output for CSS
        )

        css_content = completion.choices[0].message.content
        
        # Basic validation - check if it contains required CSS elements
        if ":root {" not in css_content or "body.light-mode {" not in css_content:
            print("Warning: Generated CSS might not be valid. Please check the output.")
        
        print("Theme CSS successfully generated.")
        return css_content

    except Exception as e:
        print(f"An error occurred while communicating with OpenAI: {e}")
        return None

def save_theme_to_file(theme_name, file_safe_name, css_content):
    """Saves the theme CSS to a file."""
    # Determine the output directory (current directory or themes folder)
    # Get the parent directory of where this script is located (themes directory)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(current_dir)  # This is the themes folder
    
    try:
        file_path = os.path.join(parent_dir, f"{file_safe_name}.css")
        
        with open(file_path, 'w') as f:
            f.write(css_content)
        print(f"\nTheme '{theme_name}' saved successfully to {file_path}")
        
        # Validate theme colors
        validate_theme_colors(theme_name, css_content)
        
        # Provide helpful tips based on the theme name
        print("\n💡 Pro tip: For the best themes:")
        print("   • Dark mode backgrounds should have color tinting, not pure black")
        print("   • Light mode should reimagine the theme, not just invert colors")
        print("   • Use off-whites with theme color tinting for light mode backgrounds")
        print("   • Aim for 4-5 distinct colors that work well together")
        print("   • Use color psychology principles that match your theme concept")
        print("   • Ensure surface elements have subtle differentiation from backgrounds")
        
        return file_path
    except IOError as e:
        print(f"Error saving theme file {file_path}: {e}")
        return None

def validate_theme_colors(theme_name, css_content):
    """
    Performs basic validation on the generated theme colors.
    Warns if the theme contains too many blacks/grays or lacks color variety.
    """
    colors = extract_theme_colors(css_content)
    
    # Count how many colors are very dark (close to black)
    dark_count = 0
    gray_count = 0
    pure_white_count = 0
    color_variety = set()
    
    # Track key theme elements
    background_dark = None
    background_light = None
    
    for var_name, color in colors.items():
        if color.startswith('#'):
            # Skip rgba values
            color = color.lower()
            
            # Save background colors for specific checks
            if var_name == "background-dark":
                background_dark = color
            elif var_name == "background-light":
                background_light = color
            
            # Extract R, G, B components
            try:
                r = int(color[1:3], 16)
                g = int(color[3:5], 16)
                b = int(color[5:7], 16)
                
                # Check if very dark (close to black)
                if r < 30 and g < 30 and b < 30:
                    dark_count += 1
                
                # Check if pure/near white
                if r > 245 and g > 245 and b > 245:
                    pure_white_count += 1
                
                # Check if grayscale (R=G=B approximately)
                if abs(r - g) < 10 and abs(g - b) < 10 and abs(r - b) < 10:
                    gray_count += 1
                
                # Track dominant color for variety check (simplified)
                dominant = max(r, g, b)
                if dominant == r: color_variety.add('r')
                elif dominant == g: color_variety.add('g')
                elif dominant == b: color_variety.add('b')
                
            except ValueError:
                pass  # Skip invalid hex values
    
    # Warn if background is too dark/black
    if background_dark and background_dark in ['#000000', '#0a0a0a', '#111111', '#121212', '#0d0d0d']:
        print("\n⚠️  Warning: Dark mode background is too close to pure black.")
        print("   Suggested alternatives: #1E1E2E, #1F2335, #282C34, #2D2A4A, #1A1B26")
    
    # Warn if light background is pure white
    if background_light and background_light in ['#ffffff', '#fafafa', '#f8f8f8']:
        print("\n⚠️  Warning: Light mode background is too close to pure white.")
        print("   Suggested alternatives: #F5F5F5, #F0F4F8, #F8F8FA, #EEF1F8, #FBFBFE")
    
    # Warn if too many dark colors
    if dark_count > 8:
        print("\n⚠️  Warning: This theme contains many colors that are very dark (close to black).")
        print("   Consider using more vibrant and expressive colors for better visual appeal.")
        print("   Try adding color tinting to dark backgrounds, like #1A2B3C instead of #121212.")
    
    # Warn if too many white colors
    if pure_white_count > 5:
        print("\n⚠️  Warning: This theme relies heavily on pure or near-white colors.")
        print("   Consider using softer off-whites or light tints that are easier on the eyes.")
        print("   Try tinted whites like #F1F8F2 (hint of green) or #EBF4FA (hint of blue).")
    
    # Warn if too many grayscale colors
    if gray_count > 12:
        print("\n⚠️  Warning: This theme relies heavily on grayscale colors.")
        print("   Consider adding more color variety for a more expressive theme.")
        print("   Replace grays with very desaturated versions of your theme's accent colors.")
    
    # Additional advice about light/dark mode relationship
    print("\n💡 Remember: Light and dark modes should feel like two expressions of the same theme,")
    print("   not completely different themes. Maintain color identity across both modes.")
    
    # Warn if limited color variety
    if len(color_variety) < 2:
        print("\n⚠️  Warning: This theme has limited color variety.")
        print("   Consider using a broader color palette with different hues.")

def main():
    """Main function to run the script."""
    parser = argparse.ArgumentParser(description="Sigil CSS Theme Generator")
    parser.add_argument("--theme", type=str, help="Theme name to generate (bypasses prompt)")
    parser.add_argument("--analyze", action="store_true", help="Analyze existing themes without generating new one")
    parser.add_argument("--detailed", action="store_true", help="Show more detailed color analysis of themes")
    args = parser.parse_args()
    
    print("┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓")
    print("┃       Sigil CSS Theme Generator      ┃")
    print("┃       ~ Summoning Circle ~           ┃")
    print("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛")
    
    # If analyze flag is set, just analyze existing themes and exit
    if args.analyze:
        print("\nAnalyzing existing themes...")
        themes, _ = analyze_existing_themes()
        print(f"\nFound {len(themes)} themes:")
        
        for theme in themes:
            print(f"\n• {theme['name']}")
            # Print key colors from each theme
            if args.detailed:
                # Detailed view shows more variables and categorizes them
                print("  Dark Mode Colors:")
                dark_vars = ["background-dark", "surface-dark", "panel-bg-dark", "primary-dark", "button-bg-dark"]
                for key in dark_vars:
                    for var, color in theme["colors"].items():
                        if key == var:
                            print(f"    - {var}: {color}")
                            break
                
                print("  Light Mode Colors:")
                light_vars = ["background-light", "surface-light", "panel-bg-light", "primary-light", "button-bg-light"]
                for key in light_vars:
                    for var, color in theme["colors"].items():
                        if key == var:
                            print(f"    - {var}: {color}")
                            break
            else:
                # Simple view shows just a few key colors
                key_vars = ["background-dark", "background-light", "primary-dark", "primary-light"]
                for key in key_vars:
                    for var, color in theme["colors"].items():
                        if key in var:
                            print(f"  - {var}: {color}")
                            break
        
        # Show color pairing insights
        print("\n🎨 Color Pairing Insights:")
        print("  • Successful dark+light mode pairings maintain the same color identity")
        print("  • Backgrounds should have a hint of the theme's main color")
        print("  • Light mode is NOT just inverted dark mode but a reimagining")
        print("  • Dark mode accents are typically more saturated than light mode")
        print("  • Run with --detailed for more comprehensive color analysis")
        return

    api_key = load_api_key()
    if not api_key:
        return  # Error message already printed by load_api_key

    if args.theme:
        theme_name = args.theme
        file_safe_name = "".join(c if c.isalnum() or c in ['-', '_'] else '' if c.isspace() else '_' for c in theme_name)
    else:
        print("\nTheme Ideas:")
        print("  • Nature: Forest Twilight, Ocean Depths, Desert Sunset, Aurora Borealis")
        print("  • Tech: Cyberpunk Neon, Matrix Code, Digital Dreams, Quantum Interface")
        print("  • Vibes: Synthwave, Vaporwave, Lo-Fi Coffee Shop, Dark Academia")
        print("  • Colors: Deep Purple, Emerald Forest, Crimson Tide, Golden Hour")
        print("  • Cultural: Tokyo Nights, Nordic Frost, Moroccan Spice, Celtic Moss")
        print("  • Mood: Serenity, Euphoria, Melancholy, Whimsical\n")
        theme_name, file_safe_name = get_theme_name()

    css_content = generate_css_theme(api_key, theme_name)

    if css_content:
        file_path = save_theme_to_file(theme_name, file_safe_name, css_content)
        if file_path:
            print(f"\n✨ Theme generated successfully! ✨")
            print(f"\nTo use your new '{theme_name}' theme:")
            print(f"1. Open Sigil")
            print(f"2. Go to Settings > Interface")
            print(f"3. Select '{file_safe_name}' from the theme dropdown")
            print("\nEnjoy your new theme! Feel free to generate more themes anytime.")
    else:
        print(f"Failed to generate theme '{theme_name}'.")

if __name__ == "__main__":
    main()