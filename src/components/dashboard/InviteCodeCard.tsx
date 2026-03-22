// FILE: src/components/dashboard/InviteCodeCard.tsx
// ACTION: NEW
//
// Shows the SACCO's unique invite code (the SACCO ID).
// Admin copies this and shares with members so they can join.
// Includes a copy-to-clipboard button.

"use client"

import { useState } from "react"
import { Copy, Check, Users, Share2 } from "lucide-react"

export default function InviteCodeCard({
  saccoId,
  saccoName,
}: {
  saccoId:   string
  saccoName: string
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(saccoId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="bg-gradient-to-br from-green-700 to-green-600 rounded-2xl p-6 text-white">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white"
                style={{ fontFamily: "var(--font-heading, serif)" }}>
              Member Invite Code
            </h3>
            <p className="text-green-200 text-xs">Share this with members so they can join {saccoName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-full">
          <Users className="w-3 h-3 text-green-100" />
          <span className="text-green-100 text-xs font-medium">Join Code</span>
        </div>
      </div>

      {/* The code */}
      <div className="bg-black/20 rounded-xl p-4 mb-4">
        <p className="text-xs text-green-300 mb-1">SACCO Code</p>
        <p className="font-mono text-sm text-white break-all leading-relaxed">
          {saccoId}
        </p>
      </div>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
          copied
            ? "bg-white text-green-700"
            : "bg-white/20 hover:bg-white/30 text-white"
        }`}
      >
        {copied ? (
          <><Check className="w-4 h-4" /> Copied to clipboard!</>
        ) : (
          <><Copy className="w-4 h-4" /> Copy invite code</>
        )}
      </button>

      <p className="text-green-200 text-xs text-center mt-3">
        Members paste this code when they select &quot;Join a SACCO&quot; during registration.
      </p>
    </div>
  )
}
