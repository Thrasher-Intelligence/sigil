import React from 'react';
import PropTypes from 'prop-types';
import './DeviceIndicator.css'; // Import CSS for styling

function DeviceIndicator({ device, username }) {
  // Determine the class based on the device
  const indicatorClass = device === 'cuda' ? 'device-indicator cuda pulsing' : 'device-indicator cpu';
  const deviceInfo = device === 'cuda' ? 'Using GPU (CUDA)' : 'Using CPU';
  const title = username ? `${deviceInfo} - Signed in as ${username}` : deviceInfo;

  // Render nothing if device is null or unknown initially
  if (!device) {
    return null;
  }

  return (
    <div 
      className={indicatorClass} 
      title={title}
    />
  );
}

DeviceIndicator.propTypes = {
  device: PropTypes.oneOf(['cuda', 'cpu', null]),
  username: PropTypes.string,
};

export default DeviceIndicator; 