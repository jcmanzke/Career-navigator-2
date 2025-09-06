import Link from "next/link";
import AuthForm from "../AuthForm";

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-4">
      <AuthForm mode="signup" />
      <p className="text-sm">
        Already have an account? <Link href="/login" className="text-blue-600 underline">Log in</Link>
      </p>
    </div>
  );
}
