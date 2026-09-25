function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white">
          LeadFlow
        </h1>

        <p className="mt-4 text-lg text-slate-400">
          Capture the connection. Preserve the context.
        </p>

        <button className="mt-8 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-500">
          Start Capturing
        </button>
      </div>
    </main>
  )
}

export default App