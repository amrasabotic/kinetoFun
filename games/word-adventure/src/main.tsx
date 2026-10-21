import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter, createHashHistory } from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';
import { routeTree } from './routeTree.gen';
import './styles.css';

// Every visit opens on How to Play before the main menu.
if (!window.location.hash || window.location.hash === "#/") window.location.hash = "#/how-to-play";

const queryClient = new QueryClient();
const router = createRouter({
  routeTree,
  history: createHashHistory(),
  context: { queryClient },
});

// The platform's Back button: one screen back, and out of the game from its first screens.
(window as unknown as { __kfBack?: () => boolean }).__kfBack = () => {
  const path = router.state.location.pathname;
  const parent = path.startsWith('/play/') ? '/levels' : path === '/levels' || path === '/play' ? '/' : null;
  if (!parent) return false;
  void router.navigate({ to: parent });
  return true;
};

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
