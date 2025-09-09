import AuthForm from "../AuthForm";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen">
      {/* Background video */}
      <video
        className="pointer-events-none absolute inset-0 h-full w-full object-cover motion-reduce:hidden hidden md:block"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        src="/852422-hd_1920_1080_24fps.mp4"
        aria-hidden="true"
      />

      {/* Contrast overlay */}
      <div className="absolute inset-0 bg-neutrals-900/20 backdrop-blur-[1px] hidden md:block" aria-hidden="true" />

      {/* Foreground content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="space-y-4 text-center rounded-3xl border border-accent-700 bg-neutrals-0/80 backdrop-blur-md p-6">
          <AuthForm mode="login" />
          <a href="/signup" className="text-small text-primary-500 underline">
            Need an account? Sign up
          </a>
        </div>
      </div>
    </div>
  );
}
