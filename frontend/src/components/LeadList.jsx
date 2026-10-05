import { useCallback, useEffect, useMemo, useState } from 'react'

import { getLeads } from '../services/api'
import LeadCardList from './leads/LeadCardList'
import LeadDetails from './leads/LeadDetails'
import LeadFilters from './leads/LeadFilters'
import LeadTable from './leads/LeadTable'
import {
  isLeadSynced,
  isLeadSyncFailed,
} from './leads/leadUtils'

function getUniqueValues(leads, field) {
  return [
    ...new Set(
      leads
        .map((lead) => lead[field]?.trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b))
}

function LeadList({ refreshKey = 0 }) {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)

  const [search, setSearch] = useState('')
  const [eventFilter, setEventFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [ratingFilter, setRatingFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [syncFilter, setSyncFilter] = useState('')

  const loadLeads = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getLeads()
      const loadedLeads = Array.isArray(data) ? data : []

      setLeads(loadedLeads)

      setSelectedLead((current) => {
        if (!current) {
          return null
        }

        return (
          loadedLeads.find(
            (lead) => String(lead.id) === String(current.id),
          ) || null
        )
      })
    } catch (err) {
      console.error('LeadFlow lead loading error:', err)

      setError(
        err?.message ||
          'LeadFlow could not load the captured leads.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLeads()
  }, [loadLeads, refreshKey])

  const events = useMemo(
    () => getUniqueValues(leads, 'event'),
    [leads],
  )

  const statuses = useMemo(
    () => getUniqueValues(leads, 'status'),
    [leads],
  )

  const ratings = useMemo(
    () => getUniqueValues(leads, 'rating'),
    [leads],
  )

  const sources = useMemo(
    () => getUniqueValues(leads, 'capture_source'),
    [leads],
  )

  const filteredLeads = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return leads.filter((lead) => {
      if (normalizedSearch) {
        const searchableValues = [
          lead.first_name,
          lead.last_name,
          `${lead.first_name || ''} ${lead.last_name || ''}`,
          lead.company,
          lead.email,
          lead.phone,
          lead.title,
          lead.linkedin_url,
          lead.event,
          lead.capture_source,
          lead.notes,
          lead.lead_interest,
          lead.follow_up_action,
          lead.status,
          lead.rating,
          lead.salesforce_lead_id,
        ]

        const matchesSearch = searchableValues.some((value) =>
          String(value || '')
            .toLowerCase()
            .includes(normalizedSearch),
        )

        if (!matchesSearch) {
          return false
        }
      }

      if (
        eventFilter &&
        lead.event !== eventFilter
      ) {
        return false
      }

      if (
        statusFilter &&
        lead.status !== statusFilter
      ) {
        return false
      }

      if (
        ratingFilter &&
        lead.rating !== ratingFilter
      ) {
        return false
      }

      if (
        sourceFilter &&
        lead.capture_source !== sourceFilter
      ) {
        return false
      }

      if (syncFilter === 'synced' && !isLeadSynced(lead)) {
        return false
      }

      if (
        syncFilter === 'failed' &&
        !isLeadSyncFailed(lead)
      ) {
        return false
      }

      if (
        syncFilter === 'pending' &&
        (isLeadSynced(lead) || isLeadSyncFailed(lead))
      ) {
        return false
      }

      return true
    })
  }, [
    leads,
    search,
    eventFilter,
    statusFilter,
    ratingFilter,
    sourceFilter,
    syncFilter,
  ])

  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(eventFilter) ||
    Boolean(statusFilter) ||
    Boolean(ratingFilter) ||
    Boolean(sourceFilter) ||
    Boolean(syncFilter)

  function handleClearFilters() {
    setSearch('')
    setEventFilter('')
    setStatusFilter('')
    setRatingFilter('')
    setSourceFilter('')
    setSyncFilter('')
  }

  function handleOpenLead(lead) {
    setSelectedLead(lead)

    window.setTimeout(() => {
      document
        .getElementById('lead-details')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
    }, 0)
  }

  function handleCloseLead() {
    setSelectedLead(null)
  }

  return (
    <section className="mt-10">
      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
        <div className="border-b border-slate-800 p-6 md:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                Lead Management
              </span>

              <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
                Captured Leads
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Review the connections captured through LeadFlow and monitor
                their CRM synchronization.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-5 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Total Leads
                </p>

                <p className="mt-1 text-2xl font-bold text-white">
                  {leads.length}
                </p>
              </div>

              <button
                type="button"
                onClick={loadLeads}
                disabled={loading}
                className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {!error && leads.length > 0 && (
          <LeadFilters
            search={search}
            onSearchChange={setSearch}
            eventFilter={eventFilter}
            onEventChange={setEventFilter}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            ratingFilter={ratingFilter}
            onRatingChange={setRatingFilter}
            sourceFilter={sourceFilter}
            onSourceChange={setSourceFilter}
            syncFilter={syncFilter}
            onSyncChange={setSyncFilter}
            events={events}
            statuses={statuses}
            ratings={ratings}
            sources={sources}
            resultCount={filteredLeads.length}
            totalCount={leads.length}
            onClear={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        )}

        {selectedLead && (
          <div id="lead-details">
            <LeadDetails
              lead={selectedLead}
              onClose={handleCloseLead}
            />
          </div>
        )}

        {loading && leads.length === 0 && (
          <div className="flex min-h-48 items-center justify-center p-8">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400" />

              <p className="mt-4 text-sm text-slate-400">
                Loading captured leads...
              </p>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="p-6 md:p-8">
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
              <p className="font-semibold text-red-400">
                Unable to load leads
              </p>

              <p className="mt-2 text-sm text-slate-400">
                {error}
              </p>

              <button
                type="button"
                onClick={loadLeads}
                className="mt-4 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-500"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {!loading && !error && leads.length === 0 && (
          <div className="p-8 text-center md:p-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-2xl">
              👥
            </div>

            <h3 className="mt-4 font-semibold text-white">
              No captured leads yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
              Scan a business card, badge, QR code, or enter a lead manually.
              Your captured connections will appear here.
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          leads.length > 0 &&
          filteredLeads.length === 0 && (
            <div className="p-8 text-center md:p-12">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-2xl">
                🔎
              </div>

              <h3 className="mt-4 font-semibold text-white">
                No matching leads
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                No captured leads match your current search and filters.
              </p>

              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-500/20"
              >
                Clear Filters
              </button>
            </div>
          )}

        {!error && filteredLeads.length > 0 && (
          <>
            <LeadTable
              leads={filteredLeads}
              selectedLead={selectedLead}
              onSelectLead={handleOpenLead}
            />

            <LeadCardList
              leads={filteredLeads}
              selectedLead={selectedLead}
              onSelectLead={handleOpenLead}
            />
          </>
        )}
      </div>
    </section>
  )
}

export default LeadList