// FILE: src/app/(auth)/register/page.tsx
// ACTION: REPLACE
// FIX: useState<string | null>(null), typed event handler, proper FormData typing

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword]       = useState(false)
  const [showConfirm, setShowConfirm]         = useState(false)
  const [isLoading, setIsLoading]             = useState(false)
  const [errorMessage, setErrorMessage]       = useState<string | null>(null)
  const [isSuccess, setIsSuccess]             = useState(false)
  const [password, setPassword]               = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const passwordStrong = password.length >= 8
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!passwordStrong) { setErrorMessage("Password must be at least 8 characters."); return }
    if (!passwordsMatch) { setErrorMessage("Passwords do not match."); return }

    setIsLoading(true)
    setErrorMessage(null)

    const form     = new FormData(event.currentTarget)
    const email    = (form.get("email") as string) ?? ""
    const fullName = (form.get("full_name") as string) ?? ""
    const phone    = (form.get("phone") as string) || null

    const supabase = createClient()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (authError) {
      setErrorMessage(authError.message)
      setIsLoading(false)
      return
    }

    if (authData.user) {
      await supabase.from("profiles").insert({
        id:        authData.user.id,
        full_name: fullName,
        phone:     phone,
      })
      // Redirect straight to onboarding
      router.push("/onboarding")
      router.refresh()
    } else {
      setErrorMessage("Signup failed. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 mb-2"
            style={{ fontFamily: "var(--font-heading, serif)" }}>
          Create your account
        </h1>
        <p className="text-stone-500 text-sm">Step 1 of 2 — Your personal account details</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-7">
        <div className="w-6 h-6 bg-green-700 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">1</span>
        </div>
        <span className="text-xs font-medium text-green-700">Account</span>
        <div className="flex-1 h-px bg-stone-200" />
        <div className="w-6 h-6 bg-stone-200 rounded-full flex items-center justify-center">
          <span className="text-stone-400 text-xs font-bold">2</span>
        </div>
        <span className="text-xs text-stone-400">SACCO Setup</span>
      </div>

      {errorMessage && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-red-700 text-sm">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-stone-700 mb-1.5">
            Full name
          </label>
          <input id="full_name" name="full_name" type="text" required
            autoComplete="name" placeholder="e.g. Amina Nakato" className="input-field" />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-stone-700 mb-1.5">
            Phone <span className="text-stone-400 font-normal">(optional)</span>
          </label>
          <input id="phone" name="phone" type="tel"
            autoComplete="tel" placeholder="+256 700 000 000" className="input-field" />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1.5">
            Email address
          </label>
          <input id="email" name="email" type="email" required
            autoComplete="email" placeholder="you@example.com" className="input-field" />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1.5">
            Password
          </label>
          <div className="relative">
            <input id="password" name="password"
              type={showPassword ? "text" : "password"} required
              autoComplete="new-password" placeholder="At least 8 characters"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="input-field pr-12" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {password.length > 0 && (
            <p className={`text-xs mt-1.5 ${passwordStrong ? "text-green-600" : "text-amber-600"}`}>
              {passwordStrong ? "✓ Strong enough" : "✗ Needs at least 8 characters"}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-stone-700 mb-1.5">
            Confirm password
          </label>
          <div className="relative">
            <input id="confirm" name="confirm"
              type={showConfirm ? "text" : "password"} required
              autoComplete="new-password" placeholder="Re-enter your password"
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field pr-12" />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1">
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword.length > 0 && (
            <p className={`text-xs mt-1.5 ${passwordsMatch ? "text-green-600" : "text-red-500"}`}>
              {passwordsMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
            </p>
          )}
        </div>

        <label className="flex items-start gap-3 cursor-pointer pt-1">
          <input type="checkbox" required
            className="mt-0.5 w-4 h-4 rounded border-stone-300 text-green-600 focus:ring-green-500" />
          <span className="text-xs text-stone-500 leading-relaxed">
            I agree to the Terms of Service and Privacy Policy
          </span>
        </label>

        <button type="submit" disabled={isLoading}
          className="btn-primary flex items-center justify-center gap-2 mt-1">
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating account...
            </>
          ) : (
            <><UserPlus className="w-4 h-4" /> Create account</>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-500">
        Already have an account?{" "}
        <Link href="/login" className="text-green-700 hover:text-green-800 font-semibold">
          Sign in
        </Link>
      </p>
    </div>
  )
}
