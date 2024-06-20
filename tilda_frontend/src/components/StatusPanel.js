import React, { useEffect, useState } from 'react';
import { FaTimes, FaClock, FaArrowUp } from 'react-icons/fa';
import './StatusPanel.css';

const StatusPanel = ({ downloads, cancelDownload, togglePanel, isPanelVisible, hideCompleted }) => {
  const [downloadQueue, setDownloadQueue] = useState([]);

  // Обновляем локальную очередь скачиваний при изменении `downloads`
  useEffect(() => {
    setDownloadQueue(downloads);
  }, [downloads]);

  // Добавляем задержку перед началом скачивания
  useEffect(() => {
    const timer = setTimeout(() => {
      setDownloadQueue((prevQueue) => prevQueue.map(download => {
        if (download.status === 'archiving') {
          return { ...download, status: 'downloading' };
        }
        return download;
      }));
    }, 3000); // 3 секунды задержки

    return () => clearTimeout(timer);
  }, [downloadQueue]);

  const cancelDownloadWithStatus = (pageId) => {
    setDownloadQueue((prevQueue) =>
      prevQueue.map((download) =>
        download.id === pageId ? { ...download, status: 'cancelled' } : download
      )
    );
  };

  // Сортируем объекты: в процессе скачивания отображаются выше завершенных и отмененных
  const sortedDownloads = downloadQueue.sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') {
      return 1;
    }
    if (a.status !== 'completed' && b.status === 'completed') {
      return -1;
    }
    if (a.status === 'cancelled' && b.status !== 'cancelled') {
      return 1;
    }
    if (a.status !== 'cancelled' && b.status === 'cancelled') {
      return -1;
    }
    return 0;
  });

  return (
    <div className={`status-panel ${isPanelVisible ? 'visible' : 'hidden'}`}>
      <div className="panel-header">
        <span className="panel-title">{isPanelVisible ? "Очередь загрузки" : "Статус панель"}</span>
        <button className="close-button" onClick={togglePanel}>
          {isPanelVisible ? <FaTimes /> : <FaArrowUp />}
        </button>
      </div>
      <div className="panel-content">
        {sortedDownloads.map((download, index) => (
          <div
            key={index}
            className={`download-item ${download.status === 'completed' ? 'completed' : ''} ${download.status === 'error' ? 'error' : ''} ${download.status === 'archiving' ? 'archiving' : ''} ${download.status === 'cancelled' ? 'cancelled' : ''}`}
          >
            <div className="download-info">
              <span>{download.title} {download.size && download.status === 'downloading' ? `(${download.size} MB)` : ''}</span>
              {download.status !== 'completed' && download.status !== 'cancelled' && (
                <button className="cancel-button" onClick={() => cancelDownloadWithStatus(download.id)}>
                  <FaTimes />
                </button>
              )}
            </div>
            {download.status === 'archiving' && <span className="status">идет создание архива...</span>}
            {download.status === 'downloading' && (
              <div className="progress-bar">
                <div
                  className="progress"
                  style={{ width: `${download.progress}%` }}
                ></div>
              </div>
            )}
            {download.status === 'completed' && <span className="completed-status">Готово</span>}
            {download.status === 'error' && <span className="error-status">Ошибка</span>}
            {download.status === 'cancelled' && <span className="cancelled-status">Загрузка отменена</span>}
          </div>
        ))}
        {sortedDownloads.length === 0 && (
          <div className="no-downloads">
            <p><strong>Пока тут ничего нет.</strong><br />Тут будут отображаться страницы, которые в процессе скачивания.</p>
          </div>
        )}
      </div>
      <button className="toggle-button" onClick={togglePanel}>
        <FaClock />
      </button>
      {downloads.some(download => download.status === 'completed' || download.status === 'cancelled') && (
        <button className="hide-completed-button" onClick={hideCompleted}>
          Скрыть загруженное
        </button>
      )}
      {!isPanelVisible && (
        <div className="collapsed-panel" onClick={togglePanel}>
          <span className="panel-title-collapsed">Статус панель</span>
        </div>
      )}
    </div>
  );
};

export default StatusPanel;
