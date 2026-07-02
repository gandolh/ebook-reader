import { QueryClient } from "@tanstack/react-query";

/**
 * Single QueryClient for the app. No queries live here yet — the convert
 * `useMutation` (wrapping `POST /convert`) lands in brief 05. This just
 * provides the client so `QueryClientProvider` can wrap the router.
 */
export const queryClient = new QueryClient();
