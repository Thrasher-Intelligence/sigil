# Theme Generator Plugin Setup Guide

This guide explains how to set up and integrate the Theme Generator plugin into Sigil.

## Prerequisites

- Sigil installed and running
- OpenAI API key
- Python 3.8+ installed
- Node.js 16+ (for plugin development)

## Installation Steps

### Step 1: Plugin Setup

1. Clone or download the theme-generator plugin folder to your Sigil plugins directory:
   ```
   sigil/frontend/plugins/theme-generator/
   ```

2. Make sure all plugin files are present:
   - index.js
   - package.json
   - components/ThemeGeneratorPanel.vue
   - README.md
   - SETUP.md (this file)

3. Install the plugin dependencies:
   ```
   cd sigil/frontend/plugins/theme-generator
   npm install
   ```

### Step 2: Python Script Setup

1. The theme generator script is located at:
   ```
   sigil/frontend/public/themes/summoning_circle/main.py
   ```

2. Install the required Python dependencies:
   ```
   cd sigil/frontend/public/themes/summoning_circle
   pip install -r requirements.txt
   python main.py
   ```

3. Test the script works correctly:
   ```
   python main.py --theme "Test Theme"
   ```
   This should generate a new CSS file in the themes directory.

### Step 3: Connecting the Plugin to the Backend

Currently, the plugin's UI is set up, but the connection to the Python backend is not yet implemented. There are a few approaches to connect them:

#### Option A: Command-line Execution (Simplest)

The plugin can use Node.js's child_process to execute the Python script directly:

1. Add this function to the ThemeGeneratorPanel.vue component:
   ```javascript
   async executeThemeGenerator(themeName, apiKey) {
     // This requires the "child_process" module
     const { exec } = require('child_process');
     const util = require('util');
     const execPromise = util.promisify(exec);

     const command = `cd ${process.cwd()}/public/themes && python main.py --theme "${themeName}"`;
     
     // Set environment variable for the API key
     const env = { ...process.env, OPENAI_API_KEY: apiKey };
     
     try {
       const { stdout, stderr } = await execPromise(command, { env });
       if (stderr) console.error('Theme generator stderr:', stderr);
       console.log('Theme generator output:', stdout);
       return stdout;
     } catch (error) {
       console.error('Failed to execute theme generator:', error);
       throw error;
     }
   }
   ```

2. Call this function from your `generateTheme()` method.

#### Option B: Backend API (More Robust)

For a more robust solution, implement a dedicated API endpoint:

1. Add a new endpoint to the Sigil backend API
2. The endpoint should handle the theme generation request and call the Python script
3. The frontend plugin will make a fetch/axios request to this endpoint

#### Option C: Electron IPC (If Sigil uses Electron)

If Sigil is an Electron app, use IPC:

1. Set up an IPC handler in the main process that executes the Python script
2. Call this handler from the renderer process (your plugin)

## Troubleshooting

### Plugin not appearing in Sigil

- Check the browser console for JavaScript errors
- Ensure the plugin folder structure is correct
- Restart Sigil after installing the plugin

### Theme generation failures

- Verify your OpenAI API key is valid
- Check the Python script output for error messages
- Ensure all required Python packages are installed

### Theme not applied after generation

- Check the CSS syntax for errors
- Verify the theme file was saved to the correct location
- Try manually selecting the theme from the Sigil settings

## Next Steps for Development

1. Implement the actual bridge between the frontend and the Python script
2. Add theme preview functionality
3. Support custom color palettes as input to the theme generator
4. Add more customization options