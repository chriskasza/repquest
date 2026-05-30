import { QueryClient, type QueryFunction } from "@tanstack/react-query";

async function throwIfNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  body?: unknown,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  await throwIfNotOk(res);
  return res;
}

const getQueryFn: QueryFunction = async ({ queryKey }) => {
  const url = queryKey.join("");
  const res = await fetch(url, { credentials: "include" });
  await throwIfNotOk(res);
  return res.json();
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: false,
    },
  },
});
