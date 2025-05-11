// Sigil Theme Generator Plugin
import { definePlugin } from '../../src/plugins/plugin-system';
import ThemeGeneratorPanel from './components/ThemeGeneratorPanel.vue';

export default definePlugin({
  name: 'theme-generator',
  displayName: 'Theme Generator',
  description: 'Generate custom themes for Sigil using AI',
  version: '0.1.0',
  author: 'Sigil',
  
  // Define plugin activation function
  async activate({ app, store, router }) {
    console.log('Theme Generator Plugin activated');
    
    // Register the theme generator panel component
    app.component('theme-generator-panel', ThemeGeneratorPanel);
    
    // Add a settings panel entry for the theme generator
    if (store && store.state.settings) {
      // Add theme generator to settings panels if not already present
      const panelExists = store.state.settings.panels.some(p => p.id === 'theme-generator');
      if (!panelExists) {
        store.commit('settings/addPanel', {
          id: 'theme-generator',
          title: 'Theme Generator',
          icon: 'palette', // Assuming an icon named 'palette' exists
          component: 'theme-generator-panel',
          order: 900 // Position towards the end of the settings panels
        });
      }
    } else {
      console.warn('Theme Generator Plugin: Could not access settings store');
    }
    
    return true;
  },
  
  // Define plugin deactivation function
  async deactivate({ app, store }) {
    console.log('Theme Generator Plugin deactivated');
    
    // Remove the settings panel for theme generator
    if (store && store.state.settings) {
      store.commit('settings/removePanel', 'theme-generator');
    }
    
    return true;
  }
});