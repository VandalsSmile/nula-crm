"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DollarSign, Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { recordPurchase } from "@/app/actions/contacts"

export function RecordPurchaseDialog({
  open,
  onOpenChange,
  contactId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactId: string
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [product, setProduct] = useState("")
  const [amount, setAmount] = useState("")

  async function handleSave() {
    if (!product.trim()) {
      toast.error("Product or service is required")
      return
    }
    setSaving(true)
    try {
      await recordPurchase({
        contactId,
        product,
        amountCents: Math.round(parseFloat(amount || "0") * 100),
      })
      toast.success("Purchase recorded")
      setProduct("")
      setAmount("")
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record purchase")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record purchase</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>Product / service</FieldLabel>
            <Input
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="NAD+ IV drip"
            />
          </Field>
          <Field>
            <FieldLabel>Amount ($)</FieldLabel>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="150.00"
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <DollarSign />}
            Record purchase
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
