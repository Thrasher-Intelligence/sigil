import React, { useState, useEffect } from 'react';
import './PrecisionSettingsPanel.css';

// Placeholder for a real API client or fetch wrapper
const apiClient = {
  get: async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  post: async (url, data) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
};

function PrecisionSettingsPanel() {
  const [selectedPrecision, setSelectedPrecision] = useState('loading'); // 'loading', 'cpu', 'gpu-fp32', 'gpu-fp16', 'error'
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch initial precision setting on component mount
  useEffect(() => {
    const fetchPrecision = async () => {
      try {
        // NOTE: Use the full path expected by the backend, including the /api/v1 prefix
        const response = await fetch('/api/v1/system/get_precision'); // Use raw fetch to inspect response easier
        const responseText = await response.text(); // Get response as text first
        console.log("Raw response from /api/v1/system/get_precision:", responseText); // Log the raw text

        if (!response.ok) {
          // Try to parse error detail if possible, otherwise use status
          let errorDetail = `HTTP error! status: ${response.status}`;
          try {
             const errorData = JSON.parse(responseText); // Try parsing the text we got
             errorDetail = errorData.detail || errorDetail;
          } catch {
             // Ignore if parsing fails, use original error detail
          }
          throw new Error(errorDetail);
        }

        const data = JSON.parse(responseText); // Now parse the text

        // Map backend 'fp32'/'fp16' to frontend options
        // Assuming 'fp32' could mean either CPU was forced OR GPU is using fp32.
        // Defaulting to 'gpu-fp32' if CUDA is available (which is why this panel is shown).
        setSelectedPrecision(data.current_precision === 'fp16' ? 'gpu-fp16' : 'gpu-fp32');
      } catch (error) {
        console.error("Failed to fetch initial precision:", error);
        setSelectedPrecision('error');
        alert(`Error fetching precision: ${error.message}`);
      }
    };
    fetchPrecision();
  }, []);

  const handlePrecisionChange = async (event) => {
    const newPrecisionFrontend = event.target.value;
    setSelectedPrecision(newPrecisionFrontend);
    setIsUpdating(true);

    // Map frontend selection to backend value
    let backendValue;
    if (newPrecisionFrontend === 'gpu-fp16') {
        backendValue = 'fp16';
    } else {
        // Both 'cpu' and 'gpu-fp32' map to 'fp32' on the backend.
        // 'fp32' is the safe default and required for CPU.
        backendValue = 'fp32';
    }

    try {
      // NOTE: Also update the POST path to include /api/v1
      const response = await apiClient.post('/api/v1/system/set_precision', { precision: backendValue });
      console.log('Precision set response:', response);
      alert(`Precision successfully set to ${newPrecisionFrontend}. Note: This applies when the *next* model is loaded.`);
    } catch (error) {
      console.error("Failed to set precision:", error);
      alert(`Error setting precision: ${error.message}`);
      // Optionally revert UI state or fetch the actual current state again
      setSelectedPrecision('error'); // Indicate error state
    } finally {
      setIsUpdating(false);
    }
  };

  if (selectedPrecision === 'loading') {
    return (
      <div className="precision-settings-panel">
        <div className="precision-loading">
          <div className="precision-loading-spinner"></div>
          Loading precision settings...
        </div>
      </div>
    );
  }

  return (
    <div className="precision-settings-panel">
      <div className="precision-settings-content">
        <h3>Precision Settings</h3>
        <p className="precision-settings-description">
          Choose your preferred inference precision. Half precision (fp16) is faster but slightly less accurate. Changes apply on next model load.
        </p>
        <form>
          <div className="precision-options">
            <label 
              className={`precision-option-label ${selectedPrecision === 'gpu-fp32' ? 'selected' : ''} ${(isUpdating || selectedPrecision === 'error') ? 'disabled' : ''}`}
            >
              <input
                className="precision-option-input"
                type="radio"
                name="precision"
                value="gpu-fp32"
                checked={selectedPrecision === 'gpu-fp32'}
                onChange={handlePrecisionChange}
                disabled={isUpdating || selectedPrecision === 'error'}
              />
              <span className="precision-option-name">GPU (Standard Precision - fp32)</span>
            </label>
            <label 
              className={`precision-option-label ${selectedPrecision === 'gpu-fp16' ? 'selected' : ''} ${(isUpdating || selectedPrecision === 'error') ? 'disabled' : ''}`}
            >
              <input
                className="precision-option-input"
                type="radio"
                name="precision"
                value="gpu-fp16"
                checked={selectedPrecision === 'gpu-fp16'}
                onChange={handlePrecisionChange}
                disabled={isUpdating || selectedPrecision === 'error'}
              />
              <span className="precision-option-name">GPU (Half Precision - fp16)</span>
            </label>
            {/*
              Note: The "CPU Only" option is removed as it's implicitly handled.
              Selecting 'GPU (Standard Precision - fp32)' sets the backend to 'fp32',
              which is compatible with both CPU and GPU. The actual device used
              depends on availability detected by the backend during model load.
            */}
          </div>
          {selectedPrecision === 'error' && <div className="precision-error">Failed to load or update precision.</div>}
        </form>
      </div>
    </div>
  );
}

export default PrecisionSettingsPanel; 