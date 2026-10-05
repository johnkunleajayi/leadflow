import SyncBadge from './SyncBadge'
import {
  formatDate,
  getInitials,
  getLeadName,
} from './leadUtils'

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p className="mt-2 break-words text-sm leading-6 text-slate-300">
        {value || '—'}
      </p>
    </div>
  )
}

function LeadDetails({ lead, onClose }) {
  if (!lead) {
    return null
  }

  return (
    <div className="border-b border-slate-800 bg-slate-950/50 p-6 md:p-8">
      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 md:p-8">
        <div className="flex flex-col gap-6 border-b border-slate-800 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-lg font-bold text-indigo-400">
              {getInitials(lead)}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-2xl font-bold text-white">
                  {getLeadName(lead)}
                </h3>

                <SyncBadge lead={lead} />
              </div>

              <p className="mt-2 text-sm text-slate-400">
                {lead.title || 'No job title'}
                {lead.company ? ` · ${lead.company}` : ''}
              </p>

              <p className="mt-2 text-xs text-slate-600">
                Captured {formatDate(lead.created_at)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="self-start rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <section>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
              Contact
            </h4>

            <div className="mt-5 space-y-5">
              <DetailItem label="Email" value={lead.email} />
              <DetailItem label="Phone" value={lead.phone} />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  LinkedIn
                </p>

                {lead.linkedin_url ? (
                  <a
                    href={lead.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block break-all text-sm text-indigo-400 transition hover:text-indigo-300"
                  >
                    {lead.linkedin_url}
                  </a>
                ) : (
                  <p className="mt-2 text-sm text-slate-300">
                    —
                  </p>
                )}
              </div>

              <DetailItem
                label="Job Title"
                value={lead.title}
              />

              <DetailItem
                label="Company"
                value={lead.company}
              />
            </div>
          </section>

          <section>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
              Event Context
            </h4>

            <div className="mt-5 space-y-5">
              <DetailItem
                label="Event"
                value={lead.event}
              />

              <DetailItem
                label="Capture Source"
                value={lead.capture_source}
              />

              <DetailItem
                label="Lead Interest"
                value={lead.lead_interest}
              />

              <DetailItem
                label="Follow-up Action"
                value={lead.follow_up_action}
              />
            </div>
          </section>

          <section>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
              Lead Status
            </h4>

            <div className="mt-5 space-y-5">
              <DetailItem
                label="Status"
                value={lead.status || 'New'}
              />

              <DetailItem
                label="Rating"
                value={lead.rating}
              />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Salesforce
                </p>

                <div className="mt-2">
                  <SyncBadge lead={lead} />
                </div>
              </div>

              <DetailItem
                label="Salesforce Lead ID"
                value={lead.salesforce_lead_id}
              />

              <DetailItem
                label="Synchronized"
                value={formatDate(lead.synced_at)}
              />

              {lead.sync_error && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
                    Salesforce Error
                  </p>

                  <p className="mt-2 break-words text-sm leading-6 text-red-300">
                    {lead.sync_error}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="mt-8 border-t border-slate-800 pt-8">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
            Notes
          </h4>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
              {lead.notes || 'No notes were captured for this lead.'}
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

export default LeadDetails