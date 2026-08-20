import React from 'react';
import Footer from './Footer';

const TermsPage: React.FC = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-4xl mx-auto px-8 py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
      <p className="text-gray-500 mb-8">Last updated: April 8, 2026</p>

      <div className="prose prose-lg max-w-none">
        <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
          <p className="text-gray-600">By accessing or using BizzAuto Solutions ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</p>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
          <p className="text-gray-600">BizzAuto Solutions provides WhatsApp Business API integration, CRM, marketing automation, AI-powered content generation, and related business tools. We reserve the right to modify or discontinue features at any time.</p>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. User Accounts</h2>
          <ul className="text-gray-600 space-y-2">
            <li>You must provide accurate and complete information during registration.</li>
            <li>You are responsible for maintaining the security of your account credentials.</li>
            <li>You must notify us immediately of any unauthorized access.</li>
            <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
          </ul>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Acceptable Use</h2>
          <p className="text-gray-600 mb-2">You agree NOT to use the Service for:</p>
          <ul className="text-gray-600 space-y-2">
            <li>Sending spam or unsolicited messages</li>
            <li>Violating WhatsApp Business API policies</li>
            <li>Distributing malware, viruses, or harmful content</li>
            <li>Impersonating others or providing false information</li>
            <li>Attempting to access other users' data</li>
            <li>Reverse engineering or copying the Service</li>
          </ul>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Payment & Billing</h2>
          <ul className="text-gray-600 space-y-2">
            <li>All prices are in Indian Rupees (INR) unless stated otherwise.</li>
            <li>Free trial lasts 14 days. No credit card required.</li>
            <li>Subscriptions auto-renew until cancelled.</li>
            <li>Refunds are available within 7 days of purchase.</li>
            <li>We may change prices with 30 days notice.</li>
          </ul>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data & Privacy</h2>
          <p className="text-gray-600">We collect and process data as described in our Privacy Policy. You retain ownership of your data. We do not sell your data to third parties.</p>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Limitation of Liability</h2>
          <p className="text-gray-600">BizzAuto Solutions shall not be liable for any indirect, incidental, special, or consequential damages arising from use of the Service. Our total liability shall not exceed the amount paid by you in the 12 months preceding the claim.</p>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Governing Law</h2>
          <p className="text-gray-600">These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra.</p>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Contact</h2>
          <p className="text-gray-600">For questions about these terms, contact us at:</p>
          <p className="text-gray-900 font-medium mt-2">📧 legal@bizzauto.in | 📞 +91 98765 43210</p>
        </section>
      </div>
    </div>
    <Footer />
  </div>
);

export default TermsPage;
