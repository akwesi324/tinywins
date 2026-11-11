import AppShell from "@/components/AppShell";
import Copyright from "@/components/Copyright";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppShell footer={<Copyright className="mt-12" />}>{children}</AppShell>;
}
