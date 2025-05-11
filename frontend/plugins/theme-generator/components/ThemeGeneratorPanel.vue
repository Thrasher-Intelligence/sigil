<template>
  <div class="theme-generator-panel">
    <h2 class="section-header">AI Theme Generator</h2>
    
    <div class="info-box">
      <p>Create custom themes for Sigil using AI! Enter a theme concept and our AI will generate a matching theme with both dark and light mode variants.</p>
    </div>
    
    <div class="theme-form">
      <div class="form-group">
        <label for="themeName">Theme Concept:</label>
        <input 
          type="text" 
          id="themeName" 
          v-model="themeName"
          placeholder="e.g., Cyberpunk, Ocean Waves, Forest Night" 
          :disabled="isGenerating"
        />
      </div>
      
      <button 
        class="generate-button" 
        @click="generateTheme" 
        :disabled="!themeName || isGenerating"
      >
        <span v-if="isGenerating">Generating...</span>
        <span v-else>Generate Theme</span>
      </button>
    </div>
    
    <div v-if="status" :class="['status-message', statusType]">
      {{ status }}
    </div>
    
    <div v-if="generatedThemePath" class="success-box">
      <p>Theme generated successfully! Your new theme is available at:</p>
      <code>{{ generatedThemePath }}</code>
      <div class="actions">
        <button class="apply-button" @click="applyTheme">Apply Theme Now</button>
      </div>
    </div>
    
    <div class="api-key-section">
      <h3>OpenAI API Key</h3>
      <p>An OpenAI API key is required to generate themes.</p>
      
      <div class="form-group">
        <label for="apiKey">API Key:</label>
        <input 
          type="password" 
          id="apiKey" 
          v-model="apiKey"
          placeholder="sk-..." 
          :disabled="isGenerating"
        />
      </div>
      
      <div class="info-box small">
        <p>Your API key is only stored locally and used exclusively for theme generation.</p>
      </div>
    </div>
    
    <!-- This section will be disabled until the backend functionality is implemented -->
    <div class="advanced-options" disabled>
      <h3>Advanced Options</h3>
      <div class="form-group">
        <label for="model">AI Model:</label>
        <select id="model" v-model="model" disabled>
          <option value="gpt-4o">GPT-4o (Recommended)</option>
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</option>
        </select>
      </div>
      
      <div class="form-check">
        <input type="checkbox" id="customizePalette" v-model="customizePalette" disabled>
        <label for="customizePalette">Customize Color Palette</label>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ThemeGeneratorPanel',
  
  data() {
    return {
      themeName: '',
      apiKey: '',
      model: 'gpt-4o',
      customizePalette: false,
      isGenerating: false,
      status: '',
      statusType: 'info',
      generatedThemePath: null
    };
  },
  
  mounted() {
    // Try to load API key from localStorage if it exists
    this.apiKey = localStorage.getItem('openai_api_key') || '';
  },
  
  methods: {
    async generateTheme() {
      if (!this.themeName) {
        this.status = 'Please enter a theme concept';
        this.statusType = 'error';
        return;
      }
      
      if (!this.apiKey) {
        this.status = 'Please enter your OpenAI API key';
        this.statusType = 'error';
        return;
      }
      
      // Save API key to localStorage for convenience
      localStorage.setItem('openai_api_key', this.apiKey);
      
      this.isGenerating = true;
      this.status = 'Generating theme...';
      this.statusType = 'info';
      this.generatedThemePath = null;
      
      try {
        // This is a placeholder for the actual backend implementation
        // In a real implementation, this would be a call to a backend API
        
        // PLACEHOLDER: Simulate a network call
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        /* 
        // TODO: Implement the actual API call when backend is ready
        const response = await fetch('/api/generate-theme', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            themeName: this.themeName,
            apiKey: this.apiKey,
            model: this.model
          })
        });
        
        if (!response.ok) {
          throw new Error(`Theme generation failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        this.generatedThemePath = data.themePath;
        */
        
        // PLACEHOLDER: Mock successful generation
        const sanitizedName = this.themeName
          .replace(/[^a-zA-Z0-9]/g, '_')
          .toLowerCase();
        this.generatedThemePath = `themes/${sanitizedName}.css`;
        
        this.status = 'Theme generated successfully!';
        this.statusType = 'success';
      } catch (error) {
        console.error('Theme generation error:', error);
        this.status = `Error: ${error.message || 'Unknown error occurred'}`;
        this.statusType = 'error';
      } finally {
        this.isGenerating = false;
      }
    },
    
    applyTheme() {
      // PLACEHOLDER: This would apply the theme in a real implementation
      this.status = 'This functionality is not yet implemented';
      this.statusType = 'warning';
      
      /* 
      // TODO: Implement when backend is ready
      if (this.generatedThemePath && this.$store) {
        const themeName = this.generatedThemePath.split('/').pop().replace('.css', '');
        this.$store.commit('settings/setSetting', { 
          key: 'theme', 
          value: themeName 
        });
        this.status = `Theme '${themeName}' applied!`;
        this.statusType = 'success';
      }
      */
    }
  }
};
</script>

<style scoped>
.theme-generator-panel {
  padding: 1rem;
  max-width: 800px;
  margin: 0 auto;
}

.section-header {
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.info-box {
  background-color: var(--panel-tab-active-bg);
  border-left: 4px solid var(--primary);
  padding: 0.75rem 1rem;
  margin-bottom: 1.5rem;
  border-radius: 0.25rem;
}

.info-box.small {
  font-size: 0.85rem;
  opacity: 0.85;
  padding: 0.5rem 0.75rem;
  margin-top: 0.5rem;
}

.theme-form {
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input, 
.form-group select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-input);
  background-color: var(--surface-input);
  color: var(--input-text-color);
  border-radius: 0.25rem;
  font-size: 1rem;
}

.form-group input:focus, 
.form-group select:focus {
  outline: none;
  border-color: var(--focus-ring-accent);
  box-shadow: 0 0 0 3px var(--focus-ring-color);
}

.form-check {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.form-check input {
  margin-right: 0.5rem;
}

.generate-button {
  background-color: var(--primary);
  color: var(--button-foreground);
  border: none;
  padding: 0.625rem 1.25rem;
  font-size: 1rem;
  border-radius: 0.25rem;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.generate-button:hover:not(:disabled) {
  background-color: var(--primary-hover);
}

.generate-button:disabled {
  background-color: var(--disabled-bg);
  color: var(--disabled-fg);
  cursor: not-allowed;
}

.status-message {
  padding: 0.75rem;
  margin: 1rem 0;
  border-radius: 0.25rem;
}

.status-message.error {
  background-color: rgba(255, 0, 0, 0.1);
  border-left: 4px solid #ff6b6b;
}

.status-message.success {
  background-color: rgba(0, 255, 0, 0.1);
  border-left: 4px solid #69db7c;
}

.status-message.info {
  background-color: rgba(0, 0, 255, 0.1);
  border-left: 4px solid #4dabf7;
}

.status-message.warning {
  background-color: rgba(255, 165, 0, 0.1);
  border-left: 4px solid #ffa94d;
}

.success-box {
  background-color: rgba(0, 255, 0, 0.05);
  border-radius: 0.25rem;
  padding: 1rem;
  margin: 1rem 0 1.5rem;
}

.success-box code {
  display: block;
  padding: 0.75rem;
  background-color: var(--surface-input);
  border-radius: 0.25rem;
  margin: 0.5rem 0;
  font-family: monospace;
  overflow-x: auto;
}

.actions {
  margin-top: 1rem;
}

.apply-button {
  background-color: var(--button-bg);
  color: var(--button-text);
  border: 1px solid var(--button-border);
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.apply-button:hover {
  background-color: var(--button-hover-bg);
}

.api-key-section,
.advanced-options {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-input);
}

h3 {
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

[disabled] {
  opacity: 0.6;
  pointer-events: none;
}
</style>