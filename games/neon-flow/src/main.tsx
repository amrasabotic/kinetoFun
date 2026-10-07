import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter, createHashHistory } from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';
import { routeTree } from './routeTree.gen';
import './styles.css';

// How to Play is the first screen whenever the game is opened. A reload
// inside a level keeps its route; only the landing route is redirected.
const startHash = window.location.hash;
if (startHash === '' || startHash === '#' || startHash === '#/') {
  window.history.replaceState(null, '', '#/how-to-play');
}

const queryClient = new QueryClient();
const router = createRouter({
  routeTree,
  history: createHashHistory(),
  context: { queryClient },
});

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
