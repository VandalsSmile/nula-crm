"use client"

import { useState } from "react"
import { Check, Loader2, MailX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { resubscribe, submitUnsubscribe } from "@/app/actions/unsubscribe"

export function UnsubscribeView({
  token,
  email,
  initiallyOptedOut,
}: {
  token: string
  email: string
  initiallyOptedOut: boolean
}) {
  const [optedOut, setOptedOut] = useState(initiallyOptedOut)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function handleUnsubscribe() {
    setBusy(true)
    setError("")
    try {
      const res = await submitUnsubscribe(token)
      if (res.ok) setOptedOut(true)
      else setError("Something went wrong. Please try again.")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  async function handleResubscribe() {
    setBusy(true)
    setError("")
    try {
      const res = await resubscribe(token)
      if (res.ok) setOptedOut(false)
      else setError("Something went wrong. Please try again.")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  if (optedOut) {
    return (
      <div className="text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
          <Check className="size-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">You&rsquo;re unsubscribed</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {email ? <span className="font-medium text-foreground">{email}</span> : "You"} will no
          longer receive marketing emails from us.
        </p>
        <p className="mt-6 text-sm text-muted-foreground">Changed your mind?</p>
        <Button variant="outline" className="mt-2" onClick={handleResubscribe} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : null}
          Resubscribe
        </Button>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <MailX className="size-6" />
      </div>
      <h1 className="mt-4 text-xl font-semibold">Unsubscribe</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Stop sending marketing emails to{" "}
        {email ? <span className="font-medium text-foreground">{email}</span> : "this address"}?
      </p>
      <Button className="mt-6 w-full" onClick={handleUnsubscribe} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : null}
        Unsubscribe me
      </Button>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
