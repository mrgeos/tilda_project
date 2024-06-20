import React, { useState, useEffect } from 'react';
import './PageTable.css';
import FolderIcon from './FolderIcon';
import PageIcon from './PageIcon';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import axios from 'axios';
import StatusPanel from './StatusPanel';
import { FaSortDown, FaTimes } from 'react-icons/fa';

const PageTable = ({ pages }) => {
  const [selectedPages, setSelectedPages] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [sortedPages, setSortedPages] = useState(pages);
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState("default");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false); // Состояние для управления загрузкой

  const publicKey = 'wxtiwdek2iftl7r54gu6';
  const secretKey = 'kqxlrzh8swhoub7qpmbr';

  const abortControllers = new Map(); // Для хранения AbortController для каждого скачивания

  // Обновляем sortedPages при изменении pages
  useEffect(() => {
    setSortedPages(pages);
  }, [pages]);

  const handleCheckboxChange = (pageId) => {
    setSelectedPages((prevSelectedPages) => {
      if (prevSelectedPages.includes(pageId)) {
        return prevSelectedPages.filter((id) => id !== pageId);
      } else {
        return [...prevSelectedPages, pageId];
      }
    });
  };

  const handleDownload = async () => {
    if (selectedPages.length === 0) return;

    if (selectedPages.length > 10) { // Проверка на большое количество страниц
      setIsConfirmationVisible(true);
      return;
    }

    performDownload();
  };

  const performDownload = async () => {
    setIsDownloading(true); // Устанавливаем состояние загрузки

    const newDownloads = selectedPages.map((pageId) => {
      const page = pages.find((p) => p.id === pageId);
      const abortController = new AbortController(); // Создаем AbortController для каждого скачивания
      abortControllers.set(pageId, abortController); // Сохраняем контроллер в Map

      return { id: pageId, title: page.title, progress: 0, status: 'archiving', size: null, abortController };
    });

    setDownloads([...downloads, ...newDownloads]);
    setIsPanelVisible(true);

    for (const download of newDownloads) {
      const { id: pageId, abortController } = download;
      const page = pages.find((p) => p.id === pageId);
      if (page) {
        try {
          // Добавляем задержку в 3 секунды перед началом скачивания
          await new Promise(resolve => setTimeout(resolve, 3000));

          const response = await axios.get(`https://api.tildacdn.info/v1/getpagefullexport/?publickey=${publicKey}&secretkey=${secretKey}&pageid=${pageId}`, {
            signal: abortController.signal // Передаем сигнал AbortController в запрос
          });
          console.log(`Загрузка страницы ${pageId} начата.`); // Логирование начала загрузки

          const pageData = response.data.result;
          const zip = new JSZip();

          // Обновляем статус на "архивируется"
          setDownloads((downloads) =>
            downloads.map((download) =>
              download.id === pageId ? { ...download, status: 'archiving' } : download
            )
          );

          zip.file(pageData.filename, pageData.html);

          for (const image of pageData.images) {
            if (image.from && image.to) {
              const imageResponse = await axios.get(image.from, {
                responseType: 'arraybuffer',
                signal: abortController.signal // Используем сигнал AbortController
              });
              zip.file(image.to, imageResponse.data);
            }
          }

          // Генерация архива
          const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
            setDownloads((downloads) =>
              downloads.map((download) =>
                download.id === pageId
                  ? { ...download, progress: metadata.percent.toFixed(2), size: (metadata.total / (1024 * 1024)).toFixed(2) }
                  : download
              )
            );
          });

          // Обновляем статус на "скачивание"
          setDownloads((downloads) =>
            downloads.map((download) =>
              download.id === pageId ? { ...download, status: 'downloading', progress: 100 } : download
            )
          );

          // Сохранение архива
          saveAs(zipBlob, `${pageData.filename}.zip`);

          // Обновляем статус на "завершено"
          setDownloads((downloads) =>
            downloads.map((download) =>
              download.id === pageId ? { ...download, status: 'completed' } : download
            )
          );

          console.log(`Загрузка страницы ${pageId} завершена.`); // Логирование завершения загрузки

        } catch (error) {
          if (axios.isCancel(error)) {
            console.log(`Загрузка страницы ${pageId} отменена.`); // Логирование отмены загрузки
            // Обновляем статус на "отменено"
            setDownloads((downloads) =>
              downloads.map((download) =>
                download.id === pageId ? { ...download, status: 'cancelled' } : download
              )
            );
          } else {
            console.error('Ошибка при загрузке страницы:', error);
            setDownloads((downloads) =>
              downloads.map((download) =>
                download.id === pageId ? { ...download, status: 'error' } : download
              )
            );
          }
        }
      }
    }

    // Сброс выбранных страниц после завершения скачивания
    setSelectedPages([]);
    setIsConfirmationVisible(false); // Закрываем диалоговое окно после выполнения скачивания
    setIsDownloading(false); // Снимаем состояние загрузки
  };

  const cancelDownload = (pageId) => {
    // Прерываем запрос используя AbortController
    const abortController = abortControllers.get(pageId);
    if (abortController) {
      abortController.abort();
      abortControllers.delete(pageId); // Удаляем контроллер после отмены
      console.log(`Скачивание страницы ${pageId} отменено.`); // Логирование прерывания запроса
    }
    // Обновляем состояние панели, чтобы отобразить отмену
    setDownloads((downloads) =>
      downloads.map((download) =>
        download.id === pageId ? { ...download, status: 'cancelled' } : download
      )
    );
  };

  const hideCompleted = () => {
    setDownloads((downloads) => downloads.filter((download) => download.status !== 'completed' && download.status !== 'cancelled'));
  };

  const togglePanel = () => {
    setIsPanelVisible(!isPanelVisible);
  };

  const sortPagesByDate = (order) => {
    let sorted;
    if (order === 'default') {
      sorted = pages; // Возвращаемся к изначальному порядку
    } else {
      sorted = [...pages].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return order === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }
    setSortedPages(sorted);
    setSortOrder(order); // Устанавливаем выбранный порядок сортировки
    setIsDropdownOpen(false); // Закрываем выпадающий список
  };

  const handleSearchChange = (event) => {
    setSearchText(event.target.value);
  };

  const clearSearch = () => {
    setSearchText("");
  };

  const getHighlightedText = (text, highlight) => {
    if (!highlight.trim()) {
      return text;
    }
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) =>
      part.toLowerCase() === highlight.toLowerCase() ? <span key={index} className="highlight">{part}</span> : part
    );
  };

  const filteredPages = sortedPages.filter(page =>
    page.title.toLowerCase().includes(searchText.toLowerCase()) ||
    page.descr.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="page-table">
      <h2>Страницы проекта</h2>
      <div className="action-buttons">
        <button
          className={`download-button ${isDownloading ? 'loading' : ''}`} // Добавляем класс во время загрузки
          onClick={handleDownload}
          disabled={isDownloading || selectedPages.length === 0} // Отключаем кнопку во время загрузки
        >
          {isDownloading ? `Идет скачивание (${selectedPages.length})` : `Скачать выбранное${selectedPages.length > 0 ? ` (${selectedPages.length})` : ''}`}
        </button>
        {selectedPages.length > 0 && (
          <span className="clear-selection" onClick={() => setSelectedPages([])}>
            Снять все
          </span>
        )}
        <div className="search-bar">
          <input
            type="text"
            placeholder="Поиск по страницам..."
            value={searchText}
            onChange={handleSearchChange}
          />
          {searchText && (
            <button className="clear-search" onClick={clearSearch}>
              <FaTimes />
            </button>
          )}
        </div>
        <div className="sort-dropdown">
          <button className="sort-button" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            Сортировать <FaSortDown />
          </button>
          {isDropdownOpen && (
            <ul className="dropdown-menu">
              <li className={sortOrder === 'default' ? 'selected' : ''} onClick={() => sortPagesByDate('default')}>По умолчанию</li>
              <li className={sortOrder === 'asc' ? 'selected' : ''} onClick={() => sortPagesByDate('asc')}>Сначала старые</li>
              <li className={sortOrder === 'desc' ? 'selected' : ''} onClick={() => sortPagesByDate('desc')}>Сначала новые</li>
            </ul>
          )}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th><input type="checkbox" disabled /></th>
            <th>Тип</th>
            <th>Заголовок</th>
            <th>Дата изменений</th>
            <th>Ссылка</th>
          </tr>
        </thead>
        <tbody>
          {filteredPages.map(page => (
            <tr key={page.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedPages.includes(page.id)}
                  onChange={() => handleCheckboxChange(page.id)}
                />
              </td>
              <td>{page.is_folder ? <FolderIcon /> : <PageIcon img={page.img} />}</td>
              <td>
                {getHighlightedText(page.title, searchText)}
                {page.descr && <div className="page-descr">{getHighlightedText(page.descr, searchText)}</div>}
              </td>
              <td>{page.date || 'Нет данных'}</td>
              <td><a href={`/${page.alias}`} target="_blank" rel="noopener noreferrer">{`/${page.alias}`}</a></td>
            </tr>
          ))}
        </tbody>
      </table>

      {isConfirmationVisible && (
        <div className="overlay">
          <div className="confirmation-dialog">
            <p>
              Вы собираетесь скачать {selectedPages.length} страниц. Это может занять много времени,
              места на локальном компьютере или интернет-трафика. Вы уверены?
            </p>
            <button onClick={() => {
              setIsConfirmationVisible(false);
              performDownload();
            }}>
              Да, я хочу скачать {selectedPages.length} страниц
            </button>
            <button onClick={() => setIsConfirmationVisible(false)}>Отмена</button>
          </div>
        </div>
      )}

      <StatusPanel
        downloads={downloads}
        cancelDownload={cancelDownload}
        togglePanel={togglePanel}
        isPanelVisible={isPanelVisible}
        hideCompleted={hideCompleted}
      />
    </div>
  );
};

export default PageTable;
 