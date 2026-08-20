import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, Download, MessageSquare, Mail, Phone, Plus, X, Eye, Send, Trash2, MapPin, Package, Truck, CheckCircle, AlertCircle, RefreshCw, ArrowUpRight, TrendingUp, UserPlus, Settings, Upload, Zap, MailOpen, Shield, ChevronDown, Loader2, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RT, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import LeadFinderPage from './LeadFinderPage';
import OutreachCampaignPage from './OutreachCampaignPage';

const API = import.meta.env.VITE_API_URL || '/api';
interface Lead { id:string; name:string; phone:string; email?:string; company?:string; source:string; tags:string[]; location?:string; product?:string; supplier?:string; requirement?:string; status:'new'|'contacted'|'qualified'|'won'|'lost'; dealValue?:number; createdAt:string; lastActivity?:string; metadata?:any; }
interface FormData { name:string; phone:string; email:string; company:string; location:string; product:string; supplier:string; requirement:string; source:string; tags:string; }
const SC:Record<string,string>={indiamart:'#FF6B00',justdial:'#FFD700',facebook_ads:'#1877F2',instagram_ads:'#E4405F',whatsapp:'#25D366',manual:'#6B7280',website:'#8B5CF6',referral:'#10B981',google_ads:'#4285F4'};

const AUTOMATION_TEMPLATES = [
  { id: 'leadgen-whatsapp-reply', name: 'Lead Gen → WhatsApp Auto Reply', desc: 'Auto-send WhatsApp + follow-up when a lead is captured', color: 'emerald', icon: 'Zap' },
  { id: 'leadgen-ai-reply', name: 'Lead Gen → AI Smart Reply', desc: 'AI generates personalized WhatsApp reply for each lead', color: 'purple', icon: 'Brain' },
  { id: 'incoming-msg-autoreply', name: 'Incoming Msg → AI Auto Reply', desc: 'AI replies to incoming WhatsApp messages automatically', color: 'blue', icon: 'MessageSquare' },
  { id: 'leadgen-full-funnel', name: 'Complete Lead Funnel', desc: 'Full funnel: reply → tag → score → notify → follow-up', color: 'indigo', icon: 'Workflow' },
];
const STC:Record<string,string>={new:'#3B82F6',contacted:'#F59E0B',qualified:'#8B5CF6',won:'#10B981',lost:'#EF4444'};
const EF:FormData={name:'',phone:'',email:'',company:'',location:'',product:'',supplier:'',requirement:'',source:'manual',tags:''};
// Mock leads removed - data comes from real API
const tagToStatus=(tags:string[]):Lead['status']=>{const l=tags.map(t=>t.toLowerCase());if(l.includes('won'))return'won';if(l.includes('qualified'))return'qualified';if(l.includes('contacted'))return'contacted';if(l.includes('lost'))return'lost';return'new';};
const SCard:React.FC<{icon:React.ReactNode;label:string;value:string|number;c:string}>=({icon,label,value,c})=>{const m:Record<string,string>={blue:'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',green:'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',purple:'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',orange:'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'};return(<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700"><div className="flex items-center justify-between mb-3"><div className={`p-2.5 rounded-lg ${m[c]||m.blue}`}>{icon}</div></div><p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{value}</p><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p></div>);};

const Modal: React.FC<{open:boolean;onClose:()=>void;title:string;children:React.ReactNode;size?:'sm'|'md'|'lg'|'xl'}>=({open,onClose,title,children,size='md'})=>{
  if(!open)return null;
  const sw:Record<string,string>={sm:'max-w-md',md:'max-w-lg',lg:'max-w-2xl',xl:'max-w-4xl'};
  return(<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}><div className="fixed inset-0 bg-black/50"/><div className={`relative bg-white dark:bg-gray-800 rounded-t-xl sm:rounded-xl shadow-xl w-full ${sw[size]} max-h-[95vh] sm:max-h-[90vh] overflow-y-auto`} onClick={e=>e.stopPropagation()}><div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-5 md:px-6 py-4 flex items-center justify-between rounded-t-xl"><h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2><button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X size={20} className="text-gray-500"/></button></div><div className="p-4 sm:p-5 md:p-6">{children}</div></div></div>);
};

export default function LeadGenerationPage(){
  const[leads,setLeads]=useState<Lead[]>([]);
  const[loading,setLoading]=useState(true);
  const[showForm,setShowForm]=useState(false);
  const[showBulkAdd,setShowBulkAdd]=useState(false);
  const[form,setForm]=useState<FormData>(EF);
  const[sel,setSel]=useState<Set<string>>(new Set());
  const[fSrc,setFSrc]=useState('all');
  const[fSt,setFSt]=useState('all');
  const[q,setQ]=useState('');
  const[activeTab,setActiveTab]=useState<'all'|'finder'|'outreach'>('all');
  const[sort,setSort]=useState<'date'|'name'|'value'>('date');
  const[sDir,setSDir]=useState<'asc'|'desc'>('desc');
  const[showReply,setShowReply]=useState(false);
  const[rType,setRType]=useState<'whatsapp'|'email'|'sms'>('whatsapp');
  const[rMsg,setRMsg]=useState('');
  const[showExport,setShowExport]=useState(false);
  const[detail,setDetail]=useState<Lead|null>(null);
  const[toast,setToast]=useState<{m:string;t:'success'|'error'}|null>(null);
  const[stats,setStats]=useState({total:0,today:0,bySource:[] as any[],byStatus:[] as any[]});
  const[showAutomation,setShowAutomation]=useState(false);
  const[deploying,setDeploying]=useState<string|null>(null);
  const[deployMsg,setDeployMsg]=useState<{template:string;msg:string;err?:boolean}|null>(null);

  const deployTemplate=async(templateId:string,templateName:string)=>{
    setDeploying(templateId);
    setDeployMsg(null);
    try{
      const token=localStorage.getItem('token');
      const r=await fetch('/api/automations/deploy-template',{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify({templateId,name:templateName})
      });
      const d=await r.json();
      if(d.success){
        setDeployMsg({template:templateId,msg:d.message||'Workflow deployed Successfully! 🎉',err:false});
        toast_(d.message||'Workflow deployed! Activate it from Workflows page.','success');
      }else{
        setDeployMsg({template:templateId,msg:d.error||'Failed to deploy','err':true});
        toast_(d.error||'Failed to deploy','error');
      }
    }catch(e:any){
      setDeployMsg({template:templateId,msg:e.message||'Failed','err':true});
      toast_(e.message||'Deployment failed','error');
    }
    setDeploying(null);
  };

  const calc=(ll:Lead[])=>{const td=new Date().toDateString();const tc=ll.filter(l=>new Date(l.createdAt).toDateString()===td).length;const sm:Record<string,number>={},stm:Record<string,number>={};ll.forEach(l=>{sm[l.source]=(sm[l.source]||0)+1;const s=l.status||'new';stm[s]=(stm[s]||0)+1;});setStats({total:ll.length,today:tc,bySource:Object.entries(sm).map(([name,value])=>({name,value})),byStatus:Object.entries(stm).map(([name,value])=>({name,value}))});};

  const fetchLeads=useCallback(async()=>{
    setLoading(true);
    try{const token=localStorage.getItem('token');const p=new URLSearchParams();if(fSrc!=='all')p.set('source',fSrc);if(fSt!=='all')p.set('tags',fSt);if(q)p.set('search',q);const r=await fetch(`${API}/leads?${p}`,{headers:{Authorization:`Bearer ${token}`}});const d=await r.json();if(d.success){const m=(d.data||[]).map((c:any)=>({id:c.id,name:c.name||'',phone:c.phone||'',email:c.email||'',company:c.company||'',source:c.source||'manual',tags:c.tags||[],location:c.metadata?.city||c.metadata?.location||'',product:c.metadata?.product||c.metadata?.service||'',supplier:c.metadata?.supplier||'',requirement:c.metadata?.requirement||c.metadata?.message||'',status:tagToStatus(c.tags||[]),dealValue:c.dealValue,createdAt:c.createdAt,lastActivity:c.lastActivity,metadata:c.metadata}));setLeads(m);calc(m);}}catch{setLeads([]);calc([]);}
    setLoading(false);
  },[fSrc,fSt,q]);

  useEffect(()=>{fetchLeads();},[fetchLeads]);
  const toast_=(m:string,t:'success'|'error')=>{setToast({m,t});setTimeout(()=>setToast(null),3000);};
 useEffect(()=>{fetchImConfig();},[]);

 // IndiaMART Email Config functions
 const fetchImConfig = useCallback(async () => {
   try {
     const token = localStorage.getItem('token');
     const r = await fetch(`${API}/indiamart-email/config`, { headers: { Authorization: `Bearer ${token}` } });
     const d = await r.json();
     if (d.success) { setImConfig(d.data); if (d.data?.spreadsheetId) setImForm(prev => ({ ...prev, spreadsheetId: d.data.spreadsheetId })); }
   } catch (e) { console.error('Failed to fetch IM config:', e); }
 }, []);

 const syncIndiaMART = async () => {
  setImSyncing(true);
  try {
   const token = localStorage.getItem('token');
   const r = await fetch(`${API}/indiamart-email/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ days: imSyncDays, platform: imPlatform })
   });
   const d = await r.json();
   setSyncResult(d.data || d);
   if (d.success) toast_(`Synced ${d.data?.newLeads || 0} new leads from ${imPlatform}!`, 'success');
   else toast_(d.error || 'Sync failed', 'error');
  } catch { toast_('Sync failed', 'error'); }
  setImSyncing(false);
 };

 const debugEmails = async () => {
  setImSyncing(true);
  try {
   const token = localStorage.getItem('token');
   const r = await fetch(`${API}/indiamart-email/debug-emails`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ days: 7 })
   });
   const d = await r.json();
   console.log('Debug result:', d);
   if (d.success && d.data) {
    const emails = d.data.emails || [];
    let msg = `Total emails in inbox: ${d.data.totalEmails || 0}\n`;
    msg += `Emails found: ${d.data.found || 0}\n`;
    msg += `Emails fetched: ${emails.length}\n\n`;
    if (d.data.error) msg += `Error: ${d.data.error}\n\n`;
    emails.forEach((e: any, i: number) => {
      msg += `--- Email ${i+1} ---\n`;
      msg += `From: ${e.from}\n`;
      msg += `Subject: ${e.subject}\n`;
      msg += `Preview: ${(e.textPreview || '').substring(0, 300)}\n\n`;
    });
    alert(msg);
   } else {
    alert(`Error: ${d.error || d.data?.error || 'Debug failed'}`);
   }
  } catch (e: any) {
   alert('Debug error: ' + e.message);
  }
  setImSyncing(false);
 };

 const testImConnection = async () => {
   setImTesting(true);
   try {
     const token = localStorage.getItem('token');
     const r = await fetch(`${API}/indiamart-email/connect`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(imForm) });
     const d = await r.json();
     if (d.success) toast_('Connection successful!', 'success'); else toast_(d.error || 'Connection failed', 'error');
   } catch (e: any) { toast_(e.message || 'Connection test failed', 'error'); }
   setImTesting(false);
 };

 const saveImConfig = async () => {
   if (!imForm.email || !imForm.password) { toast_('Email and password are required', 'error'); return; }
   setImTesting(true);
   try {
     const token = localStorage.getItem('token');
     const r = await fetch(`${API}/indiamart-email/setup`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(imForm) });
     const d = await r.json();
     if (d.success) { toast_('IndiaMART email connected!', 'success'); setShowImSettings(false); fetchImConfig(); } else { toast_(d.error || 'Failed to save', 'error'); }
   } catch (e: any) { toast_(e.message || 'Failed to save config', 'error'); }
   setImTesting(false);
 };

  const handleSubmit=async(e:React.FormEvent)=>{
    e.preventDefault();
    try{const token=localStorage.getItem('token'),bid=localStorage.getItem('businessId');const r=await fetch(`${API}/leads/manual`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({businessId:bid,source:form.source,leadData:{name:form.name,phone:form.phone,email:form.email||undefined,company:form.company||undefined,product:form.product||undefined,requirement:form.requirement||undefined,city:form.location||undefined,supplier:form.supplier||undefined}})});const d=await r.json();if(d.success){toast_('Lead added!','success');setShowForm(false);setForm(EF);fetchLeads();}else toast_(d.error||'Failed','error');}
    catch{toast_('Failed to add lead. Please try again.','error');}
  };

  const handleBulkAdd=async()=>{
    const textarea=document.getElementById('bulkLeads') as HTMLTextAreaElement;
    if(!textarea||!textarea.value.trim()){toast_('Please paste leads data','error');return;}
    const lines=textarea.value.trim().split('\n').filter(l=>l.trim());
    let successCount=0;
    for(const line of lines){
      const parts=line.split(',').map(p=>p.trim());
      if(parts.length<2)continue;
      const[name,phone,email,source,product,city]=parts;
      try{const token=localStorage.getItem('token'),bid=localStorage.getItem('businessId');await fetch(`${API}/leads/manual`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({businessId:bid,source:source||'manual',leadData:{name:name||'Unknown',phone:phone||'',email:email||undefined,product:product||undefined,city:city||undefined}})});successCount++;}catch{}
    }
    if(successCount>0){toast_(`Added ${successCount} leads!`,'success');setShowBulkAdd(false);fetchLeads();}else toast_('No leads added','error');
  };

  const csvExport=()=>{const x=sel.size>0?leads.filter(l=>sel.has(l.id)):leads;const h=['Name','Phone','Email','Company','Location','Product','Supplier','Requirement','Source','Status','Deal Value','Created At'];const rows=x.map(l=>[l.name,l.phone,l.email||'',l.company||'',l.location||'',l.product||'',l.supplier||'',l.requirement||'',l.source,l.status,l.dealValue?.toString()||'',new Date(l.createdAt).toLocaleString()]);const csv=[h,...rows].map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');const b=new Blob([csv],{type:'text/csv'}),u=window.URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=`leads_${new Date().toISOString().slice(0,10)}.csv`;a.click();window.URL.revokeObjectURL(u);toast_('Exported CSV!','success');};

  const handleExport=async(fmt:'csv'|'excel'|'sheets')=>{
    try{const token=localStorage.getItem('token'),bid=localStorage.getItem('businessId'),ids=sel.size>0?Array.from(sel):undefined;if(fmt==='sheets'){const r=await fetch(`${API}/leads/export/sheets`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({businessId:bid,leadIds:ids})});const d=await r.json();if(d.success&&d.url){window.open(d.url,'_blank');toast_('Synced to Sheets!','success');}else toast_('Sheets not configured','error');}else{const r=await fetch(`${API}/leads/export/${fmt}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({leadIds:ids})});if(r.ok){const b=await r.blob(),u=window.URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=`leads_${new Date().toISOString().slice(0,10)}.${fmt==='excel'?'xlsx':'csv'}`;a.click();window.URL.revokeObjectURL(u);toast_(`Exported ${fmt.toUpperCase()}!`,'success');}else csvExport();}}
    catch{csvExport();}
    setShowExport(false);
  };

  const handleBulkReply=async()=>{
    const tg=sel.size>0?leads.filter(l=>sel.has(l.id)):leads;
    try{const token=localStorage.getItem('token'),bid=localStorage.getItem('businessId');const r=await fetch(`${API}/leads/bulk-reply`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({businessId:bid,leadIds:tg.map(l=>l.id),channel:rType,message:rMsg})});const d=await r.json();if(d.success)toast_(`Reply sent via ${rType} to ${tg.length} leads!`,'success');else toast_(d.error||'Failed','error');}
    catch{toast_(`${rType} queued for ${tg.length} leads `,'success');}
    setShowReply(false);setRMsg('');
  };

  const quickReply=(l:Lead,ch:'whatsapp'|'email'|'sms')=>{
    const msg=ch==='whatsapp'?`Hi ${l.name}, thanks for interest in ${l.product||'our products'}!`:ch==='email'?`Dear ${l.name},\n\nThank you for your inquiry.\n\nBest regards`:`Hi ${l.name}, thanks! We'll contact you soon.`;
    if(ch==='whatsapp'&&l.phone)window.open(`https://wa.me/${l.phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`,'_blank');
    else if(ch==='email'&&l.email)window.open(`mailto:${l.email}?subject=Inquiry&body=${encodeURIComponent(msg)}`,'_blank');
    else if(ch==='sms'&&l.phone)window.open(`sms:${l.phone}?body=${encodeURIComponent(msg)}`,'_blank');
    toast_(`Opening ${ch}...`,'success');
  };

  const del=async(id:string)=>{if(!confirm('Delete this lead?'))return;try{const t=localStorage.getItem('token');await fetch(`${API}/leads/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${t}`}});}catch{}const u=leads.filter(l=>l.id!==id);setLeads(u);calc(u);setSel(p=>{const n=new Set(p);n.delete(id);return n;});toast_('Deleted','success');};
  const tog=(id:string)=>setSel(p=>{const n=new Set(p);if(n.has(id))n.delete(id);else n.add(id);return n;});
  const togAll=()=>{if(sel.size===fl.length)setSel(new Set());else setSel(new Set(fl.map(l=>l.id)));};

  const fl=leads.filter(l=>{if(fSrc!=='all'&&l.source!==fSrc)return false;if(fSt!=='all'&&l.status!==fSt)return false;if(q){const s=q.toLowerCase();return l.name.toLowerCase().includes(s)||l.phone.includes(s)||(l.email||'').toLowerCase().includes(s)||(l.company||'').toLowerCase().includes(s)||(l.location||'').toLowerCase().includes(s)||(l.product||'').toLowerCase().includes(s)||(l.supplier||'').toLowerCase().includes(s);}return true;}).sort((a,b)=>{const d=sDir==='asc'?1:-1;if(sort==='date')return d*(new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime());if(sort==='name')return d*a.name.localeCompare(b.name);if(sort==='value')return d*((a.dealValue||0)-(b.dealValue||0));return 0;});

  const inp="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm";

 // IndiaMART Email Integration State
 const [imConfig, setImConfig] = useState<any>(null);
 const [showImSettings, setShowImSettings] = useState(false);
 const [imSyncing, setImSyncing] = useState(false);
 const [imTesting, setImTesting] = useState(false);
 const [syncResult, setSyncResult] = useState<any>(null);
 const [imSyncDays, setImSyncDays] = useState(7);
 const [imPlatform, setImPlatform] = useState('indiamart');
 const [imForm, setImForm] = useState({ imapHost: 'imap.gmail.com', imapPort: 993, email: '', password: '', useSSL: true, spreadsheetId: '', autoSync: true, syncInterval: 60 });
  const selc="px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm";
  const btn="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium";

  return(
    <div className="p-4 sm:p-5 md:p-6 space-y-6">
      {toast&&<div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white ${toast.t==='success'?'bg-green-500':'bg-red-500'}`}>{toast.t==='success'?<CheckCircle size={18}/>:<AlertCircle size={18}/>}{toast.m}</div>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><UserPlus size={28} className="text-blue-600"/> Lead Generation</h1><p className="text-gray-500 dark:text-gray-400 mt-1">Capture, manage & convert leads from multiple sources</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        <button onClick={()=>setActiveTab('all')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab==='all'?'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm':'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}><Users size={16} className="inline mr-1.5"/> All Leads</button>
        <button onClick={()=>setActiveTab('finder')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab==='finder'?'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm':'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}><MapPin size={16} className="inline mr-1.5"/> AI Lead Finder</button>
        <button onClick={()=>setActiveTab('outreach')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab==='outreach'?'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm':'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}><Send size={16} className="inline mr-1.5"/> WhatsApp Outreach</button>
      </div>

      {activeTab==='finder'&&<LeadFinderPage/>}
      {activeTab==='outreach'&&<OutreachCampaignPage/>}
      {activeTab==='all'&&(
      <>
       <div className="flex items-center justify-end gap-3">
          <button onClick={()=>fetchLeads()} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><RefreshCw size={18}/></button>
          <button onClick={()=>setShowExport(true)} className={`${btn} bg-green-600 hover:bg-green-700`}><Download size={16}/> Export</button>
          <button onClick={()=>setShowReply(true)} className={`${btn} bg-purple-600 hover:bg-purple-700`}><Send size={16}/> Bulk Reply</button>
          <button onClick={()=>setShowForm(true)} className={`${btn} bg-blue-600 hover:bg-blue-700`}><Plus size={16}/> Add Lead</button>
          <button onClick={()=>setShowBulkAdd(true)} className={`${btn} bg-purple-600 hover:bg-purple-700`}><Upload size={16}/> Bulk Add</button>
       </div>

 {/* Email Lead Integration - Multi Platform */}
 <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-sm p-4 border border-orange-200 dark:border-orange-700 mb-4">
  <div className="flex items-center justify-between">
   <div className="flex items-center gap-3">
    <div className="p-2 bg-white/20 rounded-lg"><Zap size={24} className="text-white"/></div>
    <div>
     <h3 className="text-white font-semibold">Email Lead Capture</h3>
     <p className="text-white/80 text-sm">{imConfig?.configured?`Connected: ${imConfig.email}`:'Connect email to auto-capture leads from IndiaMART, JustDial, TradeIndia'}</p>
    </div>
   </div>
   <div className="flex items-center gap-2">
    {imConfig?.configured&&(
     <div className="flex items-center gap-2">
      <select
       value={imSyncDays || 7}
       onChange={e => setImSyncDays(Number(e.target.value))}
       className="px-2 py-1.5 bg-white/20 text-white text-sm rounded-lg border border-white/30 focus:outline-none"
      >
       <option value={1}>Last 1 day</option>
       <option value={7}>Last 7 days</option>
       <option value={14}>Last 14 days</option>
       <option value={30}>Last 30 days</option>
       <option value={60}>Last 60 days</option>
       <option value={90}>Last 90 days</option>
      </select>
      <select
       value={imPlatform || 'indiamart'}
       onChange={e => setImPlatform(e.target.value)}
       className="px-2 py-1.5 bg-white/20 text-white text-sm rounded-lg border border-white/30 focus:outline-none"
      >
       <option value="indiamart">IndiaMART</option>
       <option value="justdial">JustDial</option>
       <option value="tradeindia">TradeIndia</option>
      </select>
       <button onClick={syncIndiaMART} disabled={imSyncing} className="flex items-center gap-2 px-4 py-2 bg-white text-orange-600 rounded-lg hover:bg-orange-50 text-sm font-medium">
        <RefreshCw size={16} className={imSyncing?'animate-spin':''}/> {imSyncing?'Syncing...':'Sync'}
       </button>
       <button onClick={debugEmails} disabled={imSyncing} className="flex items-center gap-2 px-3 py-2 bg-white/30 text-white rounded-lg hover:bg-white/40 text-sm font-medium">
        <Eye size={16}/> Debug
       </button>
     </div>
    )}
    <button onClick={()=>setShowImSettings(true)} className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 text-sm font-medium">
     <Settings size={16}/> {imConfig?.configured?'Settings':'Connect'}
    </button>
   </div>
  </div>
  {syncResult&&<div className="mt-3 grid grid-cols-3 gap-3">
   <div className="bg-white/10 rounded-lg p-3 text-center"><p className="text-white text-xl font-bold">{syncResult.processed||0}</p><p className="text-white/70 text-xs">Emails</p></div>
   <div className="bg-white/10 rounded-lg p-3 text-center"><p className="text-white text-xl font-bold">{syncResult.newLeads||0}</p><p className="text-white/70 text-xs">New Leads</p></div>
   <div className="bg-white/10 rounded-lg p-3 text-center"><p className="text-white text-xl font-bold">{imConfig?.lastSyncAt?new Date(imConfig.lastSyncAt).toLocaleTimeString():'Never'}</p><p className="text-white/70 text-xs">Last Sync</p></div>
  </div>}
 </div>

 {/* Platform Stats */}
 <div className="grid grid-cols-3 gap-3 mb-4">
  {[
   { name: 'IndiaMART', color: 'from-orange-500 to-red-500', icon: '🏭', count: leads.filter(l => l.source === 'indiamart').length },
   { name: 'JustDial', color: 'from-yellow-500 to-orange-500', icon: '📞', count: leads.filter(l => l.source === 'justdial').length },
   { name: 'TradeIndia', color: 'from-blue-500 to-indigo-500', icon: '🌐', count: leads.filter(l => l.source === 'tradeindia').length },
  ].map(p => (
   <div key={p.name} className={`bg-gradient-to-r ${p.color} rounded-xl p-3 text-white text-center`}>
    <p className="text-lg">{p.icon}</p>
    <p className="text-xl font-bold">{p.count}</p>
    <p className="text-xs opacity-80">{p.name}</p>
   </div>
  ))}
 </div>
      {/* Quick Deploy Automation Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <button
          onClick={()=>setShowAutomation(!showAutomation)}
          className="w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
              <Zap size={18} className="text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Quick Deploy Automation</h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">One-click setup: Lead Gen → WhatsApp Auto Reply workflows</p>
            </div>
          </div>
          <div className={`transition-transform ${showAutomation?'rotate-180':''}`}>
            <ChevronDown size={20} className="text-gray-400" />
          </div>
        </button>

        {showAutomation&&(
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3">
            {deployMsg&&(
              <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                deployMsg.err?'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                  :'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
              }`}>
                {deployMsg.err?<AlertCircle size={16}/>:<CheckCircle size={16}/>}
                <span className="flex-1">{deployMsg.msg}</span>
                <button onClick={()=>setDeployMsg(null)} className="p-1 hover:opacity-70"><X size={14}/></button>
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">Choose a pre-built automation to deploy instantly:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AUTOMATION_TEMPLATES.map(t=>{
                const gradColors: Record<string,string> = {
                  emerald: 'from-emerald-500 to-green-600',
                  purple: 'from-purple-500 to-indigo-600',
                  blue: 'from-blue-500 to-cyan-600',
                  indigo: 'from-indigo-500 to-purple-600',
                };
                const gradIcon: Record<string,string> = {
                  emerald: 'from-emerald-500/20 to-green-600/20 text-emerald-600 dark:text-emerald-400',
                  purple: 'from-purple-500/20 to-indigo-600/20 text-purple-600 dark:text-purple-400',
                  blue: 'from-blue-500/20 to-cyan-600/20 text-blue-600 dark:text-blue-400',
                  indigo: 'from-indigo-500/20 to-purple-600/20 text-indigo-600 dark:text-indigo-400',
                };
                const gc = gradColors[t.color]||'from-blue-500 to-purple-600';
                const gi = gradIcon[t.color]||'from-blue-500/20 to-purple-600/20 text-blue-600';
                return(
                <div key={t.id} className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg bg-gradient-to-r ${gi}`}>
                        <Zap size={16}/>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.desc}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={()=>deployTemplate(t.id,t.name)}
                    disabled={deploying===t.id}
                    className={`w-full mt-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                      deploying===t.id
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r text-white hover:opacity-90 '+gc
                    }`}
                  >
                    {deploying===t.id
                      ? <><Loader2 size={14} className="animate-spin"/> Deploying...</>
                      : <><Zap size={14}/> Deploy Now</>
                    }
                  </button>
                </div>
              )})}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <Info size={12}/>
              Workflow will be created in draft mode. Go to Workflows page to activate it.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SCard icon={<Users size={22}/>} label="Total Leads" value={stats.total} c="blue"/>
        <SCard icon={<TrendingUp size={22}/>} label="Today's Leads" value={stats.today} c="green"/>
        <SCard icon={<MessageSquare size={22}/>} label="Selected" value={sel.size} c="purple"/>
        <SCard icon={<ArrowUpRight size={22}/>} label="Conversion" value={`${stats.total?Math.round((stats.byStatus.find(s=>s.name==='won')?.value||0)/stats.total*100):0}%`} c="orange"/>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Leads by Source</h3>
          <ResponsiveContainer width="100%" height={200}><BarChart data={stats.bySource}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/><XAxis dataKey="name" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><RT/><Bar dataKey="value" radius={[4,4,0,0]}>{stats.bySource.map((e,i)=><Cell key={i} fill={SC[e.name]||'#6B7280'}/>)}</Bar></BarChart></ResponsiveContainer>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Leads by Status</h3>
          <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={stats.byStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({name,percent}:any)=>`${name} ${(percent*100).toFixed(0)}%`}>{stats.byStatus.map((e,i)=><Cell key={i} fill={STC[e.name]||'#6B7280'}/>)}</Pie><RT/></PieChart></ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/><input type="text" placeholder="Search name, phone, location, product, supplier..." value={q} onChange={e=>setQ(e.target.value)} className={inp}/></div>
          <select value={fSrc} onChange={e=>setFSrc(e.target.value)} className={selc}><option value="all">All Sources</option><option value="indiamart">IndiaMART</option><option value="justdial">JustDial</option><option value="facebook_ads">Facebook Ads</option><option value="instagram_ads">Instagram Ads</option><option value="whatsapp">WhatsApp</option><option value="website">Website</option><option value="referral">Referral</option><option value="manual">Manual</option></select>
          <select value={fSt} onChange={e=>setFSt(e.target.value)} className={selc}><option value="all">All Status</option><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="won">Won</option><option value="lost">Lost</option></select>
          <select value={`${sort}-${sDir}`} onChange={e=>{const[b,d]=e.target.value.split('-');setSort(b as any);setSDir(d as any);}} className={selc}><option value="date-desc">Newest First</option><option value="date-asc">Oldest First</option><option value="name-asc">Name A-Z</option><option value="name-desc">Name Z-A</option><option value="value-desc">Value High-Low</option><option value="value-asc">Value Low-High</option></select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading?<div className="p-12 text-center"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"/><p className="text-gray-500">Loading leads...</p></div>
        :fl.length===0?<div className="p-12 text-center"><Users size={48} className="mx-auto text-gray-300 mb-3"/><h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No leads found</h3><p className="text-gray-500 mt-1">Add your first lead or adjust filters</p></div>
        :(<>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 dark:bg-gray-700/50"><tr>
            <th className="px-4 py-3 text-left"><input type="checkbox" checked={sel.size===fl.length&&fl.length>0} onChange={togAll} className="rounded border-gray-300 text-blue-600"/></th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Name</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Contact</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Location</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Product</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Supplier</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Source</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Status</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Value</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Actions</th>
          </tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {fl.map(l=>(<tr key={l.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${sel.has(l.id)?'bg-blue-50 dark:bg-blue-900/20':''}`}>
              <td className="px-4 py-3"><input type="checkbox" checked={sel.has(l.id)} onChange={()=>tog(l.id)} className="rounded border-gray-300 text-blue-600"/></td>
              <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">{l.name?.charAt(0)?.toUpperCase()||'?'}</div><div><p className="font-medium text-gray-900 dark:text-white">{l.name||'Unknown'}</p>{l.company&&<p className="text-xs text-gray-500">{l.company}</p>}</div></div></td>
              <td className="px-4 py-3"><p className="text-gray-900 dark:text-white">{l.phone}</p>{l.email&&<p className="text-xs text-gray-500">{l.email}</p>}</td>
              <td className="px-4 py-3">{l.location?<span className="flex items-center gap-1 text-gray-700 dark:text-gray-300"><MapPin size={12} className="text-gray-400"/>{l.location}</span>:<span className="text-gray-400">—</span>}</td>
              <td className="px-4 py-3">{l.product?<span className="flex items-center gap-1 text-gray-700 dark:text-gray-300"><Package size={12} className="text-gray-400"/>{l.product}</span>:<span className="text-gray-400">—</span>}</td>
              <td className="px-4 py-3">{l.supplier?<span className="flex items-center gap-1 text-gray-700 dark:text-gray-300"><Truck size={12} className="text-gray-400"/>{l.supplier}</span>:<span className="text-gray-400">—</span>}</td>
              <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white" style={{backgroundColor:SC[l.source]||'#6B7280'}}>{l.source.replace('_',' ')}</span></td>
              <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" style={{backgroundColor:`${STC[l.status]||'#6B7280'}20`,color:STC[l.status]||'#6B7280'}}>{l.status}</span></td>
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{l.dealValue?`₹${l.dealValue.toLocaleString()}`:'—'}</td>
              <td className="px-4 py-3"><div className="flex items-center gap-1">
                <button onClick={()=>setDetail(l)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="View"><Eye size={14}/></button>
                <button onClick={()=>quickReply(l,'whatsapp')} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded" title="WhatsApp"><MessageSquare size={14}/></button>
                <button onClick={()=>quickReply(l,'email')} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded" title="Email"><Mail size={14}/></button>
                <button onClick={()=>quickReply(l,'sms')} className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded" title="SMS"><Phone size={14}/></button>
                <button onClick={()=>del(l.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 size={14}/></button>
              </div></td>
            </tr>))}
          </tbody></table></div>
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Showing {fl.length} of {leads.length} leads</span>
            {sel.size>0&&<span className="text-blue-600 font-medium">{sel.size} selected</span>}
          </div>
        </>)}
      </div>

      {/* Add/Edit Lead Form Modal */}
      <Modal open={showForm} onClose={()=>{setShowForm(false);setForm(EF);}} title="Add New Lead" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label><input required type="text" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className={inp} placeholder="Enter name"/></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone *</label><input required type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className={inp} placeholder="+91 7972888023"/></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className={inp} placeholder="email@example.com"/></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company</label><input type="text" value={form.company} onChange={e=>setForm({...form,company:e.target.value})} className={inp} placeholder="Company name"/></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label><input type="text" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} className={inp} placeholder="City"/></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product/Service</label><input type="text" value={form.product} onChange={e=>setForm({...form,product:e.target.value})} className={inp} placeholder="Product or service"/></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier</label><input type="text" value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})} className={inp} placeholder="Supplier name"/></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Source</label><select value={form.source} onChange={e=>setForm({...form,source:e.target.value})} className={inp}><option value="manual">Manual</option><option value="indiamart">IndiaMART</option><option value="justdial">JustDial</option><option value="facebook_ads">Facebook Ads</option><option value="instagram_ads">Instagram Ads</option><option value="whatsapp">WhatsApp</option><option value="website">Website</option><option value="referral">Referral</option><option value="google_ads">Google Ads</option></select></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Requirement</label><textarea value={form.requirement} onChange={e=>setForm({...form,requirement:e.target.value})} className={`${inp} resize-none`} rows={2} placeholder="Describe requirement..."/></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (comma separated)</label><input type="text" value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} className={inp} placeholder="Hot Lead, VIP, New"/></div>
          <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={()=>{setShowForm(false);setForm(EF);}} className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">Cancel</button><button type="submit" className={`${btn} bg-blue-600 hover:bg-blue-700`}><Plus size={16}/> Add Lead</button></div>
        </form>
      </Modal>

      {/* Bulk Add Modal */}
      <Modal open={showBulkAdd} onClose={()=>setShowBulkAdd(false)} title="Bulk Add Leads" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Paste leads in CSV format. Each line should have: Name, Phone, Email, Source, Product, City
          </p>
          <textarea
            id="bulkLeads"
            rows={10}
            placeholder={`Rahul Sharma, 7972888023, rahul@gmail.com, indiamart, Hair Oil, Mumbai\nPriya Patel, 9876543211, priya@gmail.com, facebook_ads, Shampoo, Delhi\nAmit Kumar, 9876543212, , justdial, Face Cream, Bangalore`}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
          />
          <div className="flex justify-end gap-3">
            <button onClick={()=>setShowBulkAdd(false)} className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">Cancel</button>
            <button onClick={handleBulkAdd} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">Import Leads</button>
          </div>
        </div>
      </Modal>

      {/* Lead Detail Modal */}
      <Modal open={!!detail} onClose={()=>setDetail(null)} title="Lead Details" size="lg">
        {detail&&(<div className="space-y-6">
          <div className="flex items-start gap-4"><div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl font-bold">{detail.name?.charAt(0)?.toUpperCase()||'?'}</div><div className="flex-1"><h3 className="text-xl font-semibold text-gray-900 dark:text-white">{detail.name||'Unknown'}</h3>{detail.company&&<p className="text-gray-500 dark:text-gray-400">{detail.company}</p>}<div className="flex gap-2 mt-2"><span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{backgroundColor:SC[detail.source]||'#6B7280'}}>{detail.source.replace('_',' ')}</span><span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={{backgroundColor:`${STC[detail.status]||'#6B7280'}20`,color:STC[detail.status]||'#6B7280'}}>{detail.status}</span></div></div></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
            <div><p className="text-sm text-gray-500 dark:text-gray-400">Phone</p><p className="font-medium text-gray-900 dark:text-white flex items-center gap-2"><Phone size={14}/>{detail.phone}</p></div>
            <div><p className="text-sm text-gray-500 dark:text-gray-400">Email</p><p className="font-medium text-gray-900 dark:text-white">{detail.email||'—'}</p></div>
            <div><p className="text-sm text-gray-500 dark:text-gray-400">Location</p><p className="font-medium text-gray-900 dark:text-white flex items-center gap-2"><MapPin size={14}/>{detail.location||'—'}</p></div>
            <div><p className="text-sm text-gray-500 dark:text-gray-400">Deal Value</p><p className="font-medium text-gray-900 dark:text-white">{detail.dealValue?`₹${detail.dealValue.toLocaleString()}`:'—'}</p></div>
            <div><p className="text-sm text-gray-500 dark:text-gray-400">Product</p><p className="font-medium text-gray-900 dark:text-white flex items-center gap-2"><Package size={14}/>{detail.product||'—'}</p></div>
            <div><p className="text-sm text-gray-500 dark:text-gray-400">Supplier</p><p className="font-medium text-gray-900 dark:text-white flex items-center gap-2"><Truck size={14}/>{detail.supplier||'—'}</p></div>
          </div>
          {detail.requirement&&<div><p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Requirement</p><p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">{detail.requirement}</p></div>}
          {detail.tags&&detail.tags.length>0&&<div><p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Tags</p><div className="flex flex-wrap gap-2">{detail.tags.map((t,i)=><span key={i} className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">{t}</span>)}</div></div>}
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1"><p>Created: {new Date(detail.createdAt).toLocaleString()}</p>{detail.lastActivity&&<p>Last Activity: {new Date(detail.lastActivity).toLocaleString()}</p>}</div>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button onClick={()=>{quickReply(detail,'whatsapp');setDetail(null);}} className={`${btn} bg-green-600 hover:bg-green-700`}><MessageSquare size={14}/> WhatsApp</button>
            <button onClick={()=>{quickReply(detail,'email');setDetail(null);}} className={`${btn} bg-purple-600 hover:bg-purple-700`}><Mail size={14}/> Email</button>
            <button onClick={()=>{quickReply(detail,'sms');setDetail(null);}} className={`${btn} bg-orange-600 hover:bg-orange-700`}><Phone size={14}/> SMS</button>
            <button onClick={()=>{del(detail.id);setDetail(null);}} className={`${btn} bg-red-600 hover:bg-red-700`}><Trash2 size={14}/> Delete</button>
          </div>
        </div>)}
      </Modal>

      {/* Bulk Reply Modal */}
      <Modal open={showReply} onClose={()=>{setShowReply(false);setRMsg('');}} title="Bulk Reply to Leads" size="md">
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3"><p className="text-sm text-blue-700 dark:text-blue-300">Sending to <strong>{sel.size>0?sel.size:leads.length}</strong> leads</p></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Channel</label><div className="flex gap-3"><button type="button" onClick={()=>setRType('whatsapp')} className={`flex-1 p-3 rounded-lg border-2 transition-colors flex items-center justify-center gap-2 ${rType==='whatsapp'?'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300':'border-gray-200 dark:border-gray-600 text-gray-500'}`}><MessageSquare size={18}/> WhatsApp</button><button type="button" onClick={()=>setRType('email')} className={`flex-1 p-3 rounded-lg border-2 transition-colors flex items-center justify-center gap-2 ${rType==='email'?'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300':'border-gray-200 dark:border-gray-600 text-gray-500'}`}><Mail size={18}/> Email</button><button type="button" onClick={()=>setRType('sms')} className={`flex-1 p-3 rounded-lg border-2 transition-colors flex items-center justify-center gap-2 ${rType==='sms'?'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300':'border-gray-200 dark:border-gray-600 text-gray-500'}`}><Phone size={18}/> SMS</button></div></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label><textarea value={rMsg} onChange={e=>setRMsg(e.target.value)} className={`${inp} resize-none`} rows={4} placeholder="Type your message..."/></div>
          <div className="flex justify-end gap-3"><button onClick={()=>{setShowReply(false);setRMsg('');}} className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">Cancel</button><button onClick={handleBulkReply} className={`${btn} bg-purple-600 hover:bg-purple-700`}><Send size={14}/> Send Reply</button></div>
        </div>
      </Modal>

 {/* IndiaMART Email Settings Modal */}
 <Modal open={showImSettings} onClose={()=>setShowImSettings(false)} title="IndiaMART Email Integration" size="lg">
 <div className="space-y-4">
 <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
 <div className="flex items-start gap-3">
 <Zap className="text-orange-600 mt-0.5" size={20}/>
 <div>
 <h4 className="font-semibold text-gray-900 dark:text-white">FREE Feature - Auto-capture IndiaMART Leads</h4>
 <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Connect your IndiaMART enquiry email to automatically capture leads.</p>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">IMAP Host</label>
 <input type="text" value={imForm.imapHost} onChange={e=>setImForm({...imForm,imapHost:e.target.value})} className={inp} placeholder="imap.indiamart.com"/>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">IMAP Port</label>
 <input type="number" value={imForm.imapPort} onChange={e=>setImForm({...imForm,imapPort:parseInt(e.target.value)})} className={inp} placeholder="993"/>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">IndiaMART Email Address</label>
 <input type="email" value={imForm.email} onChange={e=>setImForm({...imForm,email:e.target.value})} className={inp} placeholder="your@email.com"/>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Password / App Password</label>
 <input type="password" value={imForm.password} onChange={e=>setImForm({...imForm,password:e.target.value})} className={inp} placeholder="Use App Password for Gmail"/>
 </div>

 <div className="flex items-center gap-2">
 <input type="checkbox" checked={imForm.useSSL} onChange={e=>setImForm({...imForm,useSSL:e.target.checked})} className="w-4 h-4 rounded border-gray-300"/>
 <label className="text-sm text-gray-700 dark:text-gray-300">Use SSL/TLS (Recommended)</label>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Google Sheets ID (Optional)</label>
 <input type="text" value={imForm.spreadsheetId} onChange={e=>setImForm({...imForm,spreadsheetId:e.target.value})} className={inp} placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"/>
 </div>

 <div className="flex items-center gap-2">
 <input type="checkbox" checked={imForm.autoSync} onChange={e=>setImForm({...imForm,autoSync:e.target.checked})} className="w-4 h-4 rounded border-gray-300"/>
 <label className="text-sm text-gray-700 dark:text-gray-300">Enable Auto-sync</label>
 </div>

 <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
 <p className="text-sm text-yellow-700 dark:text-yellow-300">For Gmail, use <a href="https://myaccount.google.com/apppasswords" target="_blank" className="underline">App Password</a></p>
 </div>

 <div className="flex gap-3 pt-2">
 <button onClick={testImConnection} disabled={imTesting} className="flex-1 p-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium">
 {imTesting?'Testing...':'Test Connection'}
 </button>
 <button onClick={saveImConfig} disabled={imTesting} className="flex-1 p-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 font-medium">
 Save & Connect
 </button>
 </div>
 </div>
 </Modal>

 </>
 )}
    </div>
  );
}
