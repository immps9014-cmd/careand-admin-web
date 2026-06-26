import { WorkflowShell, FlowChart, OVERVIEW_STEPS } from "@/components/domain/workflow";

export default function Page() {
  return (
    <WorkflowShell title="전체 업무흐름도" desc="가입·온보딩 → 매칭 → 돌봄 수행 → 기록·검수 → 정산 (서비스 생애 전체 주기)" accent="#7C4DFF">
      <FlowChart steps={OVERVIEW_STEPS} />
    </WorkflowShell>
  );
}
