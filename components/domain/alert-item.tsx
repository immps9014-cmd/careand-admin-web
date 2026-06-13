import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
type AlertSeverity = "crit" | "warn" | "watch";
interface AlertItemProps { severity: AlertSeverity; name: string; chipLabel: string; desc: string; score: number; elapsed: string; action: string; }
const S: Record<AlertSeverity, { bg: string; bar: string; tag: string; chip: string; elapsed: string }> = {
  crit:  { bg: "bg-danger-bg",  bar: "bg-danger",    tag: "bg-danger text-white",    chip: "bg-danger text-white",    elapsed: "text-danger font-bold" },
  warn:  { bg: "bg-warn-bg",    bar: "bg-warn",      tag: "bg-warn text-white",      chip: "bg-warn text-white",      elapsed: "text-warm-600 font-semibold" },
  watch: { bg: "bg-[#FBF3DC]",  bar: "bg-[#E8A800]", tag: "bg-[#E8A800] text-white", chip: "bg-[#E8A800] text-white", elapsed: "text-warm-500" },
};
export function AlertItem({ severity, name, chipLabel, desc, score, elapsed, action }: AlertItemProps) {
  const s = S[severity];
  return (
    <div className={cn("flex gap-3 p-3 rounded-xl mb-1.5 border border-transparent cursor-pointer transition-transform hover:translate-x-0.5", s.bg)}>
      <div className={cn("w-1 rounded-full self-stretch flex-none", s.bar)} />
      <div className={cn("w-10 h-10 rounded-xl flex flex-col items-center justify-center font-extrabold flex-none leading-none", s.tag)}>
        <span className="text-sm">{score}</span><span className="text-[8.5px] opacity-85 mt-0.5 font-bold">점</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap"><span className="text-sm font-bold text-warm-800">{name}</span><span className={cn("text-[10.5px] font-extrabold px-1.5 py-px rounded-md", s.chip)}>{chipLabel}</span></div>
        <div className="text-xs text-warm-600 mt-0.5">{desc}</div>
        <div className={cn("flex items-center gap-1 mt-1.5 text-[11px]", s.elapsed)}><Clock className="w-3 h-3 flex-none" />{elapsed}</div>
      </div>
      <button className="self-center text-xs font-bold text-warm-600 bg-white border border-warm-200 rounded-lg px-2.5 py-1.5 flex-none hover:border-warm-300 hover:text-warm-800 transition-colors whitespace-nowrap">{action}</button>
    </div>
  );
}
