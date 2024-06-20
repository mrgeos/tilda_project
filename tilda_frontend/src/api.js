import axios from 'axios';

// Настройка базового URL и тайм-аута для всех запросов
const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api', // Базовый URL для всех запросов
  timeout: 10000, // Максимальное время ожидания ответа (10 секунд)
});

// Функция для получения списка сайтов
export const getSites = async () => {
  try {
    const response = await apiClient.get('/sites');
    return response.data.result; // Возвращаем только результат из данных
  } catch (error) {
    console.error('Ошибка при загрузке сайтов:', error);
    throw error; // Пробрасываем ошибку для дальнейшей обработки
  }
};

// Функция для получения списка страниц для конкретного проекта
export const getPages = async (projectId) => {
  try {
    const response = await apiClient.get(`/sites/${projectId}/pages`);
    return response.data.result; // Возвращаем только результат из данных
  } catch (error) {
    console.error('Ошибка при загрузке страниц:', error);
    throw error; // Пробрасываем ошибку для дальнейшей обработки
  }
};
