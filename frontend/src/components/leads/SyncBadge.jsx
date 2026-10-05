import {
  isLeadSynced,
  isLeadSyncFailed,
} from './leadUtils'

function SyncBadge({ lead }) {
  if (isLeadSynced(lead)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Synced
      </span>
    )
  }

  if (isLeadSyncFailed(lead)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400">
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
        Failed
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      {lead.sync_status || 'Pending'}
    </span>
  )
}

export default SyncBadge