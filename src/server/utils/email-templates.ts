/**
 * Email Templates for Auto-Replies
 * Used when leads are captured from various sources
 */

export const emailTemplates = {
  // Welcome email for new leads
  welcome: (name: string, businessName: string, product?: string) => ({
    subject: `Welcome to ${businessName}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb;">
        <div style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to ${businessName}!</h1>
        </div>
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #374151;">Hi ${name},</p>
          <p style="color: #6B7280;">Thank you for your interest! We've received your inquiry${product ? ` about <strong>${product}</strong>` : ''}.</p>
          <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #374151;"><strong>What happens next?</strong></p>
            <ul style="color: #6B7280; margin: 10px 0;">
              <li>Our team will review your inquiry</li>
              <li>We'll get back to you within 24 hours</li>
              <li>You'll receive a WhatsApp message shortly</li>
            </ul>
          </div>
          <p style="color: #6B7280;">Need immediate assistance? Reply to this email or call us.</p>
          <p style="color: #6B7280;">Best regards,<br/>${businessName} Team</p>
        </div>
        <div style="padding: 20px; text-align: center; color: #9CA3AF; font-size: 12px;">
          <p>This email was sent to you because you contacted us through our website.</p>
        </div>
      </div>
    `,
  }),

  // Follow-up email
  followUp: (name: string, businessName: string, days: number = 3) => ({
    subject: `Following up on your inquiry - ${businessName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb;">
        <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Following Up</h1>
        </div>
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #374151;">Hi ${name},</p>
          <p style="color: #6B7280;">It's been ${days} days since your inquiry. We wanted to make sure you got the help you needed.</p>
          <p style="color: #6B7280;">Is there anything else we can help you with?</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="mailto:${businessName.toLowerCase().replace(/\s/g, '')}@example.com" style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reply to Us</a>
          </div>
          <p style="color: #6B7280;">Best regards,<br/>${businessName} Team</p>
        </div>
      </div>
    `,
  }),

  // Appointment confirmation
  appointmentConfirmation: (name: string, businessName: string, date: string, time: string, location?: string) => ({
    subject: `Appointment Confirmed - ${businessName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb;">
        <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Appointment Confirmed!</h1>
        </div>
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #374151;">Hi ${name},</p>
          <p style="color: #6B7280;">Your appointment has been confirmed:</p>
          <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
            <p style="margin: 5px 0; color: #92400E;"><strong>📅 Date:</strong> ${date}</p>
            <p style="margin: 5px 0; color: #92400E;"><strong>🕐 Time:</strong> ${time}</p>
            ${location ? `<p style="margin: 5px 0; color: #92400E;"><strong>📍 Location:</strong> ${location}</p>` : ''}
          </div>
          <p style="color: #6B7280;">Please arrive 5 minutes early. If you need to reschedule, let us know.</p>
          <p style="color: #6B7280;">Best regards,<br/>${businessName} Team</p>
        </div>
      </div>
    `,
  }),

  // Payment confirmation
  paymentConfirmation: (name: string, businessName: string, amount: string, plan: string, paymentId: string) => ({
    subject: `Payment Received - Thank You! - ${businessName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb;">
        <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Payment Confirmed!</h1>
        </div>
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #374151;">Hi ${name},</p>
          <p style="color: #6B7280;">We've received your payment!</p>
          <div style="background: #D1FAE5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
            <p style="margin: 5px 0; color: #065F46;"><strong>💰 Amount:</strong> ${amount}</p>
            <p style="margin: 5px 0; color: #065F46;"><strong>📦 Plan:</strong> ${plan}</p>
            <p style="margin: 5px 0; color: #065F46;"><strong>🔑 Payment ID:</strong> ${paymentId}</p>
          </div>
          <p style="color: #6B7280;">Your account is now active. You can start using all features immediately.</p>
          <p style="color: #6B7280;">Best regards,<br/>${businessName} Team</p>
        </div>
      </div>
    `,
  }),

  // Review request
  reviewRequest: (name: string, businessName: string, reviewUrl: string) => ({
    subject: `How was your experience with ${businessName}?`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb;">
        <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">We'd love your feedback!</h1>
        </div>
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #374151;">Hi ${name},</p>
          <p style="color: #6B7280;">Thank you for choosing ${businessName}! We hope you had a great experience.</p>
          <p style="color: #6B7280;">Would you mind taking a moment to leave us a review? It helps us serve you better!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${reviewUrl}" style="background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Leave a Review</a>
          </div>
          <p style="color: #6B7280;">Thank you for your support!</p>
          <p style="color: #6B7280;">Best regards,<br/>${businessName} Team</p>
        </div>
      </div>
    `,
  }),
};

export default emailTemplates;
