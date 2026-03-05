import DashboardPage from "@/app/dashboard/page"

type Props = {
  params: {
    divisionSlug: string
  }
}

export default function DivisionDashboardPage({ params }: Props) {
  const { divisionSlug } = params
  const title = `${divisionSlug} Dashboard`
  return (
    <DashboardPage
      key={divisionSlug}
      divisionSlugOverride={divisionSlug}
      titleOverride={title}
      subtitleOverride="Division dashboard with full widget capabilities and division-scoped task data."
      dashboardStorageKey={`workos_dashboard_division_${divisionSlug}`}
    />
  )
}
