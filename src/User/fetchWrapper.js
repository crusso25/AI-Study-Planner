import { refreshToken } from './authService';

const fetchWrapper = async (url, options) => {
  const response = await fetch(url, options);

  if (response.status === 401 && !options._retry) {
    options._retry = true;
    await refreshToken();
    const newAccessToken = localStorage.getItem('accessToken');
    options.headers['Authorization'] = `Bearer ${newAccessToken}`;
    return fetch(url, options);
  }

  return response;
};

export default fetchWrapper;
