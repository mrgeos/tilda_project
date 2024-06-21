import React, { useEffect, useState } from 'react';
import { FaTimes, FaArrowUp, FaExpand } from 'react-icons/fa';
import './StatusPanel.css';

const StatusPanel = ({ downloads, cancelDownload, togglePanel, isPanelVisible, hideCompleted }) => {
  const [downloadQueue, setDownloadQueue] = useState([]);
  const [isMaximized, setIsMaximized] = useState(false); // Состояние для макси режима

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

  // Переключение макси режима
  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const cancelDownloadWithStatus = (pageId) => {
    setDownloadQueue((prevQueue) =>
      prevQueue.map((download) =>
        download.id === pageId ? { ...download, status: 'cancelled' } : download
      )
    );
    cancelDownload(pageId); // вызываем функцию отмены загрузки
  };

  const handleCloseOrMinimize = () => {
    if (isMaximized) {
      setIsMaximized(false); // Выход из макси режима
    } else {
      togglePanel(); // Переключение видимости панели
    }
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
    <>
      {isMaximized && <div className="overlay" onClick={toggleMaximize}></div>}
      <div className={`status-panel ${isPanelVisible ? 'visible' : 'hidden'} ${isMaximized ? 'maximized' : ''}`}>
        <div className="panel-header">
          <span className="panel-title">{isPanelVisible ? "Очередь загрузки" : "Статус панель"}</span>
          <div className="panel-controls">
            {!isMaximized && (
              <button className="maximize-button" onClick={toggleMaximize}>
                <FaExpand />
              </button>
            )}
            <button className="close-button" onClick={handleCloseOrMinimize}>
              {isMaximized ? <FaTimes /> : isPanelVisible ? <FaTimes /> : <FaArrowUp />}
            </button>
          </div>
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
        {sortedDownloads.some(download => download.status === 'completed' || download.status === 'cancelled') && (
          <button className="hide-completed-button" onClick={hideCompleted}>
            Скрыть завершенные/отмененные
          </button>
        )}
      </div>
    </>
  );
};

export default StatusPanel;
