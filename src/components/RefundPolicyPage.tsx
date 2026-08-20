import React from 'react';
import Footer from './Footer';

const RefundPolicyPage: React.FC = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-16">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Refund Policy</h1>
      <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8">Last updated: June 6, 2026</p>

      <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none">
        <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">1. Overview</h2>
          <p className="text-sm sm:text-base text-gray-600">
            At BizzAuto Solutions, we want you to be satisfied with your purchase. If you're not happy with our service, 
            we offer refunds under the conditions described below. This refund policy applies to all subscriptions and 
            purchases made through BizzAuto.
          </p>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">2. Free Trial</h2>
          <ul className="text-sm sm:text-base text-gray-600 space-y-1.5 sm:space-y-2">
            <li>BizzAuto offers a 7-day free trial for new users.</li>
            <li>No credit card is required to start the free trial.</li>
            <li>You can cancel anytime during the trial without any charges.</li>
            <li>If you do not cancel before the trial ends, your subscription will begin automatically.</li>
          </ul>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">3. Refund Eligibility</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-2">You may be eligible for a refund if:</p>
          <ul className="text-sm sm:text-base text-gray-600 space-y-1.5 sm:space-y-2">
            <li>You request a refund within <strong>7 days</strong> of your initial purchase or renewal.</li>
            <li>The service has a major defect or outage that we failed to resolve within a reasonable time.</li>
            <li>You were charged incorrectly or charged after cancellation.</li>
          </ul>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">4. Non-Refundable Items</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-2">The following are NOT eligible for refunds:</p>
          <ul className="text-sm sm:text-base text-gray-600 space-y-1.5 sm:space-y-2">
            <li>Requests made more than 7 days after the purchase or renewal date.</li>
            <li>Add-on services, including WhatsApp message credits beyond included limits.</li>
            <li>Custom development or setup services.</li>
            <li>Third-party fees (e.g., WhatsApp Business API charges, payment gateway fees).</li>
            <li>Accounts terminated for violating our Terms of Service.</li>
          </ul>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">5. How to Request a Refund</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-2">To request a refund:</p>
          <ul className="text-sm sm:text-base text-gray-600 space-y-1.5 sm:space-y-2">
            <li>Contact our support team at <strong>support@bizzauto.com</strong> or through the in-app support chat.</li>
            <li>Provide your account email, transaction ID, and reason for the refund request.</li>
            <li>We will review your request within <strong>3-5 business days</strong>.</li>
          </ul>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">6. Refund Processing</h2>
          <ul className="text-sm sm:text-base text-gray-600 space-y-1.5 sm:space-y-2">
            <li>Approved refunds will be processed within <strong>7-10 business days</strong>.</li>
            <li>Refunds will be credited to the original payment method.</li>
            <li>Bank processing times may vary (typically 5-7 additional business days).</li>
            <li>You will receive an email confirmation when the refund is processed.</li>
          </ul>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">7. Cancellation vs. Refund</h2>
          <ul className="text-sm sm:text-base text-gray-600 space-y-1.5 sm:space-y-2">
            <li><strong>Cancellation:</strong> You can cancel your subscription anytime. Your access will continue until the end of the current billing period.</li>
            <li><strong>Refund:</strong> A refund reverses the charge and may end your access immediately, depending on the reason.</li>
            <li>Cancelling does not automatically generate a refund. You must request one separately.</li>
          </ul>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">8. Disputes</h2>
          <p className="text-sm sm:text-base text-gray-600">
            If you have a billing dispute, please contact us first at <strong>billing@bizzauto.com</strong>. 
            We will work with you to resolve the issue. Filing a chargeback without contacting us first may 
            result in account suspension.
          </p>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">9. Changes to This Policy</h2>
          <p className="text-sm sm:text-base text-gray-600">
            We reserve the right to update this refund policy at any time. Changes will be posted on this page 
            with an updated "Last updated" date. Your continued use of the service constitutes acceptance of 
            any changes.
          </p>
        </section>

        <section className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">10. Contact Us</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-2">For refund requests or billing questions:</p>
          <ul className="text-sm sm:text-base text-gray-600 space-y-1.5 sm:space-y-2">
            <li><strong>Email:</strong> billing@bizzauto.com</li>
            <li><strong>Support:</strong> support@bizzauto.com</li>
            <li><strong>Response Time:</strong> Within 24 hours on business days</li>
          </ul>
        </section>
      </div>
    </div>
    <Footer />
  </div>
);

export default RefundPolicyPage;