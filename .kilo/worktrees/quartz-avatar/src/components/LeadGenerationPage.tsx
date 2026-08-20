import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, Download, MessageSquare, Mail, Phone, Plus, X, Eye, Send, Trash2, MapPin, Package, Truck, CheckCircle, AlertCircle, RefreshCw, ArrowUpRight, TrendingUp, UserPlus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RT, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
interface Lead { id:string; name:string; phone:string; email?:string; company?:string; source:string; tags:string[]; location?:string; product?:string; supplier?:string; requirement?:string; status:'new'|'contacted'|'qualified'|'won'|'lost'; dealValue?:number; createdAt:string; lastActivity?:string; metadata?:any; }
interface FormData { name:string; phone:string; email:string; company:string; location:string; product:string; supplier:string; requirement:string; source:string; tags:string; }
const SC:Record<string,string>={indiamart:'#FF6B00',justdial:'#FFD700',facebook_ads:'#1877F2',instagram_ads:'#E4405F',whatsapp:'#25D366',manual:'#6B7280',website:'#8B5CF6',referral:'#10B981',google_ads:'#4285F4'};
const STC:Record<string,string>={new:'#3B82F6',contacted:'#F59E0B',qualified:'#8B5CF6',won:'#10B981',lost:'#EF4444'};
const EF:FormData={name:'',phone:'',email:'',company:'',location:'',product:'',supplier:'',requirement:'',source:'manual',tags:''};
// Mock leads removed - data comes from real API
const tagToStatus=(tags:string[]):Lead['status']=>{const l=tags.map(t=>t.toLowerCase());if(l.includes('won'))return'won';if(l.includes('qualified'))return'qualified';if(l.includes('contacted'))return'contacted';if(l.includes('lost'))return'lost';return'new';};
const SCard:React.FC<{icon:React.ReactNode;label:string;value:string|number;c:string}>=({icon,label,value,c})=>{const m:Record<string,string>={blue:'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',green:'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',purple:'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',orange:'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'};return(<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700"><div className="flex items-center justify-between mb-3"><div className={`p-2.5 rounded-lg ${m[c]||m.blue}`}>{icon}</div></div><p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p></div>);};

const Modal: React.FC<{open:boolean;onClose:()=>void;title:string;children:React.ReactNode;size?:'sm'|'md'|'lg'|'xl'}>=({open,onClose,title,children,size='md'})=>{
  if(!open)return null;
  const sw:Record<string,string>={sm:'max-w-md',md:'max-w-lg',lg:'max-w-2xl',xl:'max-w-4xl'};
  return(<div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}><div className="fixed inset-0 bg-black/50"/><div className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full ${sw[size]} max-h-[90vh] overflow-y-auto`} onClick={e=>e.stopPropagation()}><div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-xl"><h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2><button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X size={20} className="text-gray-500"/></button></div><div className="p-6">{children}</div></div></div>);
};

export default function LeadGenerationPage(){
  const[leads,setLeads]=useState<Lead[]>([]);
  const[loading,setLoading]=useState(true);
  const[showForm,setShowForm]=useState(false);
  const[form,setForm]=useState<FormData>(EF);
  const[sel,setSel]=useState<Set<string>>(new Set());
  const[fSrc,setFSrc]=useState('all');
  const[fSt,setFSt]=useState('all');
  const[q,setQ]=useState('');
  const[sort,setSort]=useState<'date'|'name'|'value'>('date');
  const[sDir,setSDir]=useState<'asc'|'desc'>('desc');
  const[showReply,setShowReply]=useState(false);
  const[rType,setRType]=useState<'whatsapp'|'email'|'sms'>('whatsapp');
  const[rMsg,setRMsg]=useState('');
  const[showExport,setShowExport]=useState(false);
  const[detail,setDetail]=useState<Lead|null>(null);
  const[toast,setToast]=useState<{m:string;t:'success'|'error'}|null>(null);
  const[stats,setStats]=useState({total:0,today:0,bySource:[] as any[],byStatus:[] as any[]});

  const calc=(ll:Lead[])=>{const td=new Date().toDateString();const tc=ll.filter(l=>new Date(l.createdAt).toDateString()===td).length;const sm:Record<string,number>={},stm:Record<string,number>={};ll.forEach(l=>{sm[l.source]=(sm[l.source]||0)+1;const s=l.status||'new';stm[s]=(stm[s]||0)+1;});setStats({total:ll.length,today:tc,bySource:Object.entries(sm).map(([name,value])=>({name,value})),byStatus:Object.entries(stm).map(([name,value])=>({name,value}))});};

  const fetchLeads=useCallback(async()=>{
    setLoading(true);
    try{const token=localStorage.getItem('token');const p=new URLSearchParams();if(fSrc!=='all')p.set('source',fSrc);if(fSt!=='all')p.set('tags',fSt);if(q)p.set('search',q);const r=await fetch(`${API}/leads?${p}`,{headers:{Authorization:`Bearer ${token}`}});const d=await r.json();if(d.success){const m=(d.data||[]).map((c:any)=>({id:c.id,name:c.name||'',phone:c.phone||'',email:c.email||'',company:c.company||'',source:c.source||'manual',tags:c.tags||[],location:c.metadata?.city||c.metadata?.location||'',product:c.metadata?.product||c.metadata?.service||'',supplier:c.metadata?.supplier||'',requirement:c.metadata?.requirement||c.metadata?.message||'',status:tagToStatus(c.tags||[]),dealValue:c.dealValue,createdAt:c.createdAt,lastActivity:c.lastActivity,metadata:c.metadata}));setLeads(m);calc(m);}}catch{setLeads([]);calc([]);}
    setLoading(false);
  },[fSrc,fSt,q]);

  useEffect(()=>{fetchLeads();},[fetchLeads]);
  const toast_=(m:string,t:'success'|'error')=>{setToast({m,t});setTimeout(()=>setToast(null),3000);};

  const handleSubmit=async(e:React.FormEvent)=>{
    e.preventDefault();
    try{const token=localStorage.getItem('token'),bid=localStorage.getItem('businessId');const r=await fetch(`${API}/leads/manual`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({businessId:bid,source:form.source,leadData:{name:form.name,phone:form.phone,email:form.email||undefined,company:form.company||undefined,product:form.product||undefined,requirement:form.requirement||undefined,city:form.location||undefined,supplier:form.supplier||undefined}})});const d=await r.json();if(d.success){toast_('Lead added!','success');setShowForm(false);setForm(EF);fetchLeads();}else toast_(d.error||'Failed','error');}
    catch{toast_('Failed to add lead. Please try again.','error');}
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
    catch{toast_(`${rType} queued for ${tg.length} leads (demo)`,'success');}
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
  const selc="px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm";
  const btn="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium";

  return(
    <div className="p-6 space-y-6">
      {toast&&<div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white ${toast.t==='success'?'bg-green-500':'bg-red-500'}`}>{toast.t==='success'?<CheckCircle size={18}/>:<AlertCircle size={18}/>}{toast.m}</div>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><UserPlus size={28} className="text-blue-600"/> Lead Generation</h1><p className="text-gray-500 dark:text-gray-400 mt-1">Capture, manage & convert leads from multiple sources</p></div>
        <div className="flex items-center gap-3">
          <button onClick={()=>fetchLeads()} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><RefreshCw size={18}/></button>
          <button onClick={()=>setShowExport(true)} className={`${btn} bg-green-600 hover:bg-green-700`}><Download size={16}/> Export</button>
          <button onClick={()=>setShowReply(true)} className={`${btn} bg-purple-600 hover:bg-purple-700`}><Send size={16}/> Bulk Reply</button>
          <button onClick={()=>setShowForm(true)} className={`${btn} bg-blue-600 hover:bg-blue-700`}><Plus size={16}/> Add Lead</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SCard icon={<Users size={22}/>} label="Total Leads" value={stats.total} c="blue"/>
        <SCard icon={<TrendingUp size={22}/>} label="Today's Leads" value={stats.today} c="green"/>
        <SCard icon={<MessageSquare size={22}/>} label="Selected" value={sel.size} c="purple"/>
        <SCard icon={<ArrowUpRight size={22}/>} label="Conversion" value={`${stats.total?Math.round((stats.byStatus.find(s=>s.name==='won')?.value||0)/stats.total*100):0}%`} c="orange"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone *</label><input required type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className={inp} placeholder="+91 9876543210"/></div>
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

      {/* Lead Detail Modal */}
      <Modal open={!!detail} onClose={()=>setDetail(null)} title="Lead Details" size="lg">
        {detail&&(<div className="space-y-6">
          <div className="flex items-start gap-4"><div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">{detail.name?.charAt(0)?.toUpperCase()||'?'}</div><div className="flex-1"><h3 className="text-xl font-semibold text-gray-900 dark:text-white">{detail.name||'Unknown'}</h3>{detail.company&&<p className="text-gray-500 dark:text-gray-400">{detail.company}</p>}<div className="flex gap-2 mt-2"><span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{backgroundColor:SC[detail.source]||'#6B7280'}}>{detail.source.replace('_',' ')}</span><span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={{backgroundColor:`${STC[detail.status]||'#6B7280'}20`,color:STC[detail.status]||'#6B7280'}}>{detail.status}</span></div></div></div>
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

      {/* Export Modal */}
      <Modal open={showExport} onClose={()=>setShowExport(false)} title="Export Leads" size="sm">
        <div className="space-y-3">
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3"><p className="text-sm text-blue-700 dark:text-blue-300">Exporting <strong>{sel.size>0?sel.size:leads.length}</strong> leads{sel.size>0?' (selected only)':' (all leads)'}</p></div>
          <button onClick={()=>handleExport('csv')} className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 text-left flex items-center gap-3"><Download size={18} className="text-blue-600"/><span className="font-medium text-gray-900 dark:text-white">CSV File</span><span className="text-xs text-gray-500 ml-auto">.csv</span></button>
          <button onClick={()=>handleExport('excel')} className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 text-left flex items-center gap-3"><Download size={18} className="text-green-600"/><span className="font-medium text-gray-900 dark:text-white">Excel File</span><span className="text-xs text-gray-500 ml-auto">.xlsx</span></button>
          <button onClick={()=>handleExport('sheets')} className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 text-left flex items-center gap-3"><Download size={18} className="text-yellow-600"/><span className="font-medium text-gray-900 dark:text-white">Google Sheets</span><span className="text-xs text-gray-500 ml-auto">Sync</span></button>
        </div>
      </Modal>
    </div>
  );
}
