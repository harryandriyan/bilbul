import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import '@/app/globals.css';
import {AuthProvider} from '@/contexts/auth-context';
import {ThemeProvider} from '@/contexts/theme-context';
import Home from './app/page';
import AppPage from './app/app/page';
import AuthPage from './app/auth/page';
import AuthCallback from './app/auth/callback/page';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/app" element={<AppPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>
); 