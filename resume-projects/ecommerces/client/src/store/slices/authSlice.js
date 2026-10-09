import { createSlice } from '@reduxjs/toolkit';

const token = localStorage.getItem('kora_access_token');
const savedUser = localStorage.getItem('kora_user');

const initialState = {
  token: token || null,
  user: savedUser ? JSON.parse(savedUser) : null,
  isAuthenticated: !!token,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, accessToken } = action.payload;
      state.user = user;
      state.token = accessToken;
      state.isAuthenticated = true;
      localStorage.setItem('kora_access_token', accessToken);
      localStorage.setItem('kora_user', JSON.stringify(user));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('kora_access_token');
      localStorage.removeItem('kora_user');
    },
    setUser: (state, action) => {
      state.user = action.payload;
      localStorage.setItem('kora_user', JSON.stringify(action.payload));
    },
  },
});

export const { setCredentials, logout, setUser } = authSlice.actions;
export default authSlice.reducer;
