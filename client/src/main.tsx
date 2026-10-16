import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, httpLink, splitLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { trpc, getAdminToken } from "./lib/trpc";
import "./index.css";

const queryClient = new QueryClient();

function adminHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token ? { "x-admin-token": token } : {};
}

const trpcClient = trpc.createClient({
  links: [
    // 上傳影像的 mutation 體積大，不併入同一個 batch 請求
    splitLink({
      condition: (op) => op.type === "mutation",
      true: httpLink({ url: "/api/trpc", transformer: superjson, headers: adminHeaders }),
      false: httpBatchLink({ url: "/api/trpc", transformer: superjson, headers: adminHeaders }),
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
