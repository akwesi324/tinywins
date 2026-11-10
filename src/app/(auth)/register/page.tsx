import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/AuthForms";
import { panel } from "@/lib/colors";

export const metadata: Metadata = { title: "Create your account" };

export default function RegisterPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-black">Let&apos;s plan some wins ✨</h1>
      <div className={panel}>
        <RegisterForm />
      </div>
      <p className="text-center font-bold">
        Already have an account? <Link href="/login" className="text-fuchsia-600">Sign in</Link>
      </p>
    </div>
  );
}
