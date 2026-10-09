import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes.jsx';
import { useGetMeQuery } from './services/api.js';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from './store/slices/authSlice.js';

export const App = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { data: meResponse } = useGetMeQuery(undefined, { skip: !isAuthenticated });

  useEffect(() => {
    if (meResponse?.data?.user) {
      dispatch(setUser(meResponse.data.user));
    }
  }, [meResponse, dispatch]);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
};

export default App;
