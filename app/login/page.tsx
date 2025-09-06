import Link from "next/link";
import AuthForm from "../AuthForm";

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-4">
      <AuthForm mode="login" />
      <p className="text-sm">
        Don't have an account? <Link href="/signup" className="text-blue-600 underline">Sign up</Link>
      </p>
    </div>
  );
}
