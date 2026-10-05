export function formatDate(value) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function getInitials(lead) {
  const firstName = lead.first_name?.trim() || ''
  const lastName = lead.last_name?.trim() || ''

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`

  return initials.toUpperCase() || '?'
}

export function getLeadName(lead) {
  return (
    [lead.first_name, lead.last_name]
      .filter(Boolean)
      .join(' ') || 'Unnamed Lead'
  )
}

export function isLeadSynced(lead) {
  const syncStatus = lead.sync_status?.toLowerCase()

  return (
    syncStatus === 'success' ||
    syncStatus === 'synced' ||
    Boolean(lead.salesforce_lead_id)
  )
}

export function isLeadSyncFailed(lead) {
  return lead.sync_status?.toLowerCase() === 'failed'
}