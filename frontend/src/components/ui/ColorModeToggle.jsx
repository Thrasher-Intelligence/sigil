import React from 'react';
import PropTypes from 'prop-types';
import './ColorModeToggle.css';

function ColorModeToggle({ colorMode, onToggle, disabled }) {
  const isDarkMode = colorMode === 'dark';

  const handleClick = () => {
    if (disabled) return;
    onToggle();
  };

  return (
    <div
      className={`color-mode-toggle ${disabled ? 'disabled' : ''}`}
      onClick={handleClick}
      title={isDarkMode ? 'Switch to Light mode' : 'Switch to Dark mode'}
      role="button"
      aria-pressed={isDarkMode}
    >
      <div className={`toggle-track ${isDarkMode ? 'dark' : 'light'}`}> 
        <span className="label light">&#9728;</span>
        <span className="label dark">&#9789;</span>
        <div className={`thumb ${isDarkMode ? 'right' : 'left'}`}></div>
      </div>
    </div>
  );
}

ColorModeToggle.propTypes = {
  colorMode: PropTypes.oneOf(['dark', 'light']).isRequired,
  onToggle: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

ColorModeToggle.defaultProps = {
  disabled: false,
};

export default ColorModeToggle;