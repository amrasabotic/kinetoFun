import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import GestureAirHockey from './components/GestureAirHockey';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GestureAirHockey />
  </StrictMode>
);
