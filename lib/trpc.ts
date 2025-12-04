import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { supabase } from "@/lib/supabase";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }

  throw new Error(
    "No base url found, please set EXPO_PUBLIC_RORK_API_BASE_URL"
  );
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      async headers() {
        const { data: { session } } = await supabase.auth.getSession();
        return {
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
        };
      },
      fetch(url, options) {
        console.log('[tRPC] Making request to:', url);
        console.log('[tRPC] Base URL:', getBaseUrl());
        console.log('[tRPC] Full URL:', url);
        
        return fetch(url, options).then(async (res) => {
          console.log('[tRPC] Response status:', res.status, res.statusText);
          console.log('[tRPC] Response headers:', Object.fromEntries(res.headers.entries()));
          
          if (!res.ok) {
            const text = await res.text();
            console.error('[tRPC] Error response body:', text.substring(0, 500));
            
            if (res.status === 404) {
              throw new Error(`Backend endpoint not found (404). The backend might not be deployed yet. Base URL: ${getBaseUrl()}. If you're running the app, make sure to start it with 'bun start' which deploys the backend automatically.`);
            }
            
            if (text.startsWith('<')) {
              throw new Error(`Backend returned HTML instead of JSON. Status: ${res.status}. The backend API might be down or not deployed. Please check: ${getBaseUrl()}`);
            }
          }
          
          const clonedRes = res.clone();
          const contentType = res.headers.get('content-type');
          console.log('[tRPC] Response content-type:', contentType);
          
          return clonedRes;
        }).catch((error) => {
          console.error('[tRPC] Fetch error:', error);
          throw error;
        });
      },
    }),
  ],
});
