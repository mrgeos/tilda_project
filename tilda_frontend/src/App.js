import React, { useState, useEffect, Suspense } from 'react';
import { getSites, getPages } from './api';
import './App.css';

const SiteCard = React.lazy(() => import('./components/SiteCard'));
const PageTable = React.lazy(() => import('./components/PageTable'));

function App() {
  const [sites, setSites] = useState([]);
  const [pages, setPages] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    getSites()
      .then(data => {
        setSites(data);
        setLoading(false);
      })
      .catch(error => {
        setError('Не удалось загрузить сайты. Попробуйте позже.');
        setLoading(false);
      });
  }, []);

  const fetchPages = (projectId) => {
    setLoading(true);
    setError(null);

    // Принудительно показываем индикатор загрузки
    setTimeout(() => {
      getPages(projectId)
        .then(data => {
          setPages(data);
          setSelectedSite(projectId);
          setLoading(false);
        })
        .catch(error => {
          setError('Не удалось загрузить страницы. Попробуйте позже.');
          setLoading(false);
        });
    }, 100); // Задержка 100 миллисекунд
  };

  return (
    <div className="App">
      <h1>Сайты Tilda</h1>
      <div className="container">
        {error && <p className="error">{error}</p>}
        <Suspense fallback={<div>Loading...</div>}>
          <div className="site-cards">
            {sites.map(site => (
              <SiteCard
                key={site.id}
                site={site}
                onClick={() => fetchPages(site.id)}
                isSelected={site.id === selectedSite}
              />
            ))}
          </div>
        </Suspense>
        {selectedSite && (
          <div className={`table-container ${loading ? 'loading' : ''}`}>
            {loading && (
              <div className="loading-indicator">
                <p>Загрузка...</p>
              </div>
            )}
            <div className={`page-table ${loading ? 'translucent' : ''}`}>
              <Suspense fallback={<div>Loading...</div>}>
                <PageTable pages={pages} />
              </Suspense>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
