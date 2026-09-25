import SalesforceStatus from '../components/SalesforceStatus'
import ScanCapture from '../components/ScanCapture'

function Dashboard() {
  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="flex flex-col gap-6 border-b border-slate-800 pb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">
              LeadFlow
            </p>

            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
              Capture the connection.
            </h1>

            <p className="mt-3 max-w-2xl text-slate-400">
              Preserve the context. Capture meaningful lead information and
              synchronize it with your CRM.
            </p>
          </div>

          <div className="w-full md:w-auto md:min-w-[320px]">
            <SalesforceStatus />
          </div>
        </header>

        <ScanCapture />
      </div>
    </main>
  )
}

export default Dashboard