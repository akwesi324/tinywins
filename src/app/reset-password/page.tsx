import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/AuthForms";
import { panel } from "@/lib/colors";

export const metadata: Metadata = { title: "New password" };

// The emailed link from Appwrite arrives as /reset-password?userId=...&secret=...
export default async function ResetPage({ searchParams }: PageProps<"/reset-password">) {
  const { userId, secret } = await searchParams;
  const valid = typeof userId === "string" && typeof secret === "string";
  return (
    <div className="mx-auto max-w-md space-y-5 px-5 py-10">
      <h1 className="text-3xl font-black">Pick a new password 🔐</h1>
      <div className={panel}>
        {valid ? (
          <ResetForm userId={userId} secret={secret} />
        ) : (
          <p className="font-semibold">
            This page needs the link from your reset email. <Link href="/forgot-password" className="text-fuchsia-600">Ask for a new one</Link>.
          </p>
        )}
      </div>
    </div>
  );
}
