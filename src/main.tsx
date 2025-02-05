import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// @ts-ignore
import { init } from './i18n.js';
import App from './App.tsx';
import Viewer from './Viewer.tsx';
import './index.css';

init().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App/>} />
          <Route path="/viewer/:encryptedData" element={<Viewer/>} />
        </Routes>
      </BrowserRouter>
    </StrictMode>
  );
});