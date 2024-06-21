import React, { useState, useEffect } from 'react';
import './PageTable.css';
import FolderIcon from './FolderIcon';
import PageIcon from './PageIcon';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import axios from 'axios';
import StatusPanel from './StatusPanel';
import LogPanel from './LogPanel'; // Подключаем компонент LogPanel
import { FaSortDown, FaTimes } from 'react-icons/fa';

const pastelColors = ['#DEFDE0', '#DEF3FD', '#FCF7DE', '#F0DEFD', '#FDDFDF'];

const sortOptions = {
  default: 'По умолчанию',
  asc: 'Сначала старые',
  desc: 'Сначала новые',
  grouped: 'По группам'
};

const PageTable = ({ pages }) => {
  const [selectedPages, setSelectedPages] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [sortedPages, setSortedPages] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState("default");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [groupColors, setGroupColors] = useState({});
  const [logMessages, setLogMessages] = useState([]); // Инициализируем пустым массивом

  const publicKey = 'wxtiwdek2iftl7r54gu6';
  const secretKey = 'kqxlrzh8swhoub7qpmbr';

  const abortControllers = new Map();

  const groupAndSortPagesByDescr = (pages) => {
    const groupedPages = pages.reduce((acc, page) => {
      const groupKey = page.descr || '';
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(page);
      return acc;
    }, {});

    const sortedGroups = Object.values(groupedPages).sort((groupA, groupB) => {
      const dateA = new Date(groupA[0].date);
      const dateB = new Date(groupB[0].date);
      return dateB - dateA;
    });

    const filteredGroups = sortedGroups.filter(group => group.length > 1 && group[0].descr !== '');

    const ungroupedPages = sortedGroups
      .filter(group => group.length <= 1 || group[0].descr === '')
      .flat()
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const finalPages = [...filteredGroups.flat(), ...ungroupedPages];

    const newGroupColors = {};
    filteredGroups.forEach((group, index) => {
      const groupKey = group[0].descr;
      newGroupColors[groupKey] = pastelColors[index % pastelColors.length];
    });

    setGroupColors(newGroupColors);
    return finalPages;
  };

  const sortPagesByDate = (order) => {
    let sorted;
    if (order === 'default') {
      sorted = pages;
    } else {
      sorted = [...pages].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return order === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }
    return sorted;
  };

  useEffect(() => {
    let sorted;
    if (sortOrder === 'grouped') {
      sorted = groupAndSortPagesByDescr(pages);
    } else {
      sorted = sortPagesByDate(sortOrder);
    }
    setSortedPages(sorted);
  }, [pages, sortOrder]);

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

    if (selectedPages.length > 10) {
      setIsConfirmationVisible(true);
      return;
    }

    performDownload();
  };

  const performDownload = async () => {
    setIsDownloading(true);

    const newDownloads = selectedPages.map((pageId) => {
      const page = pages.find((p) => p.id === pageId);
      const abortController = new AbortController();
      abortControllers.set(pageId, abortController);

      return { id: pageId, title: page.title, progress: 0, status: 'archiving', size: null, abortController };
    });

    setDownloads([...downloads, ...newDownloads]);
    setIsPanelVisible(true);

    for (const download of newDownloads) {
      const { id: pageId, abortController } = download;
      const page = pages.find((p) => p.id === pageId);
      if (page) {
        try {
          if (abortController.signal.aborted) {
            console.log(`Запрос отменен перед началом для страницы ${pageId}`);
            setLogMessages((prevMessages) => [...prevMessages, `Запрос отменен перед началом для страницы ${pageId}.`]);
            continue;
          }

          console.log(`Начинаем загрузку страницы ${pageId}.`);
          setLogMessages((prevMessages) => [...prevMessages, `Начинаем загрузку страницы ${pageId}.`]);

          // Заменяем URL на проксируемый путь
          const response = await axios.get(`/api/tilda/project2061/tilda-blocks-page26117898.min.css`, {
            signal: abortController.signal
          });

          const pageData = response.data.result;
          const zip = new JSZip();

          setDownloads((downloads) =>
            downloads.map((download) =>
              download.id === pageId ? { ...download, status: 'archiving' } : download
            )
          );

          zip.file(`page${pageId}.html`, modifyHtmlPaths(pageData.html));

          setLogMessages((prevMessages) => [...prevMessages, `HTML страницы ${pageId} добавлен в архив.`]);

          // Сохранение изображений
          for (const image of pageData.images) {
            if (image.from && image.to) {
              if (abortController.signal.aborted) {
                console.log(`Запрос отменен во время загрузки изображения для страницы ${pageId}`);
                setLogMessages((prevMessages) => [...prevMessages, `Запрос отменен во время загрузки изображения ${image.to} для страницы ${pageId}.`]);
                continue;
              }
              const imageResponse = await axios.get(image.from, {
                responseType: 'arraybuffer',
                signal: abortController.signal
              });
              zip.file(`images/${image.to}`, imageResponse.data);
              setLogMessages((prevMessages) => [...prevMessages, `Изображение ${image.to} добавлено в архив.`]);
            }
          }

          // Сохранение CSS
          for (const css of pageData.css) {
            const cssResponse = await axios.get(css.from, {
              responseType: 'arraybuffer',
              signal: abortController.signal
            });
            zip.file(`css/${css.to}`, cssResponse.data);
            setLogMessages((prevMessages) => [...prevMessages, `CSS файл ${css.to} добавлен в архив.`]);
          }

          // Сохранение JS
          for (const js of pageData.js) {
            const jsResponse = await axios.get(js.from, {
              responseType: 'arraybuffer',
              signal: abortController.signal
            });
            zip.file(`js/${js.to}`, jsResponse.data);
            setLogMessages((prevMessages) => [...prevMessages, `JS файл ${js.to} добавлен в архив.`]);
          }

          if (abortController.signal.aborted) {
            console.log(`Запрос отменен во время архивации для страницы ${pageId}`);
            setLogMessages((prevMessages) => [...prevMessages, `Запрос отменен во время архивации для страницы ${pageId}.`]);
            continue;
          }

          const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
            setDownloads((downloads) =>
              downloads.map((download) =>
                download.id === pageId
                  ? { ...download, progress: metadata.percent.toFixed(2), size: (metadata.total / (1024 * 1024)).toFixed(2) }
                  : download
              )
            );
          });

          setDownloads((downloads) =>
            downloads.map((download) =>
              download.id === pageId ? { ...download, status: 'downloading', progress: 100 } : download
            )
          );

          saveAs(zipBlob, `${pageData.title}.zip`);
          setLogMessages((prevMessages) => [...prevMessages, `Архив для страницы ${pageId} создан и скачан.`]);

          setDownloads((downloads) =>
            downloads.map((download) =>
              download.id === pageId ? { ...download, status: 'completed' } : download
            )
          );

          console.log(`Загрузка страницы ${pageId} завершена.`);
          setLogMessages((prevMessages) => [...prevMessages, `Загрузка страницы ${pageId} завершена.`]);

        } catch (error) {
          if (axios.isCancel(error)) {
            console.log(`Загрузка страницы ${pageId} отменена.`);
            setDownloads((downloads) =>
              downloads.map((download) =>
                download.id === pageId ? { ...download, status: 'cancelled' } : download
              )
            );
            setLogMessages((prevMessages) => [...prevMessages, `Загрузка страницы ${pageId} отменена.`]);
          } else {
            console.error('Ошибка при загрузке страницы:', error);
            setDownloads((downloads) =>
              downloads.map((download) =>
                download.id === pageId ? { ...download, status: 'error' } : download
              )
            );
            setLogMessages((prevMessages) => [...prevMessages, `Ошибка при загрузке страницы ${pageId}.`]);
          }
        }
      }
    }

    setSelectedPages([]);
    setIsConfirmationVisible(false);
    setIsDownloading(false);
  };

  const modifyHtmlPaths = (html) => {
    // Изменяем пути к изображениям, CSS и JS в HTML
    return html
      .replace(/src=['"]([^'"]+\.(png|jpg|jpeg|gif|svg))['"]/g, 'src="images/$1"')
      .replace(/href=['"]([^'"]+\.css)['"]/g, 'href="css/$1"')
      .replace(/src=['"]([^'"]+\.js)['"]/g, 'src="js/$1"');
  };

  const cancelDownload = (pageId) => {
    const abortController = abortControllers.get(pageId);
    if (abortController) {
      abortController.abort();
      abortControllers.delete(pageId);
      console.log(`Скачивание страницы ${pageId} отменено.`);
    }
    setDownloads((downloads) =>
      downloads.map((download) =>
        download.id === pageId ? { ...download, status: 'cancelled' } : download
      )
    );
    setLogMessages((prevMessages) => [...prevMessages, `Скачивание страницы ${pageId} отменено.`]);
  };

  const hideCompleted = () => {
    setDownloads((downloads) => downloads.filter((download) => download.status !== 'completed' && download.status !== 'cancelled'));
  };

  const togglePanel = () => {
    setIsPanelVisible(!isPanelVisible);
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

  const getRowClass = (page, index) => {
    if (sortOrder === 'grouped' && index > 0) {
      const prevPage = filteredPages[index - 1];
      if (page.descr === prevPage.descr && page.descr !== '' && filteredPages.filter(p => p.descr === page.descr).length > 1) {
        return 'grouped';
      }
    }
    return '';
  };

  return (
    <div className="page-table">
      <h2>Страницы проекта</h2>
      <div className="action-buttons">
        <button
          className={`download-button ${isDownloading ? 'loading' : ''}`}
          onClick={handleDownload}
          disabled={isDownloading || selectedPages.length === 0}
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
            {sortOptions[sortOrder]} <FaSortDown />
          </button>
          {isDropdownOpen && (
            <ul className="dropdown-menu">
              {Object.keys(sortOptions).map(option => (
                <li
                  key={option}
                  className={sortOrder === option ? 'selected' : ''}
                  onClick={() => {
                    setSortOrder(option);
                    setIsDropdownOpen(false); // Закрываем список после выбора
                  }}
                >
                  {sortOptions[option]}
                </li>
              ))}
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
          {filteredPages.map((page, index) => {
            const rowColor = sortOrder === 'grouped' && page.descr && filteredPages.filter(p => p.descr === page.descr).length > 1
              ? groupColors[page.descr]
              : 'inherit';
            return (
              <tr
                key={page.id}
                className={getRowClass(page, index)}
                style={{ backgroundColor: rowColor }}
              >
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
            );
          })}
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

      <LogPanel logMessages={logMessages} />
    </div>
  );
};

export default PageTable;
