import { WorkflowShell, FlowChart, CAREGIVER_STEPS } from "@/components/domain/workflow";

export default function Page() {
  return (
    <WorkflowShell title="돌봄전문가 업무흐름도" desc="가입·자격검증부터 매칭 수락·출퇴근·기록·정산·성장까지" accent="#3F7D52">
      <FlowChart steps={CAREGIVER_STEPS} />
    </WorkflowShell>
  );
}
