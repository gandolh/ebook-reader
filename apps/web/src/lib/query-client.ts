import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api-client";

/**
 * Single QueryClient for the app. No queries live here yet — the convert
 * `useMutation` (wrapping `POST /convert`) lands in brief 05. This just
 * provides the client so `QueryClientProvider` can wrap the router.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // v5 defaults to 3 retries w/ exponential backoff. A 401 means the
      // guard re-locked the app (bad/missing token) — it won't heal by
      // retrying, and each retry re-fires the global re-lock handler and
      // hammers the auth guard. Skip retries for 401s; cap everything else.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status === 401) return false;
        return failureCount < 2;
      },
    },
  },
});
