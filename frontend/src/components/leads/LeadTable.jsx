import SyncBadge from './SyncBadge'
import {
  formatDate,
  getInitials,
  getLeadName,
} from './leadUtils'

function LeadTable({
  leads,
  selectedLead,
  onSelectLead,
}) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-left">
        <thead className="border-b border-slate-800 bg-slate-950/40">
          <tr>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Lead
            </th>

            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Company
            </th>

            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Event
            </th>

            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Source
            </th>

            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Status
            </th>

            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Salesforce
            </th>

            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Captured
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-800">
          {leads.map((lead) => {
            const isSelected =
              selectedLead &&
              String(selectedLead.id) === String(lead.id)

            return (
              <tr
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className={`cursor-pointer transition ${
                  isSelected
                    ? 'bg-indigo-500/10'
                    : 'hover:bg-slate-800/30'
                }`}
              >
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-sm font-bold text-indigo-400">
                      {getInitials(lead)}
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold text-white">
                        {getLeadName(lead)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {lead.title || lead.email || 'No title'}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-5 text-sm text-slate-300">
                  {lead.company || '—'}
                </td>

                <td className="px-6 py-5 text-sm text-slate-300">
                  {lead.event || '—'}
                </td>

                <td className="px-6 py-5">
                  <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
                    {lead.capture_source || 'Unknown'}
                  </span>
                </td>

                <td className="px-6 py-5">
                  <p className="text-sm font-medium text-white">
                    {lead.status || 'New'}
                  </p>

                  {lead.rating && (
                    <p className="mt-1 text-xs text-slate-500">
                      {lead.rating}
                    </p>
                  )}
                </td>

                <td className="px-6 py-5">
                  <SyncBadge lead={lead} />
                </td>

                <td className="whitespace-nowrap px-6 py-5 text-sm text-slate-400">
                  {formatDate(lead.created_at)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default LeadTable