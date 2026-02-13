export default function Sidebar() {
  return (
    <div className="w-56 border-r bg-white p-6">
      <h2 className="text-sm font-medium text-neutral-500 mb-6">
        Task Tracker
      </h2>

      <nav className="space-y-3 text-sm">
        <div className="text-neutral-900">Tasks</div>
        <div className="text-neutral-400">Settings</div>
      </nav>
    </div>
  )
}
