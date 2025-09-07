import AuthForm from "../AuthForm";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-4 text-center">
        <AuthForm mode="signup" />
        <a
          href="/login"
          className="text-small text-primary-500 underline"
        >
          Have an account? Log in
        </a>
      </div>
    </div>
  );
}
