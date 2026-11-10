import type { Metadata } from "next";
import { ResetForm } from "@/components/AuthForms";
import { panel } from "@/lib/colors";

export const metadata: Metadata = { title: "New password" };

export default function ResetPage() {
  return (
    <div className="mx-auto max-w-md space-y-5 px-5 py-10">
      <h1 className="text-3xl font-black">Pick a new password 🔐</h1>
      <div className={panel}>
        <ResetForm />
      </div>
    </div>
  );
}
