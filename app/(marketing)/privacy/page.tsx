import { LegalSection, LegalShell } from "@/components/marketing/legal-shell"

export const metadata = {
  title: "Privacy Policy — Nula CRM",
  description: "How Nula CRM collects, uses, and protects your information.",
  alternates: { canonical: "/privacy" },
}

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      updated="July 8, 2026"
      intro="This Privacy Policy explains how Nula CRM collects, uses, and protects information when you use our website and app. We keep it plain: we use your information to run the Service, we don’t sell it, and your CRM data belongs to you."
    >
      <LegalSection heading="1. Information we collect">
        <ul>
          <li>
            <strong>Account information</strong> — your name, email, password (hashed), company
            details, and role.
          </li>
          <li>
            <strong>CRM data you provide</strong> — the contacts, companies, deals, messages, notes,
            and other content you add to your workspace.
          </li>
          <li>
            <strong>Usage &amp; device data</strong> — how you interact with the Service, plus basic
            log and device information for security and reliability.
          </li>
          <li>
            <strong>Payment information</strong> — handled by Paddle, our Merchant of Record; we do
            not receive or store full card numbers.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. How we use information">
        <ul>
          <li>To provide, maintain, and improve the Service.</li>
          <li>To power features you request, including AI summaries, scoring, and drafts.</li>
          <li>To process payments and manage subscriptions.</li>
          <li>To provide support and send important service communications.</li>
          <li>To keep the Service secure and comply with legal obligations.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. AI processing">
        <p>
          To power AI features, relevant content (such as a lead&apos;s message or a contact&apos;s
          details) may be sent to our AI model providers to generate a summary, score, or draft. We
          use reputable providers and do not permit your data to be used to train their public models
          where that option is available. If AI is unavailable or your allowance is exceeded, Nula
          falls back to non-AI processing.
        </p>
      </LegalSection>

      <LegalSection heading="4. Controller vs processor">
        <p>
          For your account information, Nula CRM acts as the data controller. For the CRM data you
          load about your own customers and contacts, you are the controller and Nula acts as your
          processor — handling that data on your behalf to provide the Service.
        </p>
      </LegalSection>

      <LegalSection heading="5. How we share information">
        <p>We do not sell your personal information. We share it only with:</p>
        <ul>
          <li>
            <strong>Service providers (subprocessors)</strong> that help us operate — cloud hosting,
            our payment provider and Merchant of Record (Paddle), email delivery (Resend), and AI
            model providers — under confidentiality obligations.
          </li>
          <li>
            <strong>Authorities</strong> when required by law, or to protect rights, safety, and the
            integrity of the Service.
          </li>
          <li>
            <strong>A successor</strong> in the event of a merger, acquisition, or sale of assets,
            subject to this Policy.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="6. Cookies">
        <p>
          We use essential cookies to keep you signed in and to operate the Service, and limited
          analytics to understand usage and improve reliability. You can control cookies through your
          browser settings.
        </p>
      </LegalSection>

      <LegalSection heading="7. Data retention">
        <p>
          We retain your information for as long as your account is active or as needed to provide the
          Service. You can delete data or close your account, after which we delete or anonymize your
          information within a reasonable period, except where we must retain it for legal, security,
          or backup purposes.
        </p>
      </LegalSection>

      <LegalSection heading="8. Security">
        <p>
          We protect your data with encryption in transit, access controls, and reputable
          infrastructure. No method of transmission or storage is 100% secure, but we work hard to
          safeguard your information.
        </p>
      </LegalSection>

      <LegalSection heading="9. Your rights">
        <p>
          Depending on where you live (for example, under GDPR or CCPA/CPRA), you may have rights to
          access, correct, export, or delete your personal information, and to object to or restrict
          certain processing. You can export your data anytime from the app, or contact us to make a
          request. We will not discriminate against you for exercising these rights.
        </p>
      </LegalSection>

      <LegalSection heading="10. International transfers">
        <p>
          We may process and store information in the United States and other countries. Where
          required, we use appropriate safeguards for international transfers.
        </p>
      </LegalSection>

      <LegalSection heading="11. Children's privacy">
        <p>
          The Service is not intended for anyone under 18, and we do not knowingly collect personal
          information from children.
        </p>
      </LegalSection>

      <LegalSection heading="12. Changes to this Policy">
        <p>
          We may update this Policy from time to time. If we make material changes, we&apos;ll notify
          you (for example, by email or in-app). The “Last updated” date above reflects the latest
          revision.
        </p>
      </LegalSection>

      <LegalSection heading="13. Contact">
        <p>
          Questions or privacy requests? Email us at{" "}
          <a href="mailto:privacy@nulacrm.ai">privacy@nulacrm.ai</a>.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
