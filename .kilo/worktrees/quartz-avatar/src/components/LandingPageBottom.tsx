import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, X, MessageSquare, Zap, Star, ChevronDown, ArrowRight } from 'lucide-react';
import Footer from './Footer';

interface Props {
  openFaq: number | null;
  setOpenFaq: (v: number | null) => void;
  showBackToTop: boolean;
}

const Section: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [inView, setInView] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.unobserve(el); } }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}>
      {children}
    </div>
  );
};

const LandingPageBottom: React.FC<Props> = ({ openFaq, setOpenFaq, showBackToTop }) => (
  <>
    {/* Comparison Table */}
    <Section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 rounded-full px-4 py-1.5 text-sm font-medium mb-4"><CheckCircle size={14} /> Why BizzAuto</div>
          <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">BizzAuto vs Others</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">See why businesses choose BizzAuto</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/10">
                <th className="text-left py-4 px-4 text-gray-500 dark:text-gray-400 font-medium">Feature</th>
                <th className="text-center py-4 px-4"><span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent font-bold text-lg">BizzAuto</span></th>
                <th className="text-center py-4 px-4 text-gray-500 dark:text-gray-400 font-medium">Others</th>
              </tr>
            </thead>
            <tbody>
              {[
                { f: 'WhatsApp API', us: true, them: false },
                { f: 'AI Chatbot', us: true, them: false },
                { f: 'Smart CRM', us: true, them: true },
                { f: 'Bulk Messaging', us: true, them: true },
                { f: 'Creative Generator', us: true, them: false },
                { f: 'Voice Calls', us: true, them: false },
                { f: 'Multi-Channel', us: true, them: false },
                { f: 'Indian Pricing', us: true, them: false },
              ].map((row, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 text-gray-700 dark:text-gray-300 font-medium">{row.f}</td>
                  <td className="py-3.5 px-4 text-center">{row.us ? <CheckCircle size={18} className="text-emerald-500 mx-auto" /> : <X size={18} className="text-gray-300 dark:text-gray-600 mx-auto" />}</td>
                  <td className="py-3.5 px-4 text-center">{row.them ? <CheckCircle size={18} className="text-emerald-500 mx-auto" /> : <X size={18} className="text-gray-300 dark:text-gray-600 mx-auto" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Section>

    {/* Testimonials */}
    <Section className="py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white dark:from-emerald-500/[0.03] dark:to-transparent" />
      <div className="relative max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-full px-4 py-1.5 text-sm font-medium mb-4"><Star size={14} /> Testimonials</div>
          <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">Loved by businesses</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">Don't take our word — hear from our users</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: 'Priya Sharma', role: 'Salon Owner, Mumbai', text: 'BizzAuto transformed my salon bookings! WhatsApp reminders reduced no-shows by 60%. The AI chatbot handles all my inquiries now.', rating: 5 },
            { name: 'Rajesh Kumar', role: 'Real Estate, Delhi', text: 'Lead management was a nightmare before BizzAuto. Now I track every lead, automate follow-ups, and close 3x more deals.', rating: 5 },
            { name: 'Anita Patel', role: 'E-Commerce, Ahmedabad', text: 'The creative generator is a game-changer! I create festival posters in minutes. My marketing costs dropped by 70%.', rating: 5 },
          ].map((t, i) => (
            <div key={i} className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-2xl p-6 hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/5">
              <div className="flex items-center gap-1 mb-4">{Array.from({ length: t.rating }).map((_, j) => (<Star key={j} size={16} className="text-amber-400 fill-amber-400" />))}</div>
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm">{t.name[0]}</div>
                <div><p className="text-gray-900 dark:text-white font-semibold text-sm">{t.name}</p><p className="text-gray-500 dark:text-gray-500 text-xs">{t.role}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>

    {/* FAQ */}
    <Section className="py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-400 rounded-full px-4 py-1.5 text-sm font-medium mb-4"><MessageSquare size={14} /> FAQ</div>
          <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">Common questions</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">Everything you need to know</p>
        </div>
        <div className="space-y-3">
          {[
            { q: 'Do I need a WhatsApp Business API account?', a: 'No! We handle the entire setup for you. Just sign up and start sending messages within minutes.' },
            { q: 'Is there a free trial?', a: 'Yes! You get a full 14-day free trial with all features. No credit card required.' },
            { q: 'Can I import my existing contacts?', a: 'Absolutely! Import via CSV, Excel, or sync from Google Sheets, Zoho, and other CRMs.' },
            { q: 'How does the AI chatbot work?', a: 'Our AI learns from your business data and handles customer queries 24/7. You can train it with your own FAQs and responses.' },
            { q: 'Is my data secure?', a: '100%. We use end-to-end encryption, SOC2 compliance, and your data is stored on Indian servers.' },
            { q: 'What kind of support do you offer?', a: 'We offer WhatsApp support, email support, and dedicated account managers for premium plans.' },
          ].map((faq, i) => (
            <div key={i} className="border border-gray-200 dark:border-white/5 rounded-xl overflow-hidden hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-colors">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left">
                <span className="text-gray-900 dark:text-white font-medium pr-4">{faq.q}</span>
                <ChevronDown size={18} className={`text-gray-400 flex-shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-gray-600 dark:text-gray-400 leading-relaxed animate-fade-in-up">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Section>

    {/* Pricing Teaser */}
    <Section className="py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-500/5 dark:via-teal-500/5 dark:to-cyan-500/5" />
      <div className="relative max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full px-4 py-1.5 text-sm font-medium mb-4"><Zap size={14} /> Simple Pricing</div>
        <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">Start free. Scale as you grow.</h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">No hidden fees. No long-term contracts. Cancel anytime.</p>
        <div className="grid sm:grid-cols-3 gap-6 mb-10">
          {[
            { name: 'Starter', price: '₹0', period: '/mo', desc: 'For solo entrepreneurs', features: ['500 messages/mo', 'Basic CRM', '1 WhatsApp Number', 'Email Support'] },
            { name: 'Growth', price: '₹2,499', period: '/mo', desc: 'For growing businesses', features: ['10,000 messages/mo', 'Full CRM + Pipelines', 'AI Chatbot', 'Priority Support'], popular: true },
            { name: 'Enterprise', price: 'Custom', period: '', desc: 'For large organizations', features: ['Unlimited messages', 'Custom Integrations', 'Dedicated Manager', 'SLA Guarantee'] },
          ].map((plan, i) => (
            <div key={i} className={`relative bg-white dark:bg-white/[0.03] border rounded-2xl p-6 hover:-translate-y-1 transition-all ${plan.popular ? 'border-emerald-400 dark:border-emerald-500/50 shadow-xl shadow-emerald-500/10' : 'border-gray-200 dark:border-white/5'}`}>
              {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold px-4 py-1 rounded-full">Most Popular</div>}
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{plan.name}</h3>
              <p className="text-gray-500 dark:text-gray-500 text-sm mb-4">{plan.desc}</p>
              <div className="mb-6"><span className="text-3xl font-bold text-gray-900 dark:text-white">{plan.price}</span><span className="text-gray-500 dark:text-gray-400">{plan.period}</span></div>
              <ul className="space-y-2.5 mb-6">{plan.features.map((f, j) => (<li key={j} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />{f}</li>))}</ul>
              <Link to="/pricing" className={`block w-full text-center py-2.5 rounded-xl font-medium transition-all ${plan.popular ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-lg hover:shadow-emerald-500/25' : 'bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10'}`}>Get Started</Link>
            </div>
          ))}
        </div>
      </div>
    </Section>

    {/* Final CTA */}
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700" />
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      <div className="relative max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-5xl font-bold text-white mb-6">Ready to automate your business?</h2>
        <p className="text-lg text-emerald-100 mb-10 max-w-2xl mx-auto">Join 10,000+ businesses already growing with BizzAuto. Start your free trial today.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register" className="px-8 py-4 bg-white text-emerald-700 font-bold rounded-xl hover:shadow-xl hover:-translate-y-0.5 transition-all text-lg">Start Free Trial</Link>
          <Link to="/pricing" className="px-8 py-4 bg-white/10 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all text-lg">View Pricing</Link>
        </div>
      </div>
    </section>

    {/* Footer */}
    <Footer />

    {/* Back to Top */}
    {showBackToTop && (
      <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-20 right-6 z-40 p-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl shadow-lg shadow-emerald-500/25 hover:-translate-y-1 transition-all animate-fade-in-up">
        <ArrowRight size={18} className="-rotate-90" />
      </button>
    )}

    {/* Sticky Mobile CTA */}
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white/90 dark:bg-[#0A0F1C]/90 backdrop-blur-xl border-t border-gray-200 dark:border-white/5 lg:hidden">
      <Link to="/register" className="block w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl text-center hover:shadow-lg hover:shadow-emerald-500/25 transition-all">Get Started Free</Link>
    </div>
  </>
);

export default LandingPageBottom;
