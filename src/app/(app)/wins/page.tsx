import type { Metadata } from "next";
import WinsView from "@/components/WinsView";

export const metadata: Metadata = { title: "Wins" };

export default function WinsPage() {
  return <WinsView />;
}
