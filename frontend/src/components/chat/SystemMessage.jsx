import React from 'react';
import PropTypes from 'prop-types';
import styles from './Chat.module.css';

const SystemMessage = ({ type, children }) => {
  const isError = type === 'error';
  
  return (
    <div className={isError ? styles.errorMessage : styles.systemMessage}>
      <p className={styles.bubbleContent}>{children}</p>
    </div>
  );
};

SystemMessage.propTypes = {
  type: PropTypes.string,
  children: PropTypes.node.isRequired
};

SystemMessage.defaultProps = {
  type: 'info'
};

export default SystemMessage;