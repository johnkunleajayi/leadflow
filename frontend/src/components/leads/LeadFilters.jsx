function FilterSelect({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-200 outline-none transition focus:border-indigo-500"
      >
        <option value="">All</option>

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function LeadFilters({
  search,
  onSearchChange,
  eventFilter,
  onEventChange,
  statusFilter,
  onStatusChange,
  ratingFilter,
  onRatingChange,
  sourceFilter,
  onSourceChange,
  syncFilter,
  onSyncChange,
  events,
  statuses,
  ratings,
  sources,
  resultCount,
  totalCount,
  onClear,
  hasActiveFilters,
}) {
  return (
    <div className="border-b border-slate-800 bg-slate-950/30 p-6 md:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <label className="block flex-1">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Search Leads
          </span>

          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">
              ⌕
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                onSearchChange(event.target.value)
              }
              placeholder="Search name, company, email, phone..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500"
            />
          </div>
        </label>

        <div className="flex items-center justify-between gap-4 lg:justify-end">
          <p className="text-sm text-slate-500">
            Showing{' '}
            <span className="font-semibold text-slate-300">
              {resultCount}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-slate-300">
              {totalCount}
            </span>{' '}
            leads
          </p>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClear}
              className="whitespace-nowrap text-sm font-semibold text-indigo-400 transition hover:text-indigo-300"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <FilterSelect
          label="Event"
          value={eventFilter}
          onChange={onEventChange}
          options={events}
        />

        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={onStatusChange}
          options={statuses}
        />

        <FilterSelect
          label="Rating"
          value={ratingFilter}
          onChange={onRatingChange}
          options={ratings}
        />

        <FilterSelect
          label="Source"
          value={sourceFilter}
          onChange={onSourceChange}
          options={sources}
        />

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Salesforce
          </span>

          <select
            value={syncFilter}
            onChange={(event) =>
              onSyncChange(event.target.value)
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-200 outline-none transition focus:border-indigo-500"
          >
            <option value="">All</option>
            <option value="synced">Synced</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </label>
      </div>
    </div>
  )
}

export default LeadFilters