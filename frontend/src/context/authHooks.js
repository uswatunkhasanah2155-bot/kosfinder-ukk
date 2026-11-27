// src/context/authHooks.js
import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// Halaman awal tiap peran setelah login
export const homePath = (role) =>
  ({ Admin: '/admin', Owner: '/owner', User: '/user' }[role] || '/');