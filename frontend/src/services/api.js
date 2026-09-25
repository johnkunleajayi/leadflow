const API_BASE_URL = 'http://127.0.0.1:8000'

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    let errorMessage = 'An unexpected API error occurred.'

    try {
      const errorData = await response.json()

      if (typeof errorData.detail === 'string') {
        errorMessage = errorData.detail
      } else if (errorData.detail) {
        errorMessage = JSON.stringify(errorData.detail)
      }
    } catch {
      errorMessage = response.statusText || errorMessage
    }

    throw new Error(errorMessage)
  }

  return response.json()
}

export async function getSalesforceStatus() {
  return request('/api/v1/salesforce/status')
}

export async function getLeads() {
  return request('/api/v1/leads')
}

export async function createLead(leadData) {
  return request('/api/v1/leads', {
    method: 'POST',
    body: JSON.stringify(leadData),
  })
}

export function getSalesforceLoginUrl() {
  return `${API_BASE_URL}/api/v1/salesforce/login`
}