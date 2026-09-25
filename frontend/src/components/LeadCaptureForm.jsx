import { useState } from 'react'
import { createLead } from '../services/api'

const initialForm = {
  first_name: '',
  last_name: '',
  company: '',
  email: '',
  phone: '',
  title: '',
  linkedin_url: '',
  event: '',
  capture_source: 'Event',
  notes: '',
  lead_interest: '',
  follow_up_action: '',
  status: 'New',
  rating: 'Warm',
}

function LeadCaptureForm() {
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setSubmitting(true)
    setResult(null)
    setError(null)

    try {
      const data = await createLead(form)

      setResult(data)

      setForm(initialForm)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function inputClassName() {
    return 'mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
      <div className="max-w-3xl">
        <span className="inline-flex rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400">
          Lead Capture
        </span>

        <h2 className="mt-4 text-2xl font-bold text-white">
          Capture a new lead
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          Capture the contact details and context that matter. LeadFlow will
          create the lead and synchronize it with Salesforce.
        </p>
      </div>

      {result && (
        <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <p className="font-semibold text-emerald-400">
            Lead captured successfully.
          </p>

          <p className="mt-1 text-sm text-slate-300">
            {result.sync_status === 'Synced'
              ? 'The lead has been synchronized with Salesforce.'
              : 'The lead was created, but Salesforce synchronization was not successful.'}
          </p>

          {result.salesforce_lead_id && (
            <p className="mt-2 text-xs text-slate-500">
              Salesforce Lead ID: {result.salesforce_lead_id}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
          <p className="font-semibold text-red-400">
            Unable to capture lead
          </p>

          <p className="mt-1 text-sm text-slate-300">
            {error}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Contact Information
          </h3>

          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                First Name *
              </span>

              <input
                required
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                placeholder="Michael"
                className={inputClassName()}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Last Name *
              </span>

              <input
                required
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                placeholder="Anderson"
                className={inputClassName()}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Company
              </span>

              <input
                name="company"
                value={form.company}
                onChange={handleChange}
                placeholder="LeadFlow Test Company"
                className={inputClassName()}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Job Title
              </span>

              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Revenue Operations Manager"
                className={inputClassName()}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Email
              </span>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="michael@example.com"
                className={inputClassName()}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Phone
              </span>

              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+1 615 555 0188"
                className={inputClassName()}
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-300">
                LinkedIn URL
              </span>

              <input
                type="url"
                name="linkedin_url"
                value={form.linkedin_url}
                onChange={handleChange}
                placeholder="https://www.linkedin.com/in/example"
                className={inputClassName()}
              />
            </label>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Event Context
          </h3>

          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Event
              </span>

              <input
                name="event"
                value={form.event}
                onChange={handleChange}
                placeholder="West Africa Dreamin 2026"
                className={inputClassName()}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Capture Source
              </span>

              <select
                name="capture_source"
                value={form.capture_source}
                onChange={handleChange}
                className={inputClassName()}
              >
                <option value="Event">Event</option>
                <option value="QR Code">QR Code</option>
                <option value="Badge Scan">Badge Scan</option>
                <option value="Business Card">Business Card</option>
                <option value="Manual">Manual</option>
                <option value="Other">Other</option>
              </select>
            </label>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Qualification & Context
          </h3>

          <div className="mt-4 space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Lead Interest
              </span>

              <input
                name="lead_interest"
                value={form.lead_interest}
                onChange={handleChange}
                placeholder="Salesforce Revenue Cloud"
                className={inputClassName()}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Follow-up Action
              </span>

              <input
                name="follow_up_action"
                value={form.follow_up_action}
                onChange={handleChange}
                placeholder="Schedule a discovery call"
                className={inputClassName()}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Notes
              </span>

              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows="4"
                placeholder="Capture anything important about the conversation..."
                className={inputClassName()}
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Lead Status
                </span>

                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className={inputClassName()}
                >
                  <option value="New">New</option>
                  <option value="Working">Working</option>
                  <option value="Nurturing">Nurturing</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Unqualified">Unqualified</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Lead Rating
                </span>

                <select
                  name="rating"
                  value={form.rating}
                  onChange={handleChange}
                  className={inputClassName()}
                >
                  <option value="Hot">Hot</option>
                  <option value="Warm">Warm</option>
                  <option value="Cold">Cold</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end border-t border-slate-800 pt-6">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Creating Lead...' : 'Create Lead'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default LeadCaptureForm