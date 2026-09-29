export function parseQRValue(value) {
  const rawValue = value?.trim()

  if (!rawValue) {
    return {
      type: 'unknown',
      rawValue: '',
      contact: null,
    }
  }

  if (
    rawValue.toLowerCase().startsWith('begin:vcard')
  ) {
    return {
      type: 'vcard',
      rawValue,
      contact: parseVCard(rawValue),
    }
  }

  if (
    rawValue.startsWith('http://') ||
    rawValue.startsWith('https://')
  ) {
    return {
      type: 'url',
      rawValue,
      contact: null,
    }
  }

  return {
    type: 'text',
    rawValue,
    contact: null,
  }
}

function parseVCard(value) {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const contact = {
    first_name: '',
    last_name: '',
    company: '',
    email: '',
    phone: '',
    title: '',
    linkedin_url: '',
    notes: '',
  }

  for (const line of lines) {
    const separatorIndex = line.indexOf(':')

    if (separatorIndex === -1) {
      continue
    }

    const property = line
      .slice(0, separatorIndex)
      .toUpperCase()

    const propertyValue = line
      .slice(separatorIndex + 1)
      .trim()

    if (!propertyValue) {
      continue
    }

    if (property.startsWith('FN')) {
      const nameParts = propertyValue.split(/\s+/)

      contact.first_name = nameParts.shift() || ''
      contact.last_name = nameParts.join(' ')
    }

    if (property.startsWith('N;') || property === 'N') {
      const parts = propertyValue.split(';')

      contact.last_name = parts[0] || contact.last_name
      contact.first_name = parts[1] || contact.first_name
    }

    if (property.startsWith('ORG')) {
      contact.company = propertyValue
    }

    if (
      property.startsWith('EMAIL')
    ) {
      contact.email = propertyValue
    }

    if (
      property.startsWith('TEL')
    ) {
      contact.phone = propertyValue
    }

    if (
      property.startsWith('TITLE')
    ) {
      contact.title = propertyValue
    }

    if (
      property.startsWith('URL')
    ) {
      if (
        propertyValue
          .toLowerCase()
          .includes('linkedin.com')
      ) {
        contact.linkedin_url = propertyValue
      }
    }
  }

  return contact
}