import { useQuery, type QueryClient } from '@tanstack/react-query'
import { backend } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'

export function useGliders() {
  return useQuery({
    queryKey: queryKeys.gliders(),
    queryFn: () => backend.getGliders(),
  })
}

export function useGliderLimits(registration: string) {
  return useQuery({
    queryKey: queryKeys.gliderLimits(registration),
    queryFn: () => backend.gliderLimits(registration),
    enabled: Boolean(registration),
  })
}

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users(),
    queryFn: () => backend.getUsers(),
  })
}

export function useAuditLogs() {
  return useQuery({
    queryKey: queryKeys.auditLogs(),
    queryFn: () => backend.getAuditLogs(),
  })
}

export async function invalidateGliderQueries(
  queryClient: QueryClient,
  registrations: Array<string | null | undefined> = [],
) {
  const uniqueRegistrations = [...new Set(registrations.filter(Boolean))] as string[]

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.gliders() }),
    ...uniqueRegistrations.flatMap((registration) => [
      queryClient.invalidateQueries({ queryKey: queryKeys.glider(registration) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.gliderLimits(registration) }),
    ]),
  ])
}

export async function invalidateUsersQuery(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.users() })
}

export async function invalidateAuditLogsQuery(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs() })
}
