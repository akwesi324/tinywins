import type { Metadata } from "next";
import FocusView from "@/components/FocusView";

export const metadata: Metadata = { title: "Focus" };

export default async function NowPage({ searchParams }: PageProps<"/now">) {
  const { task, minutes } = await searchParams;
  const mins = typeof minutes === "string" ? Number(minutes) : NaN;
  return (
    <FocusView
      taskId={typeof task === "string" && /^[0-9a-f-]{36}$/i.test(task) ? task : null}
      minutes={Number.isInteger(mins) && mins >= 1 && mins <= 60 ? mins : null}
    />
  );
}
