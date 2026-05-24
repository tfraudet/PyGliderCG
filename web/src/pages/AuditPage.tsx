import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiError, backend } from '../lib/api'

export function AuditPage() {
  const queryClient = useQueryClient()
  const logsQuery = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => backend.getAuditLogs(),
  })

  const clearMutation = useMutation({
    mutationFn: () => backend.clearAuditLogs(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
    },
  })

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-white">Audit Log</h2>
        <button
          type="button"
          className="rounded-md border border-red-300 bg-red-500/20 px-3 py-2 text-sm"
          onClick={() => clearMutation.mutate()}
        >
          Effacer l'audit log
        </button>
      </div>
      {clearMutation.error ? <p className="text-sm text-red-300">{apiError(clearMutation.error)}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th>Horodatage</th>
              <th>Utilisateur</th>
              <th>Événement</th>
            </tr>
          </thead>
          <tbody>
            {logsQuery.data?.items.map((item, index) => (
              <tr key={`${item.timestamp}-${index}`} className="border-t border-white/10 align-top">
                <td className="pr-2">{new Date(item.timestamp).toLocaleString('fr-FR')}</td>
                <td className="pr-2">{item.user_id}</td>
                <td>{item.event}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
