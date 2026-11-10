import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
      <Link href="/welcome" className="mb-8 flex items-center gap-2 text-2xl font-black">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 text-2xl shadow-lg" aria-hidden>
          🌟
        </span>
        TinyWins
      </Link>
      <main className="flex-1">{children}</main>
    </div>
  );
}
