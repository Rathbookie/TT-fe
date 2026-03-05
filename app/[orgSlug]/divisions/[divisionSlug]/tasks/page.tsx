import TasksPage from "@/app/tasks/page"

type Props = {
  params: {
    divisionSlug: string
  }
}

export default function DivisionTaskEnginePage({ params }: Props) {
  return <TasksPage divisionSlugOverride={params.divisionSlug} />
}
