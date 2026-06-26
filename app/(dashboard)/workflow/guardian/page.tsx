import { WorkflowShell, FlowChart, GUARDIAN_STEPS } from "@/components/domain/workflow";

export default function Page() {
  return (
    <WorkflowShell title="보호자 업무흐름도" desc="어르신 등록부터 매칭 요청·모니터링·케어일지 열람·정산까지" accent="#3D7AB3">
      <FlowChart steps={GUARDIAN_STEPS} />
    </WorkflowShell>
  );
}
