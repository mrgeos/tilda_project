import React from 'react';
import './LogPanel.css';

const LogPanel = ({ logMessages }) => {
  return (
    <div className="log-panel">
      <h3>Логи загрузки</h3>
      <div className="log-content">
        {(logMessages && logMessages.length > 0) ? (
          logMessages.map((message, index) => (
            <p key={index}>{message}</p>
          ))
        ) : (
          <p>Пока что нет сообщений.</p>
        )}
      </div>
    </div>
  );
};

export default LogPanel;
