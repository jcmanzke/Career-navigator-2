import AuthForm from "../AuthForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-4 text-center">
        <AuthForm mode="login" />
        <a
          href="/signup"
          className="text-small text-primary-500 underline"
        >
          Need an account? Sign up
        </a>
      </div>
    </div>
  );
}
