import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BlockBreaker } from './components/BlockBreaker';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BlockBreaker />
  </StrictMode>
);
