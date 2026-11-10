import type { Metadata } from "next";
import { ForgotForm } from "@/components/AuthForms";
import { panel } from "@/lib/colors";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-black">Forgot your password? 🔑</h1>
      <p className="font-semibold text-slate-600 dark:text-slate-300">It happens! We&apos;ll email you a link to pick a new one.</p>
      <div className={panel}>
        <ForgotForm />
      </div>
    </div>
  );
}
