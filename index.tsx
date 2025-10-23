import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { LocalizationProvider } from './contexts/LocalizationContext';
import { PersonalizationProvider } from './contexts/PersonalizationContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <ThemeProvider>
    <LocalizationProvider>
      <PersonalizationProvider>
        <App />
      </PersonalizationProvider>
    </LocalizationProvider>
  </ThemeProvider>
);