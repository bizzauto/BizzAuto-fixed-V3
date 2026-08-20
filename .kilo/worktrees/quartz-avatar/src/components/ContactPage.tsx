import React, { useState } from 'react';
import Footer from './Footer';
import { Mail, Phone, MapPin, MessageSquare, Send, Clock, CheckCircle } from 'lucide-react';

const ContactPage: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setForm({ name: '', email: '', phone: '', subject: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white py-16 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Get in Touch</h1>
          <p className="text-xl text-blue-100">Have questions? We'd love to hear from you.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Email Us</h3>
                  <p className="text-gray-600 text-sm">support@BizzAuto Solutions.in</p>
                  <p className="text-gray-600 text-sm">sales@BizzAuto Solutions.in</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center text-green-600 flex-shrink-0">
                  <Phone size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Call Us</h3>
                  <p className="text-gray-600 text-sm">+91 98765 43210</p>
                  <p className="text-gray-600 text-sm">Mon-Sat, 9 AM - 6 PM IST</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 flex-shrink-0">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">WhatsApp</h3>
                  <p className="text-gray-600 text-sm">+91 98765 43210</p>
                  <p className="text-gray-600 text-sm">Quick responses within minutes</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600 flex-shrink-0">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Office</h3>
                  <p className="text-gray-600 text-sm">Mumbai, Maharashtra, India</p>
                  <p className="text-gray-600 text-sm">400001</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center text-green-600 flex-shrink-0">
                  <Clock size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Support Hours</h3>
                  <p className="text-gray-600 text-sm">Monday - Saturday: 9 AM - 6 PM IST</p>
                  <p className="text-gray-600 text-sm">Sunday: Emergency support only</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
              {sent ? (
                <div className="text-center py-12">
                  <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                  <p className="text-gray-600 mb-6">We'll get back to you within 24 hours.</p>
                  <button onClick={() => setSent(false)} className="text-blue-600 font-medium hover:underline">
                    Send another message
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a message</h2>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                        <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Your name" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="you@company.com" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="+91 XXXXX XXXXX" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                        <select value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                          <option value="">Select a topic</option>
                          <option value="sales">Sales Inquiry</option>
                          <option value="support">Technical Support</option>
                          <option value="billing">Billing Question</option>
                          <option value="partnership">Partnership</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                      <textarea value={form.message} onChange={(e) => setForm({...form, message: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={5} placeholder="How can we help you?" required />
                    </div>
                    <button type="submit"
                      className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-2">
                      Send Message <Send size={18} />
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ContactPage;
