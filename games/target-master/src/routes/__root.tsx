import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HandPointer from "@/components/HandPointer";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <HandPointer />
    </QueryClientProvider>
  );
}
