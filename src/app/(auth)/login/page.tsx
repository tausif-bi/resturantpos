"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface-container-lowest rounded-2xl shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 w-14 h-14 primary-gradient rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-white text-2xl">restaurant</span>
        </div>
        <h1 className="text-2xl font-black font-headline text-on-surface">
          Welcome Back
        </h1>
        <p className="text-sm text-secondary mt-1">
          Sign in to your RestroPOS account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-error-container/50 text-on-error-container px-4 py-3 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 block">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@restaurant.com"
            required
            autoComplete="email"
            className="w-full px-0 py-3 text-sm font-medium border-b-2 border-stone-100 focus:border-primary focus:ring-0 bg-transparent transition-all placeholder:text-stone-300"
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 block">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
            className="w-full px-0 py-3 text-sm font-medium border-b-2 border-stone-100 focus:border-primary focus:ring-0 bg-transparent transition-all placeholder:text-stone-300"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full primary-gradient text-white h-14 rounded-xl font-headline font-bold text-base tracking-wider shadow-xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all uppercase disabled:opacity-50"
        >
          {loading ? (
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
          ) : (
            "Sign In"
          )}
        </button>

        <p className="text-center text-sm text-secondary">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary font-bold hover:underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
