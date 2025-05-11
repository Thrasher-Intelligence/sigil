# Summoning Circle - AI Theme Generator for Sigil

This directory contains the AI-powered theme generator for Sigil, internally nicknamed "Summoning Circle" because it magically conjures beautiful themes based on simple text prompts.

## Overview

The theme generator uses OpenAI's API to create complete CSS themes with both dark and light mode variants. Each theme follows Sigil's CSS variable structure and is ready to use immediately.

## Requirements

- Python 3.8+
- OpenAI API key
- Required Python packages (listed in requirements.txt)

## Setup

1. Install required dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Set your OpenAI API key in one of these ways:
   - Create a `.env` file in this directory with: `OPENAI_API_KEY=your_key`
   - Set the `OPENAI_API_KEY` environment variable
   - Add it to the file `~/sigil/.env`
   - Enter it when prompted by the script (you'll also have the option to save it to a .env file)

## Usage

```
python main.py
```

Or specify a theme name directly:

```
python main.py --theme "Ocean Sunset"
```

The generated theme will be saved as a CSS file in the parent themes directory, making it immediately available in Sigil's theme selector.

## Integration

This theme generator is designed to be integrated with Sigil as a plugin. For more details on plugin integration, see the plugin documentation in `sigil/frontend/plugins/theme-generator/`.

## How It Works

1. Takes a theme concept from user input
2. Sends a prompt to OpenAI with a CSS template structure
3. OpenAI generates a complete theme with appropriate colors
4. The script saves the CSS file to the themes directory
5. The new theme becomes available in Sigil's interface settings

Happy theme crafting!