import Cookies from 'js-cookie';

const TOKEN_KEY = 'token';

export const getToken = () => Cookies.get(TOKEN_KEY) ?? null;

export const setToken = (token: string | null) => {
  if (token) {
    Cookies.set(TOKEN_KEY, token, { expires: 7, path: '/' });
  } else {
    Cookies.remove(TOKEN_KEY, { path: '/' });
  }
};

export const clearAuth = () => setToken(null);
