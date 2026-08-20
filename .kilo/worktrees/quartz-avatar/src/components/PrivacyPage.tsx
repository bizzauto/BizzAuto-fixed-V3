import React from 'react';
import Footer from './Footer';

const PrivacyPage: React.FC = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-4xl mx-auto px-8 py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-gray-500 mb-8">Last updated: April 8, 2026</p>

      <div className="space-y-6">
        {[
          {
            title: '1. Information We Collect',
            content: [
              'Account information: name, email, phone, business details',
              'Usage data: login times, features used, actions taken',
              'Communication data: WhatsApp messages, emails (with your consent)',
              'Payment data: processed securely through Razorpay (we do not store card details)',
              'Device info: IP address, browser, operating system',
            ],
          },
          {
            title: '2. How We Use Your Information',
            content: [
              'Provide and improve our services',
              'Process payments and send invoices',
              'Send service notifications and updates',
              'Analyze usage patterns to improve features',
              'Detect and prevent fraud or abuse',
              'Comply with legal obligations',
            ],
          },
          {
            title: '3. Data Sharing',
            content: [
              'We do NOT sell your personal data',
              'We share data with service providers (WhatsApp, AI APIs, payment processors) only as needed to deliver the service',
              'We may disclose data if required by law or court order',
              'In case of merger or acquisition, data may be transferred with your consent',
            ],
          },
          {
            title: '4. Data Security',
            content: [
              '256-bit AES encryption for sensitive data',
              'JWT-based authentication with refresh tokens',
              'Regular security audits and penetration testing',
              'Role-based access control within your organization',
              'Audit logs for all data access and modifications',
            ],
          },
          {
            title: '5. Your Rights',
            content: [
              'Access: Request a copy of your personal data',
              'Correction: Update inaccurate information',
              'Deletion: Request deletion of your data ("Right to be Forgotten")',
              'Export: Download your data in machine-readable format (CSV/JSON)',
              'Opt-out: Unsubscribe from marketing communications anytime',
            ],
          },
          {
            title: '6. Data Retention',
            content: [
              'We retain your data as long as your account is active',
              'After account deletion, data is permanently removed within 30 days',
              'Backups are retained for 90 days before permanent deletion',
            ],
          },
          {
            title: '7. Cookies',
            content: [
              'We use essential cookies for authentication and session management',
              'Analytics cookies to understand usage patterns',
              'You can disable cookies in your browser settings (may affect functionality)',
            ],
          },
          {
            title: '8. Third-Party Services',
            content: [
              'WhatsApp (Meta): Message delivery',
              'OpenRouter/AI Providers: Content generation',
              'Razorpay: Payment processing',
              'Google: Email and Sheets integration',
              'Each has their own privacy policies',
            ],
          },
          {
            title: '9. Compliance',
            content: [
              'We comply with India\'s Digital Personal Data Protection Act (DPDPA) 2023',
              'We follow GDPR principles for EU users',
              'We are WhatsApp Business API Policy compliant',
            ],
          },
          {
            title: '10. Contact Us',
            content: [
              '📧 privacy@bizzauto.in',
              '📞 +91 98765 43210',
              '📍 Mumbai, Maharashtra, India',
            ],
          },
        ].map((section, i) => (
          <section key={i} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{section.title}</h2>
            <ul className="text-gray-600 space-y-2">
              {section.content.map((item, j) => (
                <li key={j} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
    <Footer />
  </div>
);

export default PrivacyPage;
