import Link from "next/link";
import AuthForm from "../AuthForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800/70 backdrop-blur rounded-lg shadow-xl">
        <h1 className="text-3xl font-bold text-center">Welcome Back</h1>
        <AuthForm mode="login" />
        <p className="text-sm text-center text-gray-300">
          Don't have an account?{" "}
          <Link href="/signup" className="text-indigo-400 underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
