/**
 * Provider presets for the generic webhook channel. Each preset seeds a
 * best-effort field mapping (incoming path -> canonical field). Incoming keys
 * support dot paths for nested JSON (see the /api/lead/[key] endpoint).
 * These are starting points admins can refine per integration.
 */
export type ProviderPreset = {
  id: string
  label: string
  fieldMapping: Record<string, string>
  hint: string
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: "generic",
    label: "Generic / custom",
    fieldMapping: {},
    hint: "Post JSON or form data using the canonical field names (name, email, phone, message).",
  },
  {
    id: "zapier",
    label: "Zapier / Make",
    fieldMapping: {},
    hint: "In Zapier's Webhooks action, POST JSON with keys name, email, phone, message to this URL.",
  },
  {
    id: "typeform",
    label: "Typeform",
    fieldMapping: {
      "form_response.hidden.email": "email",
      "form_response.hidden.name": "name",
      "form_response.hidden.phone": "phone",
    },
    hint: "Map Typeform hidden fields (email/name/phone) or refine the mapping per form.",
  },
  {
    id: "calendly",
    label: "Calendly",
    fieldMapping: {
      "payload.email": "email",
      "payload.name": "name",
      "payload.questions_and_answers.0.answer": "message",
    },
    hint: "Uses Calendly invitee.created payload fields.",
  },
  {
    id: "jotform",
    label: "Jotform",
    fieldMapping: {
      email: "email",
      fullName: "name",
      phone: "phone",
      message: "message",
    },
    hint: "Uses Jotform's flattened field names; adjust to your form's field IDs.",
  },
  {
    id: "google_forms",
    label: "Google Forms",
    fieldMapping: {
      email: "email",
      name: "name",
      phone: "phone",
      message: "message",
    },
    hint: "Send via an Apps Script webhook posting your question titles as keys.",
  },
  {
    id: "facebook_lead_ads",
    label: "Facebook Lead Ads",
    fieldMapping: {
      email: "email",
      full_name: "name",
      phone_number: "phone",
    },
    hint: "Uses flattened Facebook lead fields; connect via a forwarder that flattens field_data.",
  },
]

export function providerPreset(id: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find((p) => p.id === id)
}
