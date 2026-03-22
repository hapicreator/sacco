"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, LogIn, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading]       = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)

    const email    = (event.currentTarget.elements.namedItem("email") as HTMLInputElement).value
    const password = (event.currentTarget.elements.namedItem("password") as HTMLInputElement).value

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setErrorMessage(error.message)
      setIsLoading(false)
      return
    }

    if (data.session) {
      window.location.href = "/dashboard"
    } else {
      setErrorMessage("Login failed. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 mb-2"
            style={{ fontFamily: "var(--font-heading, serif)" }}>
          Welcome back
        </h1>
        <p className="text-stone-500 text-sm">Sign in to your SACCO Smart Manager account</p>
      </div>

      {errorMessage && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-red-700 text-sm">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1.5">
            Email address
          </label>
          <input id="email" name="email" type="email" required
            autoComplete="email" placeholder="you@example.com" className="input-field" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="text-sm font-medium text-stone-700">Password</label>
            <Link href="/forgot-password" className="text-xs text-green-700 hover:text-green-800 font-medium">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input id="password" name="password"
              type={showPassword ? "text" : "password"} required
              autoComplete="current-password" placeholder="Enter your password"
              className="input-field pr-12" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={isLoading}
          className="btn-primary flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Signing in...
            </>
          ) : (
            <><LogIn className="w-4 h-4" /> Sign in</>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-green-700 hover:text-green-800 font-semibold">
          Create one free
        </Link>
      </p>
    </div>
  )
}
