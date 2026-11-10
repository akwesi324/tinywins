import type { Metadata } from "next";
import SettingsView from "@/components/SettingsView";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <SettingsView vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null} />;
}
