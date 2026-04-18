"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    restaurantName: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      router.push("/login?registered=true");
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
          <span className="material-symbols-outlined text-white text-2xl">storefront</span>
        </div>
        <h1 className="text-2xl font-black font-headline text-on-surface">
          Create Account
        </h1>
        <p className="text-sm text-secondary mt-1">
          Register your restaurant on RestroPOS
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-error-container/50 text-on-error-container px-4 py-3 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 block">
            Restaurant Name
          </label>
          <input
            value={formData.restaurantName}
            onChange={(e) => updateField("restaurantName", e.target.value)}
            placeholder="My Restaurant"
            required
            className="w-full px-0 py-3 text-sm font-medium border-b-2 border-stone-100 focus:border-primary focus:ring-0 bg-transparent transition-all placeholder:text-stone-300"
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 block">
            Your Name
          </label>
          <input
            value={formData.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="John Doe"
            required
            className="w-full px-0 py-3 text-sm font-medium border-b-2 border-stone-100 focus:border-primary focus:ring-0 bg-transparent transition-all placeholder:text-stone-300"
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 block">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="admin@restaurant.com"
            required
            className="w-full px-0 py-3 text-sm font-medium border-b-2 border-stone-100 focus:border-primary focus:ring-0 bg-transparent transition-all placeholder:text-stone-300"
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 block">
            Phone
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder="+91 9876543210"
            className="w-full px-0 py-3 text-sm font-medium border-b-2 border-stone-100 focus:border-primary focus:ring-0 bg-transparent transition-all placeholder:text-stone-300"
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 block">
            Password
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => updateField("password", e.target.value)}
            placeholder="Minimum 8 characters"
            required
            minLength={8}
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
            "Create Account"
          )}
        </button>

        <p className="text-center text-sm text-secondary">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-bold hover:underline">
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
}
