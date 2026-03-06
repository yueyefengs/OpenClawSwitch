import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 30, retry: 1 },
  },
})

export const queryKeys = {
  profiles: ["profiles"] as const,
  profileConfig: (id: string) => ["profileConfig", id] as const,
}
