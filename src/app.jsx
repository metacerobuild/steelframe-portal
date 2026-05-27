import { useState, useEffect, useCallback, useRef } from "react";

// ─── CONFIG ────────────────────────────────────────────────────────────────
const BASE_ID   = "app8xxMh5wLTxq1Mt";
const TABLE_ID  = "tbl4IVT4iNGn4qmF8";
const AIRTABLE  = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;

const F = {
  ref:"fldttqQoZrR6gIePu", project:"fldhCXVccClce5AgQ", type:"fldY4SPPqSFgILq3B",
  client:"fld97XwMlTUw0xMSE", contact:"fld1805ZVlguTTUlB", email:"fld3TvJ6gy6BLPCbA",
  phone:"fldNaPoFyp9F7UZsu", address:"fld1tlQAQRdRbIbIs", city:"fldCUA6DnFdpaSDlK",
  state:"fldWe8s7PZ51hMXJJ", zip:"fldDRADcLIxNxIdBU", useType:"fldJKfx5aL1QfpkmX",
  width:"fldARvNOzlOyuWJ7m", length:"fldfqeixzDkDV9O25", height:"fldtmmdZw5AhR9Ayu",
  pitch:"fldA0wFvDzhSyExIA", engClass:"fldlvntj8POrptOgP", scope:"fldTC8aRqx4SymlMY",
  status:"fldoFFv83HCfGI9XW", urgent:"fldHohzCxIKL9FzZC", assignee:"fldVVWQfwrNe03qpJ",
  submitted:"fldp46IbkKKKnKNfL", accepted:"fldFNrefHiINPpz0k", completed:"fldPxWZPrnZZYDAPw",
  quoteSent:"fldqRGAwYewPqmWJo", delivery:"fldlEkce4pmgG0EYQ", leadTime:"fldtKMfrDwYkPeQ5B",
  value:"fldjTzHwMTB2GjSU1", expiry:"fldRmtB8BSIl2zbe2", winLoss:"fldDh9ah9qr0cQnsf",
  notes:"fldVdAz6y30li3CLf", internal:"fldpiUoxE7cI5QTRZ", files:"fldwgIlkX3LXUUXSk",
};

const STATUSES = ["Submitted","Files Checked","D&E Accepted","Pricing","Quote Ready","Quote Sent","Won","Lost","On Hold"];
const STAGE_MAP = { "Submitted":0,"Files Checked":1,"D&E Accepted":2,"Pricing":3,"Quote Ready":4,"Quote Sent":5,"Won":6,"Lost":6,"On Hold":1 };
const STATUS_STYLE = {
  "Submitted":    { bg:"#EBF3FB", color:"#1A5E9E" },
  "Files Checked":{ bg:"#E3F4F9", color:"#1A6E85" },
  "D&E Accepted": { bg:"#FFF3E0", color:"#8A5200" },
  "Pricing":      { bg:"#FFF8E1", color:"#7A5C00" },
  "Quote Ready":  { bg:"#E8F5E9", color:"#1B6B30" },
  "Quote Sent":   { bg:"#EDE7F6", color:"#4527A0" },
  "Won":          { bg:"#E0F2F1", color:"#00564A" },
  "Lost":         { bg:"#FFEBEE", color:"#C62828" },
  "On Hold":      { bg:"#F5F5F5", color:"#555"    },
};
const SCOPE_OPTIONS = [
  "Steel Frame","Wall Cladding","Roofing Sheets","Insulation",
  "Windows & Skylights","Roller / PA Doors","Gutters & Downpipes","Fasteners & Flashings"
];
const STAGE_LABELS = ["Submitted","Files Checked","D&E Accepted","Pricing","Quote Ready","Sent"];

// ─── EMAIL NOTIFICATION TEMPLATES ──────────────────────────────────────────
const EMAIL_TEMPLATES = {
  "Submitted": {
    subject: (r) => `Quote request received — ${fv(r,"ref")}`,
    body: (r) => `Hi ${fv(r,"contact") || "there"},\n\nThank you for submitting your quote request for ${fv(r,"project")}. We have received your enquiry and our Design & Engineering team will review it shortly.\n\nReference: ${fv(r,"ref")}\nProject: ${fv(r,"project")}\nAddress: ${[fv(r,"address"),fv(r,"city"),fv(r,"state")].filter(Boolean).join(", ")}\n\nYou can track the status of your quote at any time through the portal.\n\nWe'll be in touch within 2 business days.\n\nKind regards,\nSteelFrame Team`,
  },
  "D&E Accepted": {
    subject: (r) => `Your quote is being prepared — ${fv(r,"ref")}`,
    body: (r) => `Hi ${fv(r,"contact") || "there"},\n\nGood news — our Design & Engineering team has accepted your quote request for ${fv(r,"project")} and work is now underway.\n\nReference: ${fv(r,"ref")}\nAssigned to: ${fv(r,"assignee") || "our D&E team"}\n\nWe will notify you as soon as your quote is ready.\n\nKind regards,\nSteelFrame Team`,
  },
  "Quote Ready": {
    subject: (r) => `Your quote is ready — ${fv(r,"ref")}`,
    body: (r) => `Hi ${fv(r,"contact") || "there"},\n\nGreat news! Your quote for ${fv(r,"project")} is now ready.\n\nReference: ${fv(r,"ref")}\nQuote Value: ${fv(r,"value") ? "$"+Number(fv(r,"value")).toLocaleString() : "See attached"}\nQuote Expiry: ${fmt(fv(r,"expiry")) || "30 days from issue"}\nEstimated Delivery: ${fmt(fv(r,"delivery")) || "TBC"}\nLead Time: ${fv(r,"leadTime") || "TBC"}\n\nPlease log in to the portal to review your quote document. If you have any questions, please don't hesitate to contact us.\n\nKind regards,\nSteelFrame Team`,
  },
  "Won": {
    subject: (r) => `Order confirmed — ${fv(r,"ref")}`,
    body: (r) => `Hi ${fv(r,"contact") || "there"},\n\nThank you for accepting our quote and placing your order for ${fv(r,"project")}.\n\nReference: ${fv(r,"ref")}\nEstimated Delivery: ${fmt(fv(r,"delivery")) || "TBC"}\n\nOur team will be in touch shortly with next steps and production scheduling.\n\nKind regards,\nSteelFrame Team`,
  },
};

// ─── HELPERS ───────────────────────────────────────────────────────────────
function fv(rec, key) { return rec?.fields?.[F[key]] ?? null; }
function fmt(dt) {
  if (!dt) return null;
  return new Date(dt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
}
function fmtFull(dt) {
  if (!dt) return null;
  return new Date(dt).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});
}
function daysDiff(a, b) {
  if (!a) return null;
  return Math.round((( b ? new Date(b) : new Date()) - new Date(a)) / 86400000);
}
function headers(tok) {
  return { Authorization:`Bearer ${tok}`, "Content-Type":"application/json" };
}

async function apiFetch(tok, path="", opts={}) {
  const res = await fetch(AIRTABLE + path, { headers: headers(tok), ...opts });
  if (!res.ok) { const t = await res.text(); throw new Error(t); }
  return res.json();
}
async function loadRecords(tok) {
  const url = `?sort[0][field]=${F.submitted}&sort[0][direction]=desc`;
  return (await apiFetch(tok, url)).records;
}
async function patchRecord(tok, id, fields) {
  return apiFetch(tok, `/${id}`, { method:"PATCH", body: JSON.stringify({fields, typecast:true}) });
}
async function createRecord(tok, fields) {
  return apiFetch(tok, "", { method:"POST", body: JSON.stringify({fields, typecast:true}) });
}

// ─── UI ATOMS ──────────────────────────────────────────────────────────────
function Badge({ status }) {
  const s = STATUS_STYLE[status] || { bg:"#eee", color:"#333" };
  return <span style={{display:"inline-block",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,background:s.bg,color:s.color,whiteSpace:"nowrap"}}>{status}</span>;
}
function TypeBadge({ type }) {
  const map = { Reseller:{bg:"#EDE7F6",color:"#4527A0"}, Architect:{bg:"#E3F4F9",color:"#1A6E85"} };
  const s = map[type] || {bg:"#EBF3FB",color:"#1A5E9E"};
  return <span style={{display:"inline-block",padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:600,background:s.bg,color:s.color}}>{type||"—"}</span>;
}
function Stepper({ status }) {
  const cur = STAGE_MAP[status] ?? 0;
  const terminal = status==="Won"||status==="Lost";
  return (
    <div style={{display:"flex",gap:0,paddingTop:6}}>
      {STAGE_LABELS.map((s,i) => {
        const done = terminal ? true : i < cur;
        const active = !terminal && i === cur;
        return (
          <div key={s} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",position:"relative"}}>
            {i < STAGE_LABELS.length-1 && <div style={{position:"absolute",top:11,left:"50%",right:"-50%",height:2,background:done?"#2E7D52":"#E0E0E0",zIndex:0}}/>}
            <div style={{width:22,height:22,borderRadius:"50%",zIndex:1,position:"relative",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,background:done?"#2E7D52":active?"#1A3A6B":"#F5F5F5",border:`2px solid ${done?"#2E7D52":active?"#1A3A6B":"#BDBDBD"}`,color:done||active?"#fff":"#9E9E9E"}}>{done?"✓":i+1}</div>
            <div style={{fontSize:9,marginTop:5,textAlign:"center",lineHeight:1.3,color:active?"#1A3A6B":done?"#2E7D52":"#9E9E9E",fontWeight:active||done?600:400}}>{s}</div>
          </div>
        );
      })}
    </div>
  );
}
function InfoRow({ label, value, color }) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #F5F5F5",fontSize:12,gap:12}}>
      <span style={{color:"#888",flexShrink:0}}>{label}</span>
      <span style={{color:color||"#1A1A1A",fontWeight:500,textAlign:"right"}}>{value||"—"}</span>
    </div>
  );
}
function Card({ children, style={} }) {
  return <div style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:12,padding:"14px 16px",marginBottom:12,...style}}>{children}</div>;
}
function CardTitle({ children }) {
  return <div style={{fontSize:11,fontWeight:700,color:"#AAA",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10}}>{children}</div>;
}
function Btn({ onClick, primary, danger, small, disabled, children, style={} }) {
  const bg = disabled ? "#CCC" : danger ? "#FFEBEE" : primary ? "#1A3A6B" : "#fff";
  const color = disabled ? "#fff" : danger ? "#C62828" : primary ? "#fff" : "#333";
  const border = danger ? "1px solid #FFCDD2" : primary ? "none" : "1px solid #DDD";
  return (
    <button onClick={onClick} disabled={disabled} style={{padding:small?"4px 10px":"7px 14px",borderRadius:7,background:bg,color,border,fontSize:small?11:12,fontWeight:600,cursor:disabled?"default":"pointer",...style}}>
      {children}
    </button>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  project:"",type:"Direct Customer",client:"",contact:"",email:"",phone:"",
  address:"",city:"",state:"TX",zip:"",useType:"",width:"",length:"",height:"",
  pitch:"1:10",engClass:"",scope:[],notes:"",urgent:false,
};

export default function App() {
  const [token,      setToken]      = useState("");
  const [tokenOk,    setTokenOk]    = useState(false);
  const [mode,       setMode]       = useState("customer"); // "customer"|"admin"
  const [page,       setPage]       = useState("dashboard");
  const [records,    setRecords]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [selected,   setSelected]   = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [successRef, setSuccessRef] = useState(null);
  const [fStatus,    setFStatus]    = useState("All");
  const [fType,      setFType]      = useState("All");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileRef = useRef();

  // Admin edit state
  const [editRec,    setEditRec]    = useState(null); // record being edited in admin
  const [editFields, setEditFields] = useState({});
  const [saving,     setSaving]     = useState(false);
  const [emailModal, setEmailModal] = useState(null); // {rec, template}

  const load = useCallback(async () => {
    if (!tokenOk) return;
    setLoading(true); setError(null);
    try { setRecords(await loadRecords(token)); }
    catch(e) { setError("Could not load records. Check your API token."); }
    finally { setLoading(false); }
  }, [tokenOk, token]);

  useEffect(() => { load(); }, [load]);

  function saveToken() {
    if (!token.trim()) return;
    setTokenOk(true);
  }

  const filtered = records.filter(r => {
    const s = fv(r,"status")||"Submitted", t = fv(r,"type")||"Direct Customer";
    return (fStatus==="All"||s===fStatus) && (fType==="All"||t===fType);
  });

  const metrics = {
    total: records.length,
    active: records.filter(r => !["Won","Lost","Quote Sent"].includes(fv(r,"status"))).length,
    unaccepted: records.filter(r => fv(r,"status")==="Submitted" && !fv(r,"accepted")).length,
    ready: records.filter(r => fv(r,"status")==="Quote Ready").length,
    avgTA: (() => {
      const done = records.filter(r => fv(r,"submitted") && fv(r,"quoteSent"));
      if (!done.length) return "—";
      return Math.round(done.reduce((a,r)=>a+daysDiff(fv(r,"submitted"),fv(r,"quoteSent")),0)/done.length)+"d";
    })(),
  };

  // ── Submit new quote ──
  async function handleSubmit() {
    if (!form.project||!form.address) return alert("Project name and address are required.");
    setSubmitting(true);
    const ref = `SF-${new Date().getFullYear()}-${String(Math.floor(Math.random()*900)+100)}`;
    const fields = {};
    const map = {
      [F.ref]:form.project&&ref, [F.project]:form.project, [F.type]:form.type,
      [F.client]:form.client, [F.contact]:form.contact, [F.email]:form.email,
      [F.phone]:form.phone, [F.address]:form.address, [F.city]:form.city,
      [F.state]:form.state, [F.zip]:form.zip, [F.useType]:form.useType,
      [F.width]:form.width?parseFloat(form.width):null,
      [F.length]:form.length?parseFloat(form.length):null,
      [F.height]:form.height?parseFloat(form.height):null,
      [F.pitch]:form.pitch, [F.engClass]:form.engClass,
      [F.scope]:form.scope, [F.status]:"Submitted",
      [F.urgent]:form.urgent, [F.submitted]:new Date().toISOString(),
      [F.notes]:form.notes,
    };
    Object.entries(map).forEach(([k,v])=>{ if(v!==null&&v!=="") fields[k]=v; });
    // Attach uploaded files as URLs if any (base64 files need a hosting service in prod)
    if (uploadedFiles.length) {
      fields[F.files] = uploadedFiles.map(f => ({ url: f.dataUrl, filename: f.name }));
    }
    try {
      const rec = await createRecord(token, fields);
      setSuccessRef(ref);
      setForm(EMPTY_FORM); setUploadedFiles([]);
      setPage("dashboard"); await load();
      // Optionally pre-populate email modal for "Submitted" notification
    } catch(e) { alert("Failed to submit. Check your API token."); }
    finally { setSubmitting(false); }
  }

  // ── Admin save ──
  async function handleAdminSave() {
    if (!editRec) return;
    setSaving(true);
    try {
      await patchRecord(token, editRec.id, editFields);
      await load();
      // refresh selected
      setSelected(prev => prev ? { ...prev, fields: { ...prev.fields, ...editFields } } : prev);
      setEditRec(null); setEditFields({});
    } catch(e) { alert("Save failed: "+e.message); }
    finally { setSaving(false); }
  }

  function startEdit(rec) {
    setEditRec(rec);
    setEditFields({
      [F.status]:    fv(rec,"status")||"Submitted",
      [F.assignee]:  fv(rec,"assignee")||"",
      [F.accepted]:  fv(rec,"accepted")||"",
      [F.completed]: fv(rec,"completed")||"",
      [F.quoteSent]: fv(rec,"quoteSent")||"",
      [F.value]:     fv(rec,"value")||"",
      [F.expiry]:    fv(rec,"expiry")||"",
      [F.delivery]:  fv(rec,"delivery")||"",
      [F.leadTime]:  fv(rec,"leadTime")||"",
      [F.internal]:  fv(rec,"internal")||"",
      [F.winLoss]:   fv(rec,"winLoss")||"",
    });
  }

  function openDetail(rec) { setSelected(rec); setPage("detail"); }

  function prepEmail(rec) {
    const status = fv(rec,"status")||"Submitted";
    const tmpl = EMAIL_TEMPLATES[status];
    if (!tmpl) return alert("No email template for this status.");
    setEmailModal({ rec, subject: tmpl.subject(rec), body: tmpl.body(rec) });
  }

  async function handleFileSelect(files) {
    const newFiles = [];
    for (const f of Array.from(files)) {
      const dataUrl = await new Promise(res => {
        const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(f);
      });
      newFiles.push({ name: f.name, size: f.size, dataUrl, type: f.type });
    }
    setUploadedFiles(p => [...p, ...newFiles]);
  }

  // ─── TOKEN GATE ──────────────────────────────────────────────────────────
  if (!tokenOk) return (
    <div style={{minHeight:440,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,background:"#FAFAFA",fontFamily:"system-ui,sans-serif"}}>
      <div style={{width:36,height:36,background:"#1A3A6B",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:18}}>
        <svg width="20" height="20" viewBox="0 0 18 18" fill="none"><rect x="2" y="10" width="14" height="3" rx="1" fill="white" opacity="0.9"/><rect x="2" y="5" width="14" height="3" rx="1" fill="white" opacity="0.7"/><rect x="5" y="3" width="2" height="12" rx="1" fill="white" opacity="0.6"/><rect x="11" y="3" width="2" height="12" rx="1" fill="white" opacity="0.6"/></svg>
      </div>
      <div style={{fontSize:19,fontWeight:700,marginBottom:5,color:"#1A1A1A"}}>SteelFrame Portal</div>
      <div style={{fontSize:13,color:"#888",marginBottom:22,textAlign:"center",maxWidth:380}}>Enter your Airtable personal access token to connect. Create one at <strong>airtable.com/create/tokens</strong> with read/write access to the SteelFrame Quote Portal base.</div>
      <div style={{display:"flex",gap:8,width:"100%",maxWidth:420}}>
        <input type="password" placeholder="patXXXXXXXXXXXXXX..." value={token} onChange={e=>setToken(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveToken()} style={{flex:1,padding:"9px 12px",border:"1px solid #DDD",borderRadius:8,fontSize:13,fontFamily:"monospace"}}/>
        <button onClick={saveToken} style={{padding:"9px 20px",background:"#1A3A6B",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"}}>Connect →</button>
      </div>
      <div style={{fontSize:11,color:"#BDBDBD",marginTop:12}}>Token stored in memory only — never transmitted outside this session.</div>
    </div>
  );

  // ─── SHARED TOPBAR ───────────────────────────────────────────────────────
  const Topbar = () => (
    <div style={{background:"#fff",borderBottom:"1px solid #EBEBEB",padding:"0 18px",height:50,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",gap:9}}>
        <div style={{width:28,height:28,background:"#1A3A6B",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <svg width="15" height="15" viewBox="0 0 18 18" fill="none"><rect x="2" y="10" width="14" height="3" rx="1" fill="white" opacity="0.9"/><rect x="2" y="5" width="14" height="3" rx="1" fill="white" opacity="0.7"/><rect x="5" y="3" width="2" height="12" rx="1" fill="white" opacity="0.6"/><rect x="11" y="3" width="2" height="12" rx="1" fill="white" opacity="0.6"/></svg>
        </div>
        <span style={{fontWeight:700,fontSize:14,color:"#1A1A1A"}}>SteelFrame Portal</span>
        <span style={{fontSize:10,background:"#E8F5E9",color:"#2E7D52",padding:"2px 7px",borderRadius:10,fontWeight:700,marginLeft:2}}>LIVE</span>
      </div>
      <div style={{display:"flex",gap:2}}>
        {(mode==="customer"?[["dashboard","Dashboard"],["submit","New quote"]]:
          [["admin-dashboard","Dashboard"],["admin-queue","Queue"],["admin-detail","Quote detail"]]).map(([id,label])=>(
          <button key={id} onClick={()=>setPage(id)} style={{padding:"5px 12px",borderRadius:7,fontSize:12,cursor:"pointer",border:"none",background:page===id?"#F0F0F0":"transparent",color:page===id?"#1A1A1A":"#888",fontWeight:page===id?700:400}}>{label}</button>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <button onClick={()=>{setMode(mode==="customer"?"admin":"customer");setPage(mode==="customer"?"admin-dashboard":"dashboard");}} style={{padding:"4px 11px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",border:`1.5px solid ${mode==="admin"?"#1A3A6B":"#DDD"}`,background:mode==="admin"?"#EBF3FB":"#fff",color:mode==="admin"?"#1A3A6B":"#888"}}>
          {mode==="customer"?"⚙ Admin":"← Customer"}
        </button>
        <div style={{width:26,height:26,borderRadius:"50%",background:mode==="admin"?"#FFF3E0":"#CFE2FF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:mode==="admin"?"#8A5200":"#1A5E9E"}}>
          {mode==="admin"?"AD":"JM"}
        </div>
        <span style={{fontSize:12,color:"#666"}}>{mode==="admin"?"Admin":"J. Martinez"}</span>
      </div>
    </div>
  );

  // ─── SHARED DETAIL PANEL ─────────────────────────────────────────────────
  function DetailPanel({ rec, backPage }) {
    if (!rec) return null;
    const status = fv(rec,"status")||"Submitted";
    const scope  = fv(rec,"scope")||[];
    const files  = fv(rec,"files")||[];
    const ta     = daysDiff(fv(rec,"submitted"), fv(rec,"completed")||fv(rec,"quoteSent"));
    const taOpen = !["Won","Lost","Quote Sent"].includes(status);
    const isAdmin = mode==="admin";

    return (
      <div>
        <button onClick={()=>setPage(backPage)} style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:"#888",background:"none",border:"none",cursor:"pointer",marginBottom:14,padding:0}}>← Back</button>

        {/* Header */}
        <Card style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div>
              <div style={{fontSize:17,fontWeight:700,color:"#1A1A1A",marginBottom:4}}>{fv(rec,"project")}</div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:12,color:"#888"}}>
                <span># {fv(rec,"ref")}</span>
                <span>📍 {[fv(rec,"address"),fv(rec,"city"),fv(rec,"state")].filter(Boolean).join(", ")}</span>
                <span>🏗 {fv(rec,"useType")||"—"}</span>
              </div>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
              <TypeBadge type={fv(rec,"type")}/>
              <Badge status={status}/>
              {fv(rec,"urgent")&&<span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:"#FFEBEE",color:"#C62828"}}>🚩 URGENT</span>}
              {isAdmin && <>
                <Btn small onClick={()=>startEdit(rec)}>✏ Edit</Btn>
                <Btn small onClick={()=>prepEmail(rec)} style={{marginLeft:2}}>✉ Email</Btn>
              </>}
            </div>
          </div>
          <Stepper status={status}/>
        </Card>

        <div style={{display:"grid",gridTemplateColumns:"minmax(0,1.8fr) minmax(0,1fr)",gap:14}}>
          <div>
            <Card>
              <CardTitle>Project details</CardTitle>
              <InfoRow label="Client / end user" value={fv(rec,"client")}/>
              <InfoRow label="Contact" value={[fv(rec,"contact"),fv(rec,"email"),fv(rec,"phone")].filter(Boolean).join(" · ")}/>
              <InfoRow label="Dimensions" value={[fv(rec,"width")&&`${fv(rec,"width")}m W`,fv(rec,"length")&&`${fv(rec,"length")}m L`,fv(rec,"height")&&`${fv(rec,"height")}m H`].filter(Boolean).join(" × ")||null}/>
              <InfoRow label="Roof pitch" value={fv(rec,"pitch")}/>
              <InfoRow label="Eng. class / wind zone" value={fv(rec,"engClass")}/>
              <InfoRow label="Assigned estimator" value={fv(rec,"assignee")||"Unassigned"}/>
            </Card>

            <Card>
              <CardTitle>Key dates &amp; timing</CardTitle>
              <InfoRow label="Submitted" value={fmtFull(fv(rec,"submitted"))}/>
              <InfoRow label="D&amp;E accepted" value={fmtFull(fv(rec,"accepted"))||"Pending acceptance"}/>
              <InfoRow label="D&amp;E completed" value={fmtFull(fv(rec,"completed"))||"Pending"}/>
              <InfoRow label="Quote sent" value={fmtFull(fv(rec,"quoteSent"))||"Pending"}/>
              <InfoRow label="Est. delivery" value={fmt(fv(rec,"delivery"))||"TBC"}/>
              <InfoRow label="Lead time" value={fv(rec,"leadTime")||"TBC"}/>
              <InfoRow label="Quote expiry" value={fmt(fv(rec,"expiry"))||"Not yet issued"}/>
              <InfoRow label="Quote value" value={fv(rec,"value")?"$"+Number(fv(rec,"value")).toLocaleString():"Pending"} color={fv(rec,"value")?"#2E7D52":undefined}/>
              {ta!==null && <InfoRow label="Turnaround" value={`${ta} days${taOpen?" (open)":""}`} color={taOpen?"#C84B00":"#2E7D52"}/>}
            </Card>

            <Card>
              <CardTitle>Scope of supply</CardTitle>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {scope.length ? scope.map(s=>(
                  <span key={s} style={{padding:"4px 10px",borderRadius:20,fontSize:11,background:"#EBF3FB",color:"#1A5E9E",fontWeight:500}}>{s}</span>
                )) : <span style={{color:"#CCC",fontSize:12}}>None specified</span>}
              </div>
            </Card>

            {/* Design Files */}
            <Card>
              <CardTitle>Design files</CardTitle>
              {files.length ? (
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {files.map((f,i) => (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:"#FAFAFA",borderRadius:8,border:"1px solid #EBEBEB"}}>
                      <span style={{fontSize:16}}>📄</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:600,color:"#1A1A1A"}}>{f.filename}</div>
                        {f.size && <div style={{fontSize:10,color:"#AAA"}}>{(f.size/1024/1024).toFixed(1)} MB</div>}
                      </div>
                      <a href={f.url} target="_blank" rel="noreferrer" style={{fontSize:11,color:"#1A5E9E",fontWeight:600,textDecoration:"none",padding:"3px 8px",borderRadius:6,border:"1px solid #B5D4F4",background:"#EBF3FB"}}>View ↗</a>
                    </div>
                  ))}
                </div>
              ) : <span style={{fontSize:12,color:"#BBB"}}>No files attached</span>}
            </Card>

            {isAdmin && fv(rec,"internal") && (
              <Card style={{borderLeft:"3px solid #FFF3E0"}}>
                <CardTitle>Internal notes</CardTitle>
                <p style={{fontSize:12,color:"#666",lineHeight:1.6}}>{fv(rec,"internal")}</p>
              </Card>
            )}
          </div>

          {/* Timeline */}
          <Card>
            <CardTitle>Activity timeline</CardTitle>
            {[
              {label:"Request submitted", ts:fv(rec,"submitted"), done:!!fv(rec,"submitted"), sub:fv(rec,"contact")},
              {label:"Files received & checked", done:STAGE_MAP[status]>=1},
              {label:"D&E accepted", ts:fv(rec,"accepted"), done:!!fv(rec,"accepted"), sub:fv(rec,"assignee")?`Assigned to ${fv(rec,"assignee")}`:null},
              {label:"Pricing in progress", done:STAGE_MAP[status]>=3},
              {label:"D&E completed / pricing finalised", ts:fv(rec,"completed"), done:!!fv(rec,"completed")},
              {label:"Quote emailed to customer", ts:fv(rec,"quoteSent"), done:!!fv(rec,"quoteSent")},
              {label:"Quote published to portal", ts:fv(rec,"quoteSent"), done:!!fv(rec,"quoteSent")},
              ...(status==="Won"?[{label:"Order accepted ✓", done:true}]:[]),
            ].map((item,i,arr)=>(
              <div key={i} style={{display:"flex",gap:10,paddingBottom:i===arr.length-1?0:12}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                  <div style={{width:9,height:9,borderRadius:"50%",background:item.done?"#2E7D52":"#E0E0E0",marginTop:3,flexShrink:0}}/>
                  {i<arr.length-1&&<div style={{flex:1,width:1,background:"#EBEBEB",marginTop:3}}/>}
                </div>
                <div style={{paddingBottom:2}}>
                  <div style={{fontSize:12,fontWeight:item.done?600:400,color:item.done?"#1A1A1A":"#BDBDBD"}}>{item.label}</div>
                  {item.done&&item.ts&&<div style={{fontSize:10,color:"#9E9E9E",marginTop:1}}>{fmtFull(item.ts)}</div>}
                  {item.sub&&item.done&&<div style={{fontSize:10,color:"#9E9E9E",marginTop:1}}>{item.sub}</div>}
                  {!item.done&&<div style={{fontSize:10,color:"#BDBDBD",marginTop:1,fontStyle:"italic"}}>Pending</div>}
                </div>
              </div>
            ))}
            {fv(rec,"notes")&&(
              <div style={{marginTop:14,padding:"9px 11px",background:"#FAFAFA",borderRadius:8,fontSize:11,color:"#666",borderLeft:"3px solid #E0E0E0"}}>
                <div style={{fontWeight:700,marginBottom:3,color:"#AAA",fontSize:10,textTransform:"uppercase",letterSpacing:"0.05em"}}>Customer notes</div>
                {fv(rec,"notes")}
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // ─── SHARED TABLE ────────────────────────────────────────────────────────
  function QuoteTable({ recs, onRowClick }) {
    return (
      <div style={{background:"#fff",borderRadius:12,border:"1px solid #EBEBEB",overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:900,tableLayout:"fixed"}}>
          <thead>
            <tr style={{background:"#FAFAFA",borderBottom:"1px solid #EBEBEB"}}>
              {["Project","Type","Submitted","D&E Accepted","D&E Completed","Status","Assignee","Est. Delivery","Turnaround"].map(h=>(
                <th key={h} style={{padding:"8px 12px",fontSize:10,fontWeight:700,color:"#AAA",textAlign:"left",letterSpacing:"0.05em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recs.length===0&&<tr><td colSpan={9} style={{textAlign:"center",padding:40,color:"#BBB",fontSize:13}}>No quotes found.</td></tr>}
            {recs.map(rec => {
              const status = fv(rec,"status")||"Submitted";
              const ta = daysDiff(fv(rec,"submitted"),fv(rec,"completed")||(["Won","Lost","Quote Sent"].includes(status)?fv(rec,"quoteSent"):null));
              const taOpen = !["Won","Lost","Quote Sent"].includes(status);
              return (
                <tr key={rec.id} onClick={()=>onRowClick(rec)} style={{cursor:"pointer"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{padding:"10px 12px",fontSize:12,borderBottom:"1px solid #F5F5F5"}}>
                    <div style={{fontWeight:700}}>{fv(rec,"project")}</div>
                    <div style={{fontSize:10,color:"#BBB",marginTop:1}}>{fv(rec,"ref")}</div>
                  </td>
                  <td style={{padding:"10px 12px",fontSize:12,borderBottom:"1px solid #F5F5F5"}}><TypeBadge type={fv(rec,"type")}/></td>
                  <td style={{padding:"10px 12px",fontSize:12,borderBottom:"1px solid #F5F5F5",color:"#555"}}>{fmt(fv(rec,"submitted"))||"—"}</td>
                  <td style={{padding:"10px 12px",fontSize:12,borderBottom:"1px solid #F5F5F5"}}>
                    {fv(rec,"accepted") ? <div><div style={{color:"#1A1A1A"}}>{fmt(fv(rec,"accepted"))}</div><div style={{fontSize:10,color:"#AAA"}}>{fv(rec,"assignee")||""}</div></div>
                      : <span style={{color:"#BDBDBD",fontStyle:"italic"}}>Pending</span>}
                  </td>
                  <td style={{padding:"10px 12px",fontSize:12,borderBottom:"1px solid #F5F5F5"}}>
                    {fv(rec,"completed") ? <span style={{color:"#1A1A1A"}}>{fmt(fv(rec,"completed"))}</span>
                      : <span style={{color:"#BDBDBD",fontStyle:"italic"}}>Pending</span>}
                  </td>
                  <td style={{padding:"10px 12px",borderBottom:"1px solid #F5F5F5"}}><Badge status={status}/></td>
                  <td style={{padding:"10px 12px",fontSize:12,borderBottom:"1px solid #F5F5F5",color:"#555"}}>{fv(rec,"assignee")||<span style={{color:"#CCC"}}>Unassigned</span>}</td>
                  <td style={{padding:"10px 12px",fontSize:12,borderBottom:"1px solid #F5F5F5",color:"#555"}}>{fmt(fv(rec,"delivery"))||"—"}</td>
                  <td style={{padding:"10px 12px",fontSize:12,borderBottom:"1px solid #F5F5F5"}}>
                    {ta!==null ? <span style={{fontWeight:700,color:taOpen?"#C84B00":"#2E7D52"}}>{ta}d{taOpen?" ↑":""}</span> : <span style={{color:"#CCC"}}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────
  const Filters = () => (
    <div style={{display:"flex",gap:7,alignItems:"center"}}>
      <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={{fontSize:11,padding:"4px 8px",borderRadius:6,border:"1px solid #DDD",background:"#fff"}}>
        <option value="All">All statuses</option>
        {STATUSES.map(s=><option key={s}>{s}</option>)}
      </select>
      <select value={fType} onChange={e=>setFType(e.target.value)} style={{fontSize:11,padding:"4px 8px",borderRadius:6,border:"1px solid #DDD",background:"#fff"}}>
        <option value="All">All types</option>
        {["Direct Customer","Reseller","Architect"].map(t=><option key={t}>{t}</option>)}
      </select>
      <Btn small onClick={load}>↻ Refresh</Btn>
    </div>
  );

  const MetricCards = () => (
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:18}}>
      {[["Total requests",metrics.total,"All time"],["Active",metrics.active,"In progress"],["Awaiting D&E",metrics.unaccepted,"Not yet accepted"],["Quote ready",metrics.ready,"Pending review"],["Avg. turnaround",metrics.avgTA,"Submitted → sent"]].map(([l,v,s])=>(
        <div key={l} style={{background:"#fff",borderRadius:10,padding:"12px 14px",border:"1px solid #EBEBEB"}}>
          <div style={{fontSize:11,color:"#999",marginBottom:4}}>{l}</div>
          <div style={{fontSize:22,fontWeight:700,color:"#1A1A1A"}}>{v}</div>
          <div style={{fontSize:10,color:"#BBB",marginTop:2}}>{s}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{background:"#F7F7F5",minHeight:600,fontFamily:"'DM Sans',system-ui,sans-serif",display:"flex",flexDirection:"column"}}>
      <Topbar/>

      {/* Email modal */}
      {emailModal && (
        <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:60,zIndex:100,minHeight:500}}>
          <div style={{background:"#fff",borderRadius:14,padding:24,width:"90%",maxWidth:560,border:"1px solid #EBEBEB"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <span style={{fontSize:14,fontWeight:700}}>✉ Send email notification</span>
              <button onClick={()=>setEmailModal(null)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"#888"}}>×</button>
            </div>
            <div style={{marginBottom:10}}>
              <label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:5}}>To</label>
              <input readOnly value={fv(emailModal.rec,"email")||"(no email on record)"} style={{width:"100%",padding:"7px 10px",border:"1px solid #DDD",borderRadius:7,fontSize:12,background:"#FAFAFA",boxSizing:"border-box"}}/>
            </div>
            <div style={{marginBottom:10}}>
              <label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:5}}>Subject</label>
              <input value={emailModal.subject} onChange={e=>setEmailModal(m=>({...m,subject:e.target.value}))} style={{width:"100%",padding:"7px 10px",border:"1px solid #DDD",borderRadius:7,fontSize:12,boxSizing:"border-box"}}/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:5}}>Message</label>
              <textarea value={emailModal.body} onChange={e=>setEmailModal(m=>({...m,body:e.target.value}))} rows={10} style={{width:"100%",padding:"7px 10px",border:"1px solid #DDD",borderRadius:7,fontSize:11,fontFamily:"monospace",resize:"vertical",boxSizing:"border-box"}}/>
            </div>
            <div style={{background:"#FFF8E1",border:"1px solid #FFE082",borderRadius:8,padding:"9px 12px",fontSize:11,color:"#8A5200",marginBottom:14}}>
              ⚠ This is a preview. In production, connect to SendGrid, Mailgun or your email provider to send. Copy the message above to send manually, or wire up your email API.
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
              <Btn onClick={()=>setEmailModal(null)}>Cancel</Btn>
              <Btn primary onClick={()=>{navigator.clipboard?.writeText(`To: ${fv(emailModal.rec,"email")}\nSubject: ${emailModal.subject}\n\n${emailModal.body}`);alert("Email copied to clipboard — paste into your email client or connect an email API.");setEmailModal(null);}}>Copy &amp; Send</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Admin edit panel */}
      {editRec && (
        <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"flex-start",justifyContent:"flex-end",zIndex:100,minHeight:500}}>
          <div style={{background:"#fff",width:360,minHeight:"100%",padding:22,borderLeft:"1px solid #EBEBEB",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <span style={{fontSize:14,fontWeight:700}}>Edit quote — {fv(editRec,"ref")}</span>
              <button onClick={()=>setEditRec(null)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"#888"}}>×</button>
            </div>
            {[
              {label:"Status", key:F.status, type:"select", opts:STATUSES},
              {label:"Assigned estimator", key:F.assignee, type:"text"},
              {label:"D&E accepted (datetime)", key:F.accepted, type:"datetime-local"},
              {label:"D&E completed (datetime)", key:F.completed, type:"datetime-local"},
              {label:"Quote sent (datetime)", key:F.quoteSent, type:"datetime-local"},
              {label:"Quote value ($)", key:F.value, type:"number"},
              {label:"Quote expiry date", key:F.expiry, type:"date"},
              {label:"Estimated delivery date", key:F.delivery, type:"date"},
              {label:"Lead time (weeks)", key:F.leadTime, type:"text"},
              {label:"Win / loss reason", key:F.winLoss, type:"text"},
              {label:"Internal notes", key:F.internal, type:"textarea"},
            ].map(({label,key,type,opts})=>(
              <div key={key} style={{marginBottom:12}}>
                <label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{label}</label>
                {type==="select" ? (
                  <select value={editFields[key]||""} onChange={e=>setEditFields(f=>({...f,[key]:e.target.value}))} style={{width:"100%",padding:"7px 10px",border:"1px solid #DDD",borderRadius:7,fontSize:12,background:"#fff"}}>
                    {opts.map(o=><option key={o}>{o}</option>)}
                  </select>
                ) : type==="textarea" ? (
                  <textarea value={editFields[key]||""} onChange={e=>setEditFields(f=>({...f,[key]:e.target.value}))} rows={3} style={{width:"100%",padding:"7px 10px",border:"1px solid #DDD",borderRadius:7,fontSize:12,resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/>
                ) : (
                  <input type={type} value={editFields[key]||""} onChange={e=>setEditFields(f=>({...f,[key]:e.target.value}))} style={{width:"100%",padding:"7px 10px",border:"1px solid #DDD",borderRadius:7,fontSize:12,boxSizing:"border-box"}}/>
                )}
              </div>
            ))}
            <div style={{marginTop:16,display:"flex",gap:8}}>
              <Btn onClick={()=>setEditRec(null)} style={{flex:1}}>Cancel</Btn>
              <Btn primary disabled={saving} onClick={handleAdminSave} style={{flex:2}}>{saving?"Saving…":"Save to Airtable →"}</Btn>
            </div>
            <div style={{marginTop:12}}>
              <Btn onClick={()=>{setEditRec(null);prepEmail(editRec);}} style={{width:"100%"}}>✉ Compose email notification</Btn>
            </div>
          </div>
        </div>
      )}

      <div style={{padding:18,maxWidth:1080,margin:"0 auto",width:"100%",boxSizing:"border-box"}}>

        {/* ══ CUSTOMER DASHBOARD ══ */}
        {mode==="customer" && page==="dashboard" && (
          <div>
            {successRef && (
              <div style={{background:"#E8F5E9",border:"1px solid #A5D6A7",borderRadius:8,padding:"11px 14px",display:"flex",alignItems:"center",gap:8,marginBottom:16,fontSize:12,color:"#1B5E20"}}>
                <span>✓</span>
                <span>Request <strong>{successRef}</strong> submitted — we'll review within 2 business days.</span>
                <button onClick={()=>setSuccessRef(null)} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"#1B5E20",fontSize:16}}>×</button>
              </div>
            )}
            <MetricCards/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontSize:13,fontWeight:700}}>My quote requests</span>
              <div style={{display:"flex",gap:7}}><Filters/><Btn primary onClick={()=>setPage("submit")}>+ New quote</Btn></div>
            </div>
            {loading ? <div style={{textAlign:"center",padding:48,color:"#BBB"}}>Loading from Airtable…</div>
              : error ? <div style={{textAlign:"center",padding:48,color:"#E53935"}}>{error}</div>
              : <QuoteTable recs={filtered} onRowClick={r=>{setSelected(r);setPage("detail");}}/>}
          </div>
        )}

        {/* ══ CUSTOMER SUBMIT ══ */}
        {mode==="customer" && page==="submit" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <span style={{fontSize:14,fontWeight:700}}>New quote request</span>
              <button onClick={()=>setPage("dashboard")} style={{fontSize:12,color:"#888",background:"none",border:"none",cursor:"pointer"}}>← Back</button>
            </div>
            {[
              { title:"Project details", fields:[
                [{label:"Project name *",key:"project",type:"text",ph:"e.g. Westside Warehouse"},{label:"Submitting as",key:"type",type:"select",opts:["Direct Customer","Reseller","Architect"]}],
                [{label:"Client / end user",key:"client",type:"text",ph:"End client if reseller"},{label:"Contact name",key:"contact",type:"text",ph:"Your name"}],
                [{label:"Contact email",key:"email",type:"email",ph:"you@company.com"},{label:"Contact phone",key:"phone",type:"tel",ph:"+1 (713) 555-0100"}],
                [{label:"Project address *",key:"address",type:"text",ph:"Street address",full:true}],
                [{label:"City",key:"city",type:"text",ph:"City"},{label:"State",key:"state",type:"text",ph:"TX"},{label:"ZIP",key:"zip",type:"text",ph:"ZIP"}],
              ]},
              { title:"Building specs", fields:[
                [{label:"Building use type",key:"useType",type:"select",opts:["","Warehouse / Distribution","Cold Store / Refrigeration","Agricultural","Industrial / Manufacturing","Retail / Commercial","Vehicle Depot / Workshop","Self-Storage","Other"],full:true}],
                [{label:"Width (m)",key:"width",type:"number",ph:""},{label:"Length (m)",key:"length",type:"number",ph:""},{label:"Eave height (m)",key:"height",type:"number",ph:""}],
                [{label:"Roof pitch",key:"pitch",type:"select",opts:["1:10","1:8","1:6","1:4"]},{label:"Eng. class / wind zone",key:"engClass",type:"text",ph:"e.g. N3 / W50"}],
              ]},
            ].map(({title,fields})=>(
              <Card key={title}>
                <div style={{fontSize:12,fontWeight:700,color:"#1A1A1A",marginBottom:14}}>{title}</div>
                {fields.map((row,ri)=>(
                  <div key={ri} style={{display:"grid",gridTemplateColumns:row[0]?.full?"1fr":`repeat(${row.length},1fr)`,gap:12,marginBottom:12}}>
                    {row.map(({label,key,type,ph,opts,full})=>(
                      <div key={key} style={{display:"flex",flexDirection:"column",gap:4}}>
                        <label style={{fontSize:11,fontWeight:700,color:"#888"}}>{label}</label>
                        {type==="select"
                          ? <select value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} style={{padding:"7px 10px",border:"1px solid #DDD",borderRadius:7,fontSize:12,background:"#fff"}}>
                              {opts.map(o=><option key={o} value={o}>{o||"— Select —"}</option>)}
                            </select>
                          : <input type={type} placeholder={ph} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} style={{padding:"7px 10px",border:"1px solid #DDD",borderRadius:7,fontSize:12}}/>
                        }
                      </div>
                    ))}
                  </div>
                ))}
              </Card>
            ))}

            <Card>
              <div style={{fontSize:12,fontWeight:700,color:"#1A1A1A",marginBottom:12}}>Scope of supply</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {SCOPE_OPTIONS.map(opt=>{
                  const chk = form.scope.includes(opt);
                  return (
                    <label key={opt} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:20,border:`1px solid ${chk?"#1A3A6B":"#DDD"}`,background:chk?"#EBF3FB":"#fff",cursor:"pointer",fontSize:12,fontWeight:chk?700:400,color:chk?"#1A3A6B":"#555"}}>
                      <input type="checkbox" checked={chk} onChange={()=>setForm(f=>({...f,scope:chk?f.scope.filter(s=>s!==opt):[...f.scope,opt]}))} style={{display:"none"}}/>
                      {chk?"✓ ":""}{opt}
                    </label>
                  );
                })}
              </div>
            </Card>

            {/* File upload */}
            <Card>
              <div style={{fontSize:12,fontWeight:700,color:"#1A1A1A",marginBottom:12}}>Upload design files</div>
              <div onClick={()=>fileRef.current?.click()} style={{border:"1.5px dashed #DDD",borderRadius:10,padding:24,textAlign:"center",cursor:"pointer",background:"#FAFAFA"}}
                onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();handleFileSelect(e.dataTransfer.files);}}>
                <input ref={fileRef} type="file" multiple style={{display:"none"}} accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.rvt,.ifc" onChange={e=>handleFileSelect(e.target.files)}/>
                <div style={{fontSize:26,marginBottom:6}}>📁</div>
                <div style={{fontSize:13,color:"#888"}}>Click to upload or drag &amp; drop</div>
                <div style={{fontSize:10,color:"#BBB",marginTop:3}}>PDF, DWG, DXF, RVT, IFC, PNG, JPG — max 100 MB per file</div>
              </div>
              {uploadedFiles.length>0 && (
                <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:6}}>
                  {uploadedFiles.map((f,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:"#F5F5F5",borderRadius:8}}>
                      <span>📄</span>
                      <span style={{flex:1,fontSize:12,fontWeight:500}}>{f.name}</span>
                      <span style={{fontSize:10,color:"#AAA"}}>{(f.size/1024).toFixed(0)} KB</span>
                      <button onClick={()=>setUploadedFiles(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",cursor:"pointer",color:"#E53935",fontSize:14}}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <div style={{fontSize:12,fontWeight:700,color:"#1A1A1A",marginBottom:12}}>Notes &amp; options</div>
              <textarea placeholder="Special requirements, preferred delivery window, stamped cert needed, site constraints…" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={4} style={{width:"100%",padding:"8px 10px",border:"1px solid #DDD",borderRadius:7,fontSize:12,resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/>
              <label style={{display:"flex",alignItems:"center",gap:7,fontSize:12,cursor:"pointer",color:"#555",marginTop:10}}>
                <input type="checkbox" checked={form.urgent} onChange={e=>setForm(f=>({...f,urgent:e.target.checked}))}/>
                Mark as urgent — expedited review requested
              </label>
            </Card>
            <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
              <Btn onClick={()=>setPage("dashboard")}>Cancel</Btn>
              <Btn primary disabled={submitting} onClick={handleSubmit}>{submitting?"Submitting…":"Submit quote request →"}</Btn>
            </div>
          </div>
        )}

        {/* ══ CUSTOMER DETAIL ══ */}
        {mode==="customer" && page==="detail" && <DetailPanel rec={selected} backPage="dashboard"/>}

        {/* ══ ADMIN DASHBOARD ══ */}
        {mode==="admin" && page==="admin-dashboard" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:"#1A1A1A"}}>Admin dashboard</div>
                <div style={{fontSize:12,color:"#888",marginTop:2}}>Full quote management — click any row to view &amp; edit</div>
              </div>
              <div style={{display:"flex",gap:7}}><Filters/></div>
            </div>
            <MetricCards/>

            {/* Urgent banner */}
            {records.filter(r=>fv(r,"urgent")).length>0 && (
              <div style={{background:"#FFEBEE",border:"1px solid #FFCDD2",borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#C62828",display:"flex",alignItems:"center",gap:8}}>
                🚩 <strong>{records.filter(r=>fv(r,"urgent")).length} urgent</strong> {records.filter(r=>fv(r,"urgent")).length===1?"quote":"quotes"} require attention: {records.filter(r=>fv(r,"urgent")).map(r=>fv(r,"ref")).join(", ")}
              </div>
            )}

            {loading ? <div style={{textAlign:"center",padding:48,color:"#BBB"}}>Loading…</div>
              : error ? <div style={{textAlign:"center",padding:48,color:"#E53935"}}>{error}</div>
              : <QuoteTable recs={filtered} onRowClick={r=>{setSelected(r);setPage("admin-detail");}}/>}
          </div>
        )}

        {/* ══ ADMIN QUEUE ══ */}
        {mode==="admin" && page==="admin-queue" && (
          <div>
            <div style={{fontSize:15,fontWeight:700,marginBottom:16}}>D&amp;E queue — unaccepted &amp; in-progress</div>
            {(["Submitted","Files Checked","D&E Accepted","Pricing"]).map(grp=>{
              const grpRecs = records.filter(r=>(fv(r,"status")||"Submitted")===grp);
              return (
                <div key={grp} style={{marginBottom:22}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <Badge status={grp}/>
                    <span style={{fontSize:12,color:"#888"}}>{grpRecs.length} quote{grpRecs.length!==1?"s":""}</span>
                  </div>
                  {grpRecs.length===0 ? <div style={{fontSize:12,color:"#BBB",padding:"10px 0"}}>None</div> : (
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {grpRecs.map(rec=>(
                        <div key={rec.id} style={{background:"#fff",border:`1px solid ${fv(rec,"urgent")?"#FFCDD2":"#EBEBEB"}`,borderRadius:10,padding:"12px 16px",display:"flex",alignItems:"center",gap:14,cursor:"pointer"}}
                          onClick={()=>{setSelected(rec);setPage("admin-detail");}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:700}}>{fv(rec,"project")} <span style={{fontSize:10,color:"#AAA",fontWeight:400}}>#{fv(rec,"ref")}</span></div>
                            <div style={{fontSize:11,color:"#888",marginTop:2}}>{[fv(rec,"address"),fv(rec,"city")].filter(Boolean).join(", ")} · {fv(rec,"useType")||"—"}</div>
                          </div>
                          <div style={{fontSize:11,color:"#888"}}>{fmt(fv(rec,"submitted"))}</div>
                          <TypeBadge type={fv(rec,"type")}/>
                          {fv(rec,"urgent")&&<span style={{fontSize:10,fontWeight:700,color:"#C62828"}}>🚩</span>}
                          <Btn small onClick={e=>{e.stopPropagation();startEdit(rec);}}>Edit →</Btn>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ ADMIN DETAIL ══ */}
        {mode==="admin" && page==="admin-detail" && <DetailPanel rec={selected} backPage="admin-dashboard"/>}

      </div>
    </div>
  );
}
