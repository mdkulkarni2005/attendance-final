// Utility functions for handling authentication cookies
export function setAuthCookie(userType: 'student' | 'teacher', userData: any) {
  const cookieName = `${userType}-session`;
  const cookieValue = JSON.stringify(userData);
  
  // Set cookie for 7 days
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  
  document.cookie = `${cookieName}=${encodeURIComponent(cookieValue)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

export function getAuthCookie(userType: 'student' | 'teacher') {
  const cookieName = `${userType}-session`;
  const cookies = document.cookie.split(';');
  
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === cookieName) {
      try {
        return JSON.parse(decodeURIComponent(value));
      } catch (e) {
        return null;
      }
    }
  }
  return null;
}

export function removeAuthCookie(userType: 'student' | 'teacher') {
  const cookieName = `${userType}-session`;
  document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

export function clearAllAuthCookies() {
  removeAuthCookie('student');
  removeAuthCookie('teacher');
}
