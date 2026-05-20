export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Threads Monitoring & Analytics</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Dashboard untuk monitoring dan analytics Threads
        </p>
        <div className="mt-8">
          <a
            href="/login"
            className="rounded-md bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
          >
            Login
          </a>
        </div>
      </div>
    </div>
  );
}
