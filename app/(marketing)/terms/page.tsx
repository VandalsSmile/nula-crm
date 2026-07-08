import { LegalSection, LegalShell } from "@/components/marketing/legal-shell"

export const metadata = {
  title: "Terms of Service — Nula CRM",
  description: "The terms that govern your use of Nula CRM.",
  alternates: { canonical: "/terms" },
}

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms of Service"
      updated="July 8, 2026"
      intro="These Terms of Service (the “Terms”) govern your access to and use of Nula CRM (the “Service”). By creating an account or using the Service, you agree to these Terms. If you are using Nula on behalf of an organization, you agree on its behalf."
    >
      <LegalSection heading="1. The service">
        <p>
          Nula CRM is an AI-assisted customer relationship management tool for small businesses. It
          helps you capture leads, organize contacts, run campaigns and automations, and use AI
          features such as the command bar, lead scoring, summaries, and drafted messages.
        </p>
      </LegalSection>

      <LegalSection heading="2. Accounts & eligibility">
        <p>
          You must provide accurate information and are responsible for keeping your login credentials
          secure and for all activity under your account. You must be at least 18 years old and able
          to form a binding contract. Account owners may invite teammates and assign roles (Owner,
          Admin, Member); the owner is responsible for their team&apos;s use of the Service.
        </p>
      </LegalSection>

      <LegalSection heading="3. Free trial">
        <p>
          We offer a 14-day free trial, no credit card required. At the end of the trial you may
          subscribe to continue using the Service. We may change trial terms at any time.
        </p>
      </LegalSection>

      <LegalSection heading="4. Subscriptions, billing & renewals">
        <ul>
          <li>Paid plans are billed per active user on a monthly or annual basis, plus applicable taxes.</li>
          <li>Subscriptions renew automatically until cancelled. You can cancel anytime; access continues through the end of the current billing period.</li>
          <li>Payments are processed by our payment provider (Stripe). By subscribing you authorize recurring charges.</li>
          <li>Except where required by law, fees are non-refundable. We may change pricing with reasonable notice; changes apply to the next billing period.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. Acceptable use">
        <p>You agree not to use the Service to:</p>
        <ul>
          <li>Break the law or infringe others&apos; rights.</li>
          <li>
            Send messages that violate anti-spam or communications laws (for example, CAN-SPAM,
            CASL, GDPR, or TCPA). You are responsible for having a lawful basis and appropriate
            consent to contact the people in your account.
          </li>
          <li>Upload malware, attempt to breach security, or disrupt the Service.</li>
          <li>Resell, reverse engineer, or abuse the Service, its AI features, or usage allowances.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="6. AI features">
        <p>
          AI features generate suggestions, summaries, and drafts to assist you. AI output can be
          inaccurate or incomplete — you are responsible for reviewing and approving anything before
          you act on it or send it. AI usage is included with your plan subject to a fair-use
          allowance; if you exceed it, some AI features may be temporarily limited.
        </p>
      </LegalSection>

      <LegalSection heading="7. Your content & data">
        <p>
          You retain all rights to the data you put into Nula (your contacts, messages, and other
          content). You grant us a limited license to host, process, and display that data solely to
          provide and improve the Service for you. You can export your data at any time. You are
          responsible for your data and for having the rights to use it.
        </p>
      </LegalSection>

      <LegalSection heading="8. Third-party services">
        <p>
          The Service relies on third parties, including cloud hosting, our payment processor
          (Stripe), email delivery (Resend), and AI model providers. Your use may be subject to their
          terms, and we are not responsible for third-party services.
        </p>
      </LegalSection>

      <LegalSection heading="9. Intellectual property">
        <p>
          The Service, including its software, design, and content (excluding your data), is owned by
          Nula CRM and its licensors and is protected by law. We grant you a limited, non-exclusive,
          non-transferable right to use the Service per these Terms.
        </p>
      </LegalSection>

      <LegalSection heading="10. Termination">
        <p>
          You may stop using the Service at any time. We may suspend or terminate access if you
          violate these Terms or to protect the Service. On termination, your right to use the
          Service ends; you may export your data before your account is closed, subject to our
          retention practices.
        </p>
      </LegalSection>

      <LegalSection heading="11. Disclaimers">
        <p>
          The Service is provided “as is” and “as available” without warranties of any kind, to the
          fullest extent permitted by law. We do not warrant that the Service will be uninterrupted,
          error-free, or that AI output will be accurate.
        </p>
      </LegalSection>

      <LegalSection heading="12. Limitation of liability">
        <p>
          To the maximum extent permitted by law, Nula CRM will not be liable for any indirect,
          incidental, special, consequential, or punitive damages, or for lost profits or data. Our
          total liability for any claim relating to the Service will not exceed the amount you paid us
          in the 12 months before the claim.
        </p>
      </LegalSection>

      <LegalSection heading="13. Indemnification">
        <p>
          You agree to indemnify and hold Nula CRM harmless from claims arising out of your data,
          your use of the Service, or your violation of these Terms or applicable law.
        </p>
      </LegalSection>

      <LegalSection heading="14. Changes to these Terms">
        <p>
          We may update these Terms from time to time. If we make material changes, we&apos;ll
          provide notice (for example, by email or in-app). Continued use after changes take effect
          means you accept the updated Terms.
        </p>
      </LegalSection>

      <LegalSection heading="15. Contact">
        <p>
          Questions about these Terms? Email us at{" "}
          <a href="mailto:info@nulacrm.ai">info@nulacrm.ai</a>.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
