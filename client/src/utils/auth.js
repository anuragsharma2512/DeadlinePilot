/**
 * Retrieves the stored JWT token.
 */
export function getToken() {
  return localStorage.getItem('token');
}

/**
 * Stores the JWT token.
 */
export function setToken(token) {
  localStorage.setItem('token', token);
}

/**
 * Retrieves the stored user object.
 */
export function getUser() {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
}

/**
 * Stores the user object.
 */
export function setUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

/**
 * Clears authentication data from localStorage.
 */
export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

/**
 * Checks if the user is authenticated.
 */
export function isAuthenticated() {
  return !!getToken();
}
