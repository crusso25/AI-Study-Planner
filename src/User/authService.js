import fetchWrapper from './fetchWrapper';

const API_BASE_URL = 'http://localhost:8080/api';

const login = async (username, password) => {
    try {
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include', // Include credentials such as cookies
      });
  
      if (!response.ok) {
        throw new Error('Login failed');
      }
  
      const data = await response.json();
      localStorage.setItem('accessToken', data.accessToken);
      return data;
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  };
  

const register = async (username, password, email) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password, email }),
    });

    if (!response.ok) {
      throw new Error('Registration failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error registering:', error);
    throw error;
  }
};

const refreshToken = async () => {
  try {
    const response = await fetchWrapper(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // Include cookies in the request
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    localStorage.setItem('accessToken', data.accessToken);
    return data;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
};

export { login, register, refreshToken };
