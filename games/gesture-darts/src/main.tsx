import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GestureProvider } from './mediaPipe/GestureProvider';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GestureProvider>
      <App />
    </GestureProvider>
  </React.StrictMode>,
);
