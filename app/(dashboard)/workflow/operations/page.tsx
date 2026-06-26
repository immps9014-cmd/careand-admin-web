import { WorkflowShell, FlowChart, ADMIN_STEPS } from "@/components/domain/workflow";

export default function Page() {
  return (
    <WorkflowShell title="관리자(운영) 업무흐름도" desc="자격검수·매칭 모니터링·일지 검수·정산 확정·리포트 운영 흐름" accent="#C25450">
      <FlowChart steps={ADMIN_STEPS} />
    </WorkflowShell>
  );
}
