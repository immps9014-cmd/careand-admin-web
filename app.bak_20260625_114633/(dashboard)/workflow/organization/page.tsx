import { WorkflowShell, FlowChart, ORG_STEPS } from "@/components/domain/workflow";

export default function Page() {
  return (
    <WorkflowShell title="기관 업무흐름도" desc="기관 가입·검수부터 소속 돌봄전문가 등록·매칭 배정·돌봄 모니터링·기관 정산까지" accent="#0E7C86">
      <FlowChart steps={ORG_STEPS} />
    </WorkflowShell>
  );
}
