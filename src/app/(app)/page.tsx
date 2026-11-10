import TodayView from "@/components/TodayView";

export default function TodayPage() {
  return <TodayView aiEnabled={Boolean(process.env.ANTHROPIC_API_KEY)} />;
}
