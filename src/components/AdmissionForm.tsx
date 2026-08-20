import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Phone, Building2, MapPin, Globe, FileText,
  ArrowRight, ArrowLeft, Check, AlertCircle, Users, Briefcase,
  CreditCard, Target, MessageSquare, Upload
} from 'lucide-react';
import { useAuthStore } from '../lib/authStore';
import api from '../lib/api';

interface AdmissionFormData {
  // Personal Info
  fullName: string;
  email: string;
  phone: string;
  alternatePhone: string;
  
  // Business Info
  businessName: string;
  businessType: string;
  businessCategory: string;
  gstNumber: string;
  panNumber: string;
  
  // Address
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  
  // Business Details
  businessWebsite: string;
  businessDescription: string;
  yearEstablished: string;
  employeeCount: string;
  annualRevenue: string;
  
  // Contact Person
  contactPersonName: string;
  contactPersonDesignation: string;
  contactPersonEmail: string;
  contactPersonPhone: string;
  
  // Bank Details
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  
  // Social Media
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  twitterUrl: string;
  youtubeUrl: string;
  
  // Requirements
  primaryGoal: string;
  monthlyBudget: string;
  targetAudience: string;
  currentMarketingChannels: string[];
  
  // Documents
  logoFile: File | null;
  businessRegistrationFile: File | null;
  
  // Agreement
  agreeTerms: boolean;
  agreePrivacy: boolean;
  agreeMarketing: boolean;
}

const initialFormData: AdmissionFormData = {
  fullName: '',
  email: '',
  phone: '',
  alternatePhone: '',
  businessName: '',
  businessType: '',
  businessCategory: '',
  gstNumber: '',
  panNumber: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  businessWebsite: '',
  businessDescription: '',
  yearEstablished: '',
  employeeCount: '',
  annualRevenue: '',
  contactPersonName: '',
  contactPersonDesignation: '',
  contactPersonEmail: '',
  contactPersonPhone: '',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  accountHolderName: '',
  facebookUrl: '',
  instagramUrl: '',
  linkedinUrl: '',
  twitterUrl: '',
  youtubeUrl: '',
  primaryGoal: '',
  monthlyBudget: '',
  targetAudience: '',
  currentMarketingChannels: [],
  logoFile: null,
  businessRegistrationFile: null,
  agreeTerms: false,
  agreePrivacy: false,
  agreeMarketing: false,
};

const businessTypes = [
  'General Business', 'Salon & Spa', 'Restaurant', 'Gym & Fitness',
  'Real Estate', 'Education & Coaching', 'E-Commerce', 'Healthcare',
  'Marketing Agency', 'IT Services', 'Manufacturing', 'Retail',
  'Travel & Tourism', 'Food & Beverage', 'Fashion & Apparel',
  'Automotive', 'Agriculture', 'Consulting', 'Legal Services',
  'Accounting & Finance', 'Media & Entertainment', 'Non-Profit'
];

const businessCategories = [
  'Sole Proprietorship', 'Partnership', 'Private Limited',
  'Public Limited', 'LLP', 'One Person Company', 'Section 8 Company'
];

const states = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh',
  'Puducherry', 'Andaman and Nicobar Islands', 'Dadra and Nagar Haveli',
  'Daman and Diu', 'Lakshadweep'
];

const employeeCounts = [
  '1-10', '11-25', '26-50', '51-100', '101-250', '251-500',
  '501-1000', '1000+'
];

const annualRevenues = [
  'Less than ₹5 Lakh', '₹5-10 Lakh', '₹10-25 Lakh', '₹25-50 Lakh',
  '₹50 Lakh - 1 Crore', '₹1-5 Crore', '₹5-10 Crore', '₹10+ Crore'
];

const primaryGoals = [
  'Increase Sales', 'Generate Leads', 'Build Brand Awareness',
  'Improve Customer Retention', 'Automate Marketing', 'Manage Social Media',
  'Email Marketing', 'WhatsApp Marketing', 'CRM & Lead Management',
  'E-Commerce Setup', 'All-in-One Solution'
];

const monthlyBudgets = [
  'Less than ₹5,000', '₹5,000 - ₹10,000', '₹10,000 - ₹25,000',
  '₹25,000 - ₹50,000', '₹50,000 - ₹1,00,000', 'More than ₹1,00,000'
];

const marketingChannels = [
  'Facebook', 'Instagram', 'Google Ads', 'WhatsApp', 'Email Marketing',
  'YouTube', 'LinkedIn', 'Twitter', 'SEO', 'Content Marketing',
  'Influencer Marketing', 'Print Media', 'TV/Radio', 'None'
];

const AdmissionForm: React.FC = () => {
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user, business, setAdmissionCompleted } = useAuthStore();
  const [form, setForm] = useState<AdmissionFormData>({
    ...initialFormData,
    fullName: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    businessName: business?.name || '',
    businessType: business?.type || '',
  });

  const totalSteps = 6;

  const handleChange = (key: keyof AdmissionFormData, value: any) => {
    setError('');
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleChannelToggle = (channel: string) => {
    setForm(prev => ({
      ...prev,
      currentMarketingChannels: prev.currentMarketingChannels.includes(channel)
        ? prev.currentMarketingChannels.filter(c => c !== channel)
        : [...prev.currentMarketingChannels, channel]
    }));
  };

  const handleFileChange = (key: 'logoFile' | 'businessRegistrationFile', file: File | null) => {
    setForm(prev => ({ ...prev, [key]: file }));
  };

  const validateStep = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        if (!form.fullName.trim()) { setError('Full name is required'); return false; }
        if (!form.email.trim()) { setError('Email is required'); return false; }
        if (!form.phone.trim()) { setError('Phone number is required'); return false; }
        return true;
      case 2:
        if (!form.businessName.trim()) { setError('Business name is required'); return false; }
        if (!form.businessType.trim()) { setError('Business type is required'); return false; }
        if (!form.address.trim()) { setError('Address is required'); return false; }
        if (!form.city.trim()) { setError('City is required'); return false; }
        if (!form.state.trim()) { setError('State is required'); return false; }
        if (!form.pincode.trim()) { setError('Pincode is required'); return false; }
        return true;
      case 3:
        if (!form.contactPersonName.trim()) { setError('Contact person name is required'); return false; }
        if (!form.contactPersonEmail.trim()) { setError('Contact person email is required'); return false; }
        if (!form.contactPersonPhone.trim()) { setError('Contact person phone is required'); return false; }
        return true;
      case 4:
        if (!form.primaryGoal.trim()) { setError('Primary goal is required'); return false; }
        return true;
      case 5:
        return true;
      case 6:
        if (!form.agreeTerms) { setError('You must agree to Terms of Service'); return false; }
        if (!form.agreePrivacy) { setError('You must agree to Privacy Policy'); return false; }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(step)) return;

    setIsSubmitting(true);
    setError('');

    try {
      const submitData = new FormData();
      
      // Add all form fields
      Object.entries(form).forEach(([key, value]) => {
        if (key === 'logoFile' || key === 'businessRegistrationFile') {
          if (value) submitData.append(key, value);
        } else if (key === 'currentMarketingChannels') {
          submitData.append(key, JSON.stringify(value));
        } else if (typeof value === 'boolean') {
          submitData.append(key, value ? 'true' : 'false');
        } else {
          submitData.append(key, String(value));
        }
      });

      await api.post('/admission/submit', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Mark admission as completed in localStorage and store
      localStorage.setItem('admissionCompleted', 'true');
      setAdmissionCompleted(true);
      
      // Navigate to dashboard
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to submit admission form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <User size={20} /> Personal Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                <input type="text" value={form.fullName} onChange={(e) => handleChange('fullName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="Enter your full name" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address *</label>
                <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="you@company.com" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number *</label>
                <input type="tel" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="+91 98765 43210" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alternate Phone</label>
                <input type="tel" value={form.alternatePhone} onChange={(e) => handleChange('alternatePhone', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="+91 98765 43210" />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 size={20} /> Business Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Name *</label>
                <input type="text" value={form.businessName} onChange={(e) => handleChange('businessName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="Your Business Name" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Type *</label>
                <select value={form.businessType} onChange={(e) => handleChange('businessType', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white" required>
                  <option value="">Select Business Type</option>
                  {businessTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Category</label>
                <select value={form.businessCategory} onChange={(e) => handleChange('businessCategory', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white">
                  <option value="">Select Category</option>
                  {businessCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GST Number</label>
                <input type="text" value={form.gstNumber} onChange={(e) => handleChange('gstNumber', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="22AAAAA0000A1Z5" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PAN Number</label>
                <input type="text" value={form.panNumber} onChange={(e) => handleChange('panNumber', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="AAAAA0000A" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Address *</label>
                <textarea value={form.address} onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="Full business address" rows={2} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City *</label>
                <input type="text" value={form.city} onChange={(e) => handleChange('city', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="Mumbai" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State *</label>
                <select value={form.state} onChange={(e) => handleChange('state', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white" required>
                  <option value="">Select State</option>
                  {states.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pincode *</label>
                <input type="text" value={form.pincode} onChange={(e) => handleChange('pincode', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="400001" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                <input type="text" value={form.country} onChange={(e) => handleChange('country', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="India" />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Briefcase size={20} /> Business Details & Contact Person
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Website</label>
                <input type="url" value={form.businessWebsite} onChange={(e) => handleChange('businessWebsite', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="https://yourbusiness.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year Established</label>
                <input type="number" value={form.yearEstablished} onChange={(e) => handleChange('yearEstablished', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="2020" min="1900" max="2024" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Number of Employees</label>
                <select value={form.employeeCount} onChange={(e) => handleChange('employeeCount', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white">
                  <option value="">Select</option>
                  {employeeCounts.map(count => <option key={count} value={count}>{count}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Annual Revenue</label>
                <select value={form.annualRevenue} onChange={(e) => handleChange('annualRevenue', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white">
                  <option value="">Select</option>
                  {annualRevenues.map(rev => <option key={rev} value={rev}>{rev}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Description</label>
                <textarea value={form.businessDescription} onChange={(e) => handleChange('businessDescription', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="Brief description of your business" rows={3} />
              </div>
              
              <div className="md:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Contact Person Details</h4>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Person Name *</label>
                <input type="text" value={form.contactPersonName} onChange={(e) => handleChange('contactPersonName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="Contact person name" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Designation</label>
                <input type="text" value={form.contactPersonDesignation} onChange={(e) => handleChange('contactPersonDesignation', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="CEO, Manager, etc." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Email *</label>
                <input type="email" value={form.contactPersonEmail} onChange={(e) => handleChange('contactPersonEmail', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="contact@company.com" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Phone *</label>
                <input type="tel" value={form.contactPersonPhone} onChange={(e) => handleChange('contactPersonPhone', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="+91 98765 43210" required />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Target size={20} /> Business Goals & Marketing
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary Goal *</label>
                <select value={form.primaryGoal} onChange={(e) => handleChange('primaryGoal', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white" required>
                  <option value="">Select your primary goal</option>
                  {primaryGoals.map(goal => <option key={goal} value={goal}>{goal}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monthly Marketing Budget</label>
                <select value={form.monthlyBudget} onChange={(e) => handleChange('monthlyBudget', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white">
                  <option value="">Select budget range</option>
                  {monthlyBudgets.map(budget => <option key={budget} value={budget}>{budget}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Audience</label>
                <input type="text" value={form.targetAudience} onChange={(e) => handleChange('targetAudience', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="e.g., Young professionals, Business owners" />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Marketing Channels</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {marketingChannels.map(channel => (
                    <button key={channel} type="button"
                      onClick={() => handleChannelToggle(channel)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        form.currentMarketingChannels.includes(channel)
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-500'
                      }`}>
                      {channel}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard size={20} /> Bank Details & Social Media
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">Bank Account Details</h4>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bank Name</label>
                <input type="text" value={form.bankName} onChange={(e) => handleChange('bankName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="HDFC Bank" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Holder Name</label>
                <input type="text" value={form.accountHolderName} onChange={(e) => handleChange('accountHolderName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="Account holder name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Number</label>
                <input type="text" value={form.accountNumber} onChange={(e) => handleChange('accountNumber', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="Account number" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">IFSC Code</label>
                <input type="text" value={form.ifscCode} onChange={(e) => handleChange('ifscCode', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="HDFC0001234" />
              </div>
              
              <div className="md:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">Social Media Profiles</h4>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Facebook URL</label>
                <input type="url" value={form.facebookUrl} onChange={(e) => handleChange('facebookUrl', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="https://facebook.com/yourpage" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instagram URL</label>
                <input type="url" value={form.instagramUrl} onChange={(e) => handleChange('instagramUrl', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="https://instagram.com/yourpage" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">LinkedIn URL</label>
                <input type="url" value={form.linkedinUrl} onChange={(e) => handleChange('linkedinUrl', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="https://linkedin.com/company/yourpage" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Twitter URL</label>
                <input type="url" value={form.twitterUrl} onChange={(e) => handleChange('twitterUrl', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="https://twitter.com/yourhandle" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">YouTube URL</label>
                <input type="url" value={form.youtubeUrl} onChange={(e) => handleChange('youtubeUrl', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="https://youtube.com/yourchannel" />
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText size={20} /> Document Upload & Agreement
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Business Logo</label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                  <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange('logoFile', e.target.files?.[0] || null)}
                    className="hidden" id="logo-upload" />
                  <label htmlFor="logo-upload" className="cursor-pointer text-sm text-blue-600 hover:underline">
                    {form.logoFile ? form.logoFile.name : 'Click to upload logo'}
                  </label>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Business Registration Certificate</label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                  <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange('businessRegistrationFile', e.target.files?.[0] || null)}
                    className="hidden" id="registration-upload" />
                  <label htmlFor="registration-upload" className="cursor-pointer text-sm text-blue-600 hover:underline">
                    {form.businessRegistrationFile ? form.businessRegistrationFile.name : 'Click to upload certificate'}
                  </label>
                  <p className="text-xs text-gray-500 mt-1">PDF, PNG, JPG up to 5MB</p>
                </div>
              </div>
              
              <div className="md:col-span-2 space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={form.agreeTerms} onChange={(e) => handleChange('agreeTerms', e.target.checked)}
                    className="w-4 h-4 mt-1 text-blue-600 rounded flex-shrink-0" required />
                  <label className="text-sm text-gray-600 dark:text-gray-400">
                    I agree to the <a href="/terms" className="text-blue-600 hover:underline" target="_blank">Terms of Service</a> *
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={form.agreePrivacy} onChange={(e) => handleChange('agreePrivacy', e.target.checked)}
                    className="w-4 h-4 mt-1 text-blue-600 rounded flex-shrink-0" required />
                  <label className="text-sm text-gray-600 dark:text-gray-400">
                    I agree to the <a href="/privacy" className="text-blue-600 hover:underline" target="_blank">Privacy Policy</a> *
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={form.agreeMarketing} onChange={(e) => handleChange('agreeMarketing', e.target.checked)}
                    className="w-4 h-4 mt-1 text-blue-600 rounded flex-shrink-0" />
                  <label className="text-sm text-gray-600 dark:text-gray-400">
                    I agree to receive marketing communications via email, SMS, and WhatsApp
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Admission Form
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Complete your profile to activate your account
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Step {step} of {totalSteps}
            </span>
            <span className="text-sm font-medium text-blue-600">
              {Math.round((step / totalSteps) * 100)}% Complete
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }} />
          </div>
          <div className="flex justify-between mt-2">
            {['Personal', 'Business', 'Details', 'Goals', 'Bank & Social', 'Upload & Agree'].map((label, i) => (
              <span key={i} className={`text-xs ${i < step ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          {renderStep()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            {step > 1 ? (
              <button type="button" onClick={handleBack}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors">
                <ArrowLeft size={18} /> Back
              </button>
            ) : <div />}
            
            {step < totalSteps ? (
              <button type="button" onClick={handleNext}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 flex items-center gap-2 transition-colors">
                Continue <ArrowRight size={18} />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={isSubmitting}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:opacity-90 flex items-center gap-2 disabled:opacity-50 transition-colors">
                {isSubmitting ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Submit & Activate Account <Check size={18} /></>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Skip Option */}
        <div className="text-center mt-4">
          <button type="button" onClick={() => {
            localStorage.setItem('admissionCompleted', 'true');
            setAdmissionCompleted(true);
            navigate('/dashboard', { replace: true });
          }}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            Skip for now (you can complete this later)
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdmissionForm;
