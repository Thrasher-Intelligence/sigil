import React from 'react';
import PropTypes from 'prop-types';
import styles from './Chat.module.css';

const SystemMessage = ({ type, children, id }) => {
  const isError = type === 'error';
  
  return (
    <div 
      id={id}
      className={isError ? styles.errorMessage : styles.systemMessage}
    >
      <p className={styles.bubbleContent}>{children}</p>
    </div>
  );
};

SystemMessage.propTypes = {
  type: PropTypes.string,
  children: PropTypes.node.isRequired,
  id: PropTypes.string
};

SystemMessage.defaultProps = {
  type: 'info',
  id: `system-${Date.now()}`
};

export default SystemMessage;