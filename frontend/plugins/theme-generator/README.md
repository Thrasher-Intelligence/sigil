# Sigil Theme Generator Plugin

An AI-powered theme generator for the Sigil application. This plugin allows users to easily create custom themes with dark and light mode variants using OpenAI's GPT models.

## Features

- Generate complete CSS themes from simple text prompts
- Automatically creates both dark and light mode variants
- Seamlessly integrates with Sigil's theme system
- Simple, user-friendly interface

## Installation

### Method 1: Using the Plugin Manager (Recommended)

1. Open Sigil
2. Navigate to Settings > Plugins
3. Click "Add Plugin"
4. Search for "Theme Generator" and click "Install"

### Method 2: Manual Installation

1. Download this plugin folder
2. Place it in your Sigil plugins directory:
   - `[SIGIL_INSTALL_DIR]/frontend/plugins/theme-generator`
3. Restart Sigil
4. Enable the plugin in Settings > Plugins

## Usage

1. Open Sigil
2. Navigate to Settings > Theme Generator
3. Enter your OpenAI API key
4. Type a theme concept (e.g., "Cyberpunk", "Ocean Waves", "Sunrise")
5. Click "Generate Theme"
6. Once generated, click "Apply Theme" to use it immediately

## Requirements

- Sigil v1.0.0 or higher
- OpenAI API key

## Development

The plugin consists of:

- Frontend Vue component for the user interface
- Python script for theme generation (using OpenAI API)

### Theme Generator Script

The core theme generation functionality is implemented in a Python script located at:
`sigil/frontend/public/themes/main.py`

To run the script standalone:

```
cd sigil/frontend/public/themes
pip install -r requirements.txt
python main.py
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Credits

- OpenAI for the GPT API
- Sigil team for the plugin system and theme architecture