import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-3xl grid gap-8">
        <h1 className="text-3xl font-semibold text-center">Attendance App</h1>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-medium mb-4">Student</h2>
            <div className="flex gap-3">
              <Link href="/student/register" className="px-4 py-2 rounded bg-black text-white">Register</Link>
              <Link href="/student/login" className="px-4 py-2 rounded border">Login</Link>
            </div>
          </div>
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-medium mb-4">Teacher</h2>
            <div className="flex gap-3">
              <Link href="/teacher/register" className="px-4 py-2 rounded bg-black text-white">Register</Link>
              <Link href="/teacher/login" className="px-4 py-2 rounded border">Login</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
