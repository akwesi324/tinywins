import Link from "next/link";
import { Logo } from "@/components/icons";
import Copyright from "@/components/Copyright";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
      <Link href="/welcome" className="mb-10 flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
        <Logo />
        TinyWins
      </Link>
      <main className="flex-1">{children}</main>
      <Copyright className="mt-10" />
    </div>
  );
}
