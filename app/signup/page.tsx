import Link from "next/link";
import AuthForm from "../AuthForm";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-teal-50 to-emerald-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white/90 backdrop-blur rounded-lg shadow">
        <h1 className="text-3xl font-bold text-center text-gray-800">Create Account</h1>
        <AuthForm mode="signup" />
        <p className="text-sm text-center text-gray-700">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
