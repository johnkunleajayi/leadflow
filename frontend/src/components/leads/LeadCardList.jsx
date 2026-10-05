import SyncBadge from './SyncBadge'
import {
  formatDate,
  getInitials,
  getLeadName,
} from './leadUtils'

function LeadCardList({
  leads,
  selectedLead,
  onSelectLead,
}) {
  return (
    <div className="divide-y divide-slate-800 md:hidden">
      {leads.map((lead) => {
        const isSelected =
          selectedLead &&
          String(selectedLead.id) === String(lead.id)

        return (
          <button
            key={lead.id}
            type="button"
            onClick={() => onSelectLead(lead)}
            className={`block w-full p-5 text-left transition ${
              isSelected
                ? 'bg-indigo-500/10'
                : 'hover:bg-slate-800/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-sm font-bold text-indigo-400">
                {getInitials(lead)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">
                      {getLeadName(lead)}
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      {lead.title || 'No title'}
                    </p>
                  </div>

                  <SyncBadge lead={lead} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-600">
                      Company
                    </p>

                    <p className="mt-1 text-sm text-slate-300">
                      {lead.company || '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-600">
                      Source
                    </p>

                    <p className="mt-1 text-sm text-slate-300">
                      {lead.capture_source || 'Unknown'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-600">
                      Event
                    </p>

                    <p className="mt-1 text-sm text-slate-300">
                      {lead.event || '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-600">
                      Status
                    </p>

                    <p className="mt-1 text-sm text-slate-300">
                      {lead.status || 'New'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4">
                  <p className="text-xs text-slate-600">
                    Captured {formatDate(lead.created_at)}
                  </p>

                  <span className="text-xs font-semibold text-indigo-400">
                    View details →
                  </span>
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default LeadCardList