"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from "recharts";

const T = {
  bg:"#06080F",bgCard:"#0C1019",bgCardHover:"#111827",bgSidebar:"#090D16",
  border:"#1A1F2E",borderLight:"#252B3B",text:"#E8ECF4",textMuted:"#7B8BA5",
  textDim:"#4A5568",accent:"#00E5BE",accentDim:"rgba(0,229,190,0.12)",
  accentGlow:"rgba(0,229,190,0.3)",warn:"#FBBF24",warnDim:"rgba(251,191,36,0.12)",
  danger:"#F87171",dangerDim:"rgba(248,113,113,0.12)",blue:"#60A5FA",
  blueDim:"rgba(96,165,250,0.12)",purple:"#A78BFA",purpleDim:"rgba(167,139,250,0.12)",
  font:"'Outfit',sans-serif",mono:"'Space Mono',monospace",
};
const COMPETITOR_COLORS = [T.accent,T.danger,T.blue,T.warn,T.purple,"#F472B6"];
const BLOG_POSTS = [
  {title:"SEO is Dead, Long Live GEO: How LLMs Choose Their Sources",desc:"The shift from keyword matching to semantic retrieval.",tag:"Foundation",read:"12 min"},
  {title:"The RAG Advantage: Structuring Content for AI Retrieval",desc:'Tactical guide on "chunking," Markdown-style HTML, and why fluff kills AI visibility.',tag:"Tactical",read:"15 min"},
  {title:"Entity Optimization vs. Keyword Stuffing: Winning AI Search Wars",desc:"How LLMs map the world using entities and Knowledge Graphs.",tag:"Advanced",read:"10 min"},
];

function extractDomain(u){try{return u.replace(/^https?:\/\//,"").replace(/^www\./,"").split("/")[0].split("?")[0]||u}catch{return u}}
function extractBrand(u){const d=extractDomain(u).split(".")[0];return d.charAt(0).toUpperCase()+d.slice(1)}

// ─── API helpers (call our server routes) ───
async function callClaude(messages, useSearch=false){
  try{
    const r=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages,useSearch})});
    const d=await r.json(); return d.text||"";
  }catch(e){console.error(e);return ""}
}

async function testEngines(query, domain, brand){
  try{
    const r=await fetch("/api/engine-test",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query,domain,brand})});
    return await r.json();
  }catch(e){console.error(e);return {}}
}

// ─── LIVE SCAN ENGINE ───
async function runLiveAudit(url, onStage, topic){
  const domain=extractDomain(url), brand=extractBrand(url);
  const topicCtx=topic?`, specifically focused on their "${topic}" section/topic`:"";
  const topicSearch=topic?` ${topic}`:"";

  onStage(`Searching the web for ${topic?`"${topic}" on ${domain}`:domain}...`);
  const discoveryText=await callClaude([{role:"user",content:`Search the web and tell me about "${domain}"${topicCtx}. Provide: 1) What they do${topic?` related to "${topic}"`:""} 2) Industry 3) Key products${topic?` for "${topic}"`:""} 4) Notable stats 5) Competitors${topic?` for "${topic}"`:""}.`}],true);

  onStage(`Testing AI awareness of ${brand}${topic?`'s ${topic}`:""}...`);
  const awarenessText=await callClaude([{role:"user",content:`Without searching, tell me about "${domain}" ("${brand}")${topicCtx}. ${topic?`What does ${brand} offer for "${topic}"? Are they known for it?`:"What do they do? What are they known for?"}`}],false);

  onStage("Detecting industry...");
  const industry=await callClaude([{role:"user",content:`Based on this description${topic?` focused on "${topic}"`:""},what is the primary industry? 2-4 words max.\n\n${discoveryText.substring(0,500)}`}],false);
  const industryClean=industry.trim().replace(/['"]/g,"")||(topic||"their industry");

  onStage("Running cross-platform citation tests on all 4 engines...");
  const citationQuery=`What are the best ${industryClean}${topic?` for ${topic}`:""} companies, tools, or resources? Top recommendations with reasons.`;
  const engineResults=await testEngines(citationQuery, domain, brand);

  onStage(`Analyzing content quality${topic?` for "${topic}"`:""}...`);
  const contentText=await callClaude([{role:"user",content:`Search for "${domain}${topicSearch}" and analyze content quality${topicCtx}. Evaluate: 1) ${topic?`Dedicated "${topic}" content?`:"Blog/resources?"} 2) Structured data/FAQs? 3) Original stats? 4) Content depth? 5) Clear descriptions? 6) Contradictions?`}],true);

  onStage("Generating GEO recommendations...");
  const recsText=await callClaude([{role:"user",content:`GEO expert. Analyze "${domain}"${topicCtx}. Generate recommendations for AI citation.
Site: ${discoveryText.substring(0,600)}
Content: ${contentText.substring(0,600)}
Awareness: ${awarenessText.substring(0,300)}
${topic?`FOCUS: "${topic}" content only.\n`:""}
Respond ONLY valid JSON array, no markdown. 4-6 objects: {"severity":"high|medium|low","title":"...","desc":"...","impact":"+N CiteScore"}`}],false);

  onStage("Computing CiteScore...");
  const scoresText=await callClaude([{role:"user",content:`Score "${domain}"${topicCtx} for AI citation (0-100).
Site: ${discoveryText.substring(0,500)}
Awareness: ${awarenessText.substring(0,300)}
Content: ${contentText.substring(0,300)}
${topic?`Scoped to "${topic}" only.\n`:""}
JSON only, no markdown:
{"semantic_density":N,"entity_resolution":N,"statistical_authority":N,"rag_readiness":N,"top_keyword":"...","top_entity":"...","hallucination_risk":"Low|Medium|High","hallucination_detail":"..."}`}],false);

  onStage("Mapping competitors...");
  const compText=await callClaude([{role:"user",content:`Competitors of "${domain}"${topicCtx}: ${discoveryText.substring(0,300)}
4-5 competitors${topic?` for "${topic}" (include specialists)`:""}.
JSON array only: [{"name":"...","x":semantic_density,"y":entity_authority}]`}],false);

  onStage("Finalizing...");

  const parseJSON=(t,fallback)=>{try{return JSON.parse(t.replace(/```json|```/g,"").trim())}catch{try{const m=t.match(Array.isArray(fallback)?/\[[\s\S]*\]/:/{[\s\S]*}/);return m?JSON.parse(m[0]):fallback}catch{return fallback}}};
  const scores=parseJSON(scoresText,{semantic_density:50,entity_resolution:30,statistical_authority:40,rag_readiness:55,top_keyword:industryClean,top_entity:"Unknown",hallucination_risk:"Medium",hallucination_detail:"Limited data"});
  let recs=parseJSON(recsText,[]);if(!Array.isArray(recs))recs=[];
  let comps=parseJSON(compText,[]);if(!Array.isArray(comps))comps=[];

  const clamp=(v,lo=0,hi=100)=>Math.min(hi,Math.max(lo,Number(v)||50));
  const sd=clamp(scores.semantic_density),er=clamp(scores.entity_resolution),sa=clamp(scores.statistical_authority),rr=clamp(scores.rag_readiness);
  const globalScore=Math.round(sd*0.3+er*0.25+sa*0.2+rr*0.25);

  const engineScores=[
    {name:"ChatGPT",score:engineResults.chatgpt?.score??50,color:T.accent,live:engineResults.chatgpt?.live??false,cited:engineResults.chatgpt?.cited??null,snippet:engineResults.chatgpt?.response||null},
    {name:"Perplexity",score:engineResults.perplexity?.score??55,color:T.blue,live:engineResults.perplexity?.live??false,cited:engineResults.perplexity?.cited??null,snippet:engineResults.perplexity?.response||null},
    {name:"Google Gemini",score:engineResults.gemini?.score??45,color:T.warn,live:engineResults.gemini?.live??false,cited:engineResults.gemini?.cited??null,snippet:engineResults.gemini?.response||null},
    {name:"Claude",score:engineResults.claude?.score??50,color:T.purple,live:engineResults.claude?.live??false,cited:engineResults.claude?.cited??null,snippet:engineResults.claude?.response||null},
  ];

  const competitorData=[{x:sd,y:er,name:"Your Site",z:200},...comps.slice(0,5).map(c=>({x:clamp(c.x,20),y:clamp(c.y,20),name:String(c.name||"Competitor").substring(0,30),z:130}))];

  return{
    scores:{global:globalScore,semantic:sd,entity:er,statistical:sa,rag:rr},engineScores,
    recommendations:recs.slice(0,6),competitorData,
    meta:{topKeyword:scores.top_keyword||industryClean,topEntity:scores.top_entity||"Unknown",hallRisk:scores.hallucination_risk||"Medium",hallDetail:scores.hallucination_detail||"Insufficient data",industry:industryClean,topic:topic||null},
  };
}

// ─── ICONS ───
const Icons={
  Logo:()=><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="2" y="2" width="24" height="24" rx="6" stroke={T.accent} strokeWidth="2"/><path d="M8 20V10l6 5 6-5v10" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Scan:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>,
  Brain:()=><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="1.5" strokeLinecap="round"><path d="M12 2a7 7 0 017 7c0 2-1 3.5-2 4.5S15 16 15 18H9c0-2-1-3-2-4.5S5 11 5 9a7 7 0 017-7z"/><path d="M9 18v1a3 3 0 006 0v-1"/></svg>,
  Vector:()=><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/></svg>,
  Check:()=><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12l2 2 4-4"/></svg>,
  Arrow:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  Export:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>,
  Menu:()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Close:()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Zap:()=><svg width="14" height="14" viewBox="0 0 24 24" fill={T.accent} stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Overview:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  Score:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/></svg>,
  Tasks:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  Chart:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>,
  Settings:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  Live:()=><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill={T.accent}/></svg>,
};

// ─── GAUGE ───
function CiteGauge({score,size=200}){
  const[a,setA]=useState(0);
  useEffect(()=>{let f,s=null;const an=(ts)=>{if(!s)s=ts;const p=Math.min((ts-s)/1200,1);setA(Math.round((1-Math.pow(1-p,3))*score));if(p<1)f=requestAnimationFrame(an)};f=requestAnimationFrame(an);return()=>cancelAnimationFrame(f)},[score]);
  const r=size*.38,cx=size/2,cy=size/2,ci=2*Math.PI*r,ar=ci*.75,fi=(a/100)*ar;
  const col=a>=80?T.accent:a>=60?T.warn:T.danger;
  return <div style={{position:"relative",width:size,height:size}}>
    <svg width={size} height={size}><circle cx={cx} cy={cy} r={r} fill="none" stroke={T.border} strokeWidth={size*.06} strokeDasharray={`${ar} ${ci}`} strokeLinecap="round" transform={`rotate(135 ${cx} ${cy})`}/><circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={size*.06} strokeDasharray={`${fi} ${ci}`} strokeLinecap="round" transform={`rotate(135 ${cx} ${cy})`} style={{filter:`drop-shadow(0 0 8px ${col}40)`}}/></svg>
    <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-45%)",textAlign:"center"}}><div style={{fontSize:size*.22,fontWeight:800,fontFamily:T.mono,color:col,lineHeight:1}}>{a}</div><div style={{fontSize:size*.07,color:T.textMuted,marginTop:4}}>out of 100</div></div>
  </div>;
}

function MiniBar({label,value,color,delay=0}){
  const[w,setW]=useState(0);
  useEffect(()=>{const t=setTimeout(()=>setW(value),100+delay);return()=>clearTimeout(t)},[value,delay]);
  return <div style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:13}}><span style={{color:T.textMuted}}>{label}</span><span style={{fontFamily:T.mono,color,fontWeight:700}}>{value}</span></div><div style={{height:6,background:T.border,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${w}%`,background:color,borderRadius:3,transition:"width 1s cubic-bezier(0.22,1,0.36,1)",boxShadow:`0 0 12px ${color}40`}}/></div></div>;
}

// ─── FIX DETAIL PANEL ───
function FixDetailPanel({action,domain,industry,topic}){
  const[fixData,setFixData]=useState(null);const[loading,setLoading]=useState(true);const[error,setError]=useState(null);const started=useRef(false);
  useEffect(()=>{if(started.current)return;started.current=true;(async()=>{try{
    const text=await callClaude([{role:"user",content:`GEO expert. Fix guide for "${domain}" (${industry})${topic?`, scoped to "${topic}"`:""}.\nIssue: ${action.title}\nDesc: ${action.desc}\nSeverity: ${action.severity}\n\nJSON only, no markdown:\n{"why_it_matters":"...","steps":["step1","step2","step3","step4"],"before_example":"...","after_example":"...","tools_needed":["tool1"],"estimated_time":"2-4 hours","ai_engines_affected":["ChatGPT","Claude"],"priority_note":"..."}`}],false);
    let p;try{p=JSON.parse(text.replace(/```json|```/g,"").trim())}catch{const m=text.match(/\{[\s\S]*\}/);p=m?JSON.parse(m[0]):null}
    if(p)setFixData(p);else setError("Parse failed");
  }catch{setError("Failed")}finally{setLoading(false)}})()},[]);
  const sev=action.severity||"medium";const sevColor=sev==="high"?T.danger:sev==="medium"?T.warn:T.blue;
  if(loading)return <div style={{padding:"20px 0",display:"flex",alignItems:"center",gap:12}}><div style={{width:18,height:18,border:`2px solid ${T.border}`,borderTopColor:T.accent,borderRadius:"50%",animation:"rotate 0.8s linear infinite"}}/><span style={{fontSize:13,color:T.accent,fontFamily:T.mono}}>Generating fix details...</span></div>;
  if(!fixData)return <div style={{padding:"12px 0",fontSize:13,color:T.danger}}>{error}</div>;
  const stl={fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:T.textMuted,marginBottom:8};
  return <div style={{marginTop:16,borderTop:`1px solid ${T.border}`,paddingTop:20,animation:"fadeIn 0.3s ease"}}>
    <div style={{marginBottom:20}}><div style={stl}>Why This Matters</div><p style={{fontSize:14,color:T.text,lineHeight:1.6}}>{fixData.why_it_matters}</p></div>
    <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
      <div style={{background:`${sevColor}10`,border:`1px solid ${sevColor}25`,borderRadius:8,padding:"10px 14px",flex:1,minWidth:180}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:T.textDim,marginBottom:4}}>Priority</div><div style={{fontSize:13,color:sevColor,fontWeight:600}}>{fixData.priority_note}</div></div>
      <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 14px",minWidth:120}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:T.textDim,marginBottom:4}}>Est. Time</div><div style={{fontSize:13,color:T.accent,fontWeight:600,fontFamily:T.mono}}>{fixData.estimated_time}</div></div>
      <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 14px",flex:1,minWidth:180}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:T.textDim,marginBottom:4}}>Engines Affected</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{(fixData.ai_engines_affected||[]).map((e,i)=><span key={i} style={{fontSize:11,background:T.accentDim,color:T.accent,padding:"2px 8px",borderRadius:4,fontWeight:600}}>{e}</span>)}</div></div>
    </div>
    <div style={{marginBottom:20}}><div style={stl}>Steps</div><div style={{display:"flex",flexDirection:"column",gap:8}}>{(fixData.steps||[]).map((s,i)=><div key={i} style={{display:"flex",gap:12,alignItems:"flex-start"}}><div style={{width:24,height:24,borderRadius:"50%",background:T.accentDim,border:`1px solid ${T.accent}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:T.accent,fontFamily:T.mono,flexShrink:0}}>{i+1}</div><p style={{fontSize:14,color:T.text,lineHeight:1.55,paddingTop:2}}>{s}</p></div>)}</div></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
      <div style={{background:`${T.danger}08`,border:`1px solid ${T.danger}20`,borderRadius:8,padding:14}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:T.danger,marginBottom:8}}>Before</div><code style={{fontSize:12,color:T.textMuted,fontFamily:T.mono,lineHeight:1.5,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{fixData.before_example}</code></div>
      <div style={{background:`${T.accent}08`,border:`1px solid ${T.accent}20`,borderRadius:8,padding:14}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:T.accent,marginBottom:8}}>After</div><code style={{fontSize:12,color:T.text,fontFamily:T.mono,lineHeight:1.5,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{fixData.after_example}</code></div>
    </div>
    {fixData.tools_needed?.length>0&&<div><div style={stl}>Tools</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{fixData.tools_needed.map((t,i)=><span key={i} style={{fontSize:12,background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:6,padding:"5px 12px",color:T.text,fontWeight:500}}>{t}</span>)}</div></div>}
  </div>;
}

// ─── PDF GENERATOR ───
function generatePDF(url,auditData){
  const{scores,engineScores,recommendations,competitorData,meta}=auditData;
  const domain=extractDomain(url),date=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
  const sl=s=>s>=90?"Excellent":s>=75?"Good":s>=60?"Fair":"Needs Improvement";
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>GenerativeRank - ${domain}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Outfit',sans-serif;color:#1a1a2e;background:#fff}.page{max-width:800px;margin:0 auto;padding:48px 40px}.mono{font-family:'Space Mono',monospace}h2{font-size:20px;font-weight:700;margin:32px 0 16px;padding-bottom:8px;border-bottom:2px solid #00E5BE}.header{display:flex;justify-content:space-between;margin-bottom:32px;border-bottom:3px solid #00E5BE;padding-bottom:24px}.brand{font-size:24px;font-weight:800}.brand span{color:#00E5BE}.score-hero{text-align:center;background:linear-gradient(135deg,#06080F,#0C1019);color:#fff;border-radius:16px;padding:40px;margin:24px 0}.big{font-size:72px;font-weight:800;font-family:'Space Mono',monospace}.big.g{color:#00E5BE}.big.y{color:#FBBF24}.big.r{color:#F87171}.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}.sc{background:#f8f9fb;border:1px solid #e5e7eb;border-radius:10px;padding:16px}.sl{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;font-weight:600;margin-bottom:6px}.sv{font-size:14px;font-weight:700;font-family:'Space Mono',monospace}.br{margin-bottom:12px}.bl{display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px}.bv{font-family:'Space Mono',monospace;font-weight:700}.bt{height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden}.bf{height:100%;border-radius:4px}.ai{border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:10px;border-left:4px solid}.ai.high{border-left-color:#F87171}.ai.medium{border-left-color:#FBBF24}.ai.low{border-left-color:#60A5FA}.sev{font-size:10px;font-weight:700;text-transform:uppercase;padding:2px 8px;border-radius:4px;display:inline-block;margin-right:8px}.sev.high{background:#FEE2E2;color:#F87171}.sev.medium{background:#FEF3C7;color:#D97706}.sev.low{background:#DBEAFE;color:#60A5FA}.imp{font-family:'Space Mono',monospace;font-size:11px;color:#00E5BE;font-weight:700}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{padding:10px 14px;text-align:left;font-size:13px;border-bottom:1px solid #e5e7eb}th{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;font-weight:600;background:#f8f9fb}.footer{margin-top:40px;padding-top:20px;border-top:2px solid #e5e7eb;text-align:center;font-size:12px;color:#999}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="page">
<div class="header"><div><div class="brand">Generative<span>Rank</span></div><p style="color:#888;font-size:13px;margin-top:4px">AI Visibility Audit</p></div><div style="text-align:right;font-size:13px;color:#666"><strong>${domain}</strong><br>${meta.topic?`<span style="color:#60A5FA;font-weight:600">Topic: ${meta.topic}</span><br>`:""}${date}<br>${meta.industry}</div></div>
<div class="score-hero"><div class="big ${scores.global>=80?"g":scores.global>=60?"y":"r"}">${scores.global}</div><div style="font-size:16px;color:#7B8BA5;margin-top:4px">CiteScore — ${sl(scores.global)}</div></div>
<div class="grid4">${[{l:"Top Keyword",v:`"${meta.topKeyword}"`,c:"#00E5BE"},{l:"Top Entity",v:meta.topEntity,c:"#60A5FA"},{l:"RAG Readiness",v:scores.rag+"%",c:"#A78BFA"},{l:"Hallucination Risk",v:meta.hallRisk,c:"#FBBF24"}].map(c=>`<div class="sc"><div class="sl">${c.l}</div><div class="sv" style="color:${c.c}">${c.v}</div></div>`).join("")}</div>
<h2>Score Pillars</h2>${[{l:"Semantic Density",v:scores.semantic,c:"#00E5BE"},{l:"Entity Resolution",v:scores.entity,c:"#60A5FA"},{l:"Statistical Authority",v:scores.statistical,c:"#FBBF24"},{l:"RAG Readiness",v:scores.rag,c:"#A78BFA"}].map(p=>`<div class="br"><div class="bl"><span>${p.l}</span><span class="bv">${p.v}/100</span></div><div class="bt"><div class="bf" style="width:${p.v}%;background:${p.c}"></div></div></div>`).join("")}
<h2>AI Engine Visibility</h2>${engineScores.map(e=>`<div class="br"><div class="bl"><span>${e.name} <span style="font-size:9px;color:${e.live?"#00E5BE":"#888"};font-weight:700">${e.live?"● LIVE":"○ EST"}</span>${e.cited!==null?` <span style="font-size:9px;color:${e.cited?"#00E5BE":"#F87171"};font-weight:700">${e.cited?"✓ CITED":"✗ NOT CITED"}</span>`:""}</span><span class="bv">${e.score}%</span></div><div class="bt"><div class="bf" style="width:${e.score}%;background:${e.color}"></div></div></div>`).join("")}
<h2>Recommendations</h2>${recommendations.map(a=>`<div class="ai ${a.severity||"medium"}"><span class="sev ${a.severity||"medium"}">${(a.severity||"medium").toUpperCase()}</span><span class="imp">${a.impact||""}</span><div style="font-size:15px;font-weight:600;margin:8px 0 4px">${a.title}</div><div style="font-size:13px;color:#666;line-height:1.55">${a.desc}</div></div>`).join("")}
<h2>Competitors</h2><table><thead><tr><th>Domain</th><th>Semantic</th><th>Entity</th></tr></thead><tbody>${competitorData.map(c=>`<tr><td><strong>${c.name}</strong></td><td class="mono">${c.x}</td><td class="mono">${c.y}</td></tr>`).join("")}</tbody></table>
<div class="footer"><strong>GenerativeRank</strong>${meta.topic?` (${meta.topic})`:""}<br>${date} • ${domain}</div></div>
<script>window.onload=()=>{window.print()}</script></body></html>`;
  const b=new Blob([html],{type:"text/html"}),u=URL.createObjectURL(b),w=window.open(u,"_blank");
  if(!w){const a=document.createElement("a");a.href=u;a.download=`GR_${domain.replace(/\./g,"_")}${meta.topic?`_${meta.topic.replace(/\s+/g,"_")}`:""}.html`;document.body.appendChild(a);a.click();document.body.removeChild(a)}
}

// ─── SCAN SCREEN ───
function LiveScanScreen({url,topic,onComplete}){
  const[stage,setStage]=useState("Initializing...");const[logs,setLogs]=useState([]);const[error,setError]=useState(null);const ref=useRef(null);const started=useRef(false);
  const addLog=useCallback(m=>setLogs(p=>[...p,{time:new Date().toLocaleTimeString(),msg:m}]),[]);
  useEffect(()=>{if(started.current)return;started.current=true;const onS=s=>{setStage(s);addLog(s)};(async()=>{try{addLog(`Audit: ${extractDomain(url)}${topic?` → "${topic}"`:""}`)
    addLog("Testing all 4 engines: ChatGPT, Perplexity, Gemini, Claude");const r=await runLiveAudit(url,onS,topic);addLog(`✓ CiteScore: ${r.scores.global}/100`);addLog(`✓ ${r.recommendations.length} recommendations`);setTimeout(()=>onComplete(r),1200)}catch(e){setError(e.message);addLog("✗ "+e.message)}})()},[url]);
  useEffect(()=>{ref.current?.scrollIntoView({behavior:"smooth"})},[logs]);
  return <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:T.bg,padding:24}}>
    {!error&&<div style={{width:80,height:80,border:`3px solid ${T.border}`,borderTopColor:T.accent,borderRadius:"50%",animation:"rotate 1s linear infinite",marginBottom:32}}/>}
    <div style={{textAlign:"center",maxWidth:600,width:"100%",marginBottom:32}}>
      <div style={{display:"inline-flex",alignItems:"center",gap:8,background:T.accentDim,border:`1px solid ${T.accent}30`,borderRadius:100,padding:"6px 16px",marginBottom:16,fontSize:12,color:T.accent,fontWeight:700}}><Icons.Live/> LIVE AUDIT — 4 AI ENGINES</div>
      <h2 style={{fontSize:22,fontWeight:700,marginBottom:8}}>Auditing <span style={{color:T.accent}}>{extractDomain(url)}</span>{topic&&<span style={{display:"block",fontSize:15,color:T.blue,marginTop:4}}>Topic: &quot;{topic}&quot;</span>}</h2>
      <div style={{fontFamily:T.mono,fontSize:13,color:error?T.danger:T.accent,animation:error?"none":"pulse 1.5s ease infinite"}}>{error||stage}</div>
    </div>
    <div style={{width:"100%",maxWidth:600,background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",borderBottom:`1px solid ${T.border}`,background:T.bgSidebar}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:T.danger}}/><div style={{width:8,height:8,borderRadius:"50%",background:T.warn}}/><div style={{width:8,height:8,borderRadius:"50%",background:T.accent}}/>
        <span style={{fontSize:11,color:T.textDim,marginLeft:8,fontFamily:T.mono}}>audit-engine</span></div>
      <div style={{padding:16,maxHeight:280,overflowY:"auto",fontFamily:T.mono,fontSize:12,lineHeight:1.8}}>
        {logs.map((l,i)=><div key={i} style={{color:l.msg.startsWith("✓")?T.accent:l.msg.startsWith("✗")?T.danger:T.textMuted}}><span style={{color:T.textDim,marginRight:8}}>[{l.time}]</span>{l.msg}</div>)}
        <div ref={ref}/></div></div>
    {error&&<button onClick={()=>location.reload()} style={{marginTop:24,background:T.accent,color:T.bg,border:"none",borderRadius:8,padding:"10px 24px",fontWeight:700,cursor:"pointer",fontFamily:T.font}}>Retry</button>}
  </div>;
}

function GridBG(){return <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:0}}><div style={{position:"absolute",inset:0,opacity:.03,backgroundImage:`linear-gradient(${T.accent} 1px,transparent 1px),linear-gradient(90deg,${T.accent} 1px,transparent 1px)`,backgroundSize:"60px 60px"}}/><div style={{position:"absolute",top:"-30%",left:"50%",transform:"translateX(-50%)",width:800,height:800,borderRadius:"50%",background:`radial-gradient(circle,${T.accent}08,transparent 70%)`}}/></div>}

// ─── NAVBAR ───
function Navbar({page,setPage}){
  const[scrolled,setScrolled]=useState(false);const[mo,setMo]=useState(false);
  useEffect(()=>{const f=()=>setScrolled(window.scrollY>20);window.addEventListener("scroll",f);return()=>window.removeEventListener("scroll",f)},[]);
  return <>
    <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:1000,padding:"0 24px",height:64,display:"flex",alignItems:"center",justifyContent:"space-between",background:scrolled?`${T.bg}EE`:"transparent",backdropFilter:scrolled?"blur(20px)":"none",borderBottom:scrolled?`1px solid ${T.border}`:"1px solid transparent",transition:"all 0.3s"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setPage("home")}><Icons.Logo/><span style={{fontWeight:800,fontSize:18}}>Generative<span style={{color:T.accent}}>Rank</span></span></div>
      <div style={{display:"flex",alignItems:"center",gap:32}} className="dn">{["Features","Pricing","GEO Guide"].map(l=><span key={l} style={{fontSize:14,color:T.textMuted,cursor:"pointer",fontWeight:500}}>{l}</span>)}
        <button onClick={()=>setPage("home")} style={{background:T.accent,color:T.bg,border:"none",borderRadius:8,padding:"8px 20px",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:T.font}}>Get Started</button></div>
      <div className="mn" style={{display:"none",cursor:"pointer",color:T.text}} onClick={()=>setMo(!mo)}>{mo?<Icons.Close/>:<Icons.Menu/>}</div>
    </nav>
    <style>{`@media(max-width:768px){.dn{display:none!important}.mn{display:flex!important}}`}</style>
  </>;
}

// ─── HOMEPAGE ───
function HomePage({setPage,setUrl,setTopic}){
  const[iv,setIv]=useState("");const[tv,setTv]=useState("");
  const go=()=>{if(iv.trim()){setUrl(iv.trim());setTopic(tv.trim());setPage("scan")}};
  return <div style={{minHeight:"100vh",position:"relative"}}><GridBG/>
    <section style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"120px 24px 80px",position:"relative",zIndex:1}}>
      <div className="anim-fade-up" style={{display:"inline-flex",alignItems:"center",gap:8,background:T.accentDim,border:`1px solid ${T.accent}30`,borderRadius:100,padding:"6px 16px",marginBottom:28,fontSize:13,color:T.accent,fontWeight:600}}><Icons.Zap/> Live AI Engine Analysis — 4 Platforms</div>
      <h1 className="anim-fade-up" style={{fontSize:"clamp(40px,7vw,80px)",fontWeight:900,lineHeight:1.05,letterSpacing:"-0.035em",maxWidth:800,animationDelay:"0.1s"}}>Be the Answer,{" "}<span style={{background:`linear-gradient(135deg,${T.accent},${T.blue})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Not Just the Link.</span></h1>
      <p className="anim-fade-up" style={{fontSize:"clamp(16px,2vw,20px)",color:T.textMuted,maxWidth:640,lineHeight:1.6,marginTop:24,animationDelay:"0.2s"}}>Traditional SEO gets you indexed. <strong style={{color:T.text}}>GEO</strong> gets you <strong style={{color:T.accent}}>cited</strong>. We test your site on ChatGPT, Perplexity, Gemini & Claude in real time.</p>
      <div className="anim-fade-up" style={{marginTop:48,maxWidth:580,width:"100%",animationDelay:"0.3s",display:"flex",flexDirection:"column",gap:8}}>
        <div style={{display:"flex",background:T.bgCard,border:`1px solid ${T.borderLight}`,borderRadius:14,padding:4,boxShadow:`0 0 60px ${T.accent}08,0 20px 60px rgba(0,0,0,0.4)`}}>
          <input value={iv} onChange={e=>setIv(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="Enter URL (e.g., canadiantire.ca)" style={{flex:1,background:"transparent",border:"none",padding:"14px 18px",color:T.text,fontSize:15,fontFamily:T.font}}/>
          <button onClick={go} style={{background:`linear-gradient(135deg,${T.accent},#00C9A7)`,color:T.bg,border:"none",borderRadius:10,padding:"14px 24px",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:T.font,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:8}}><Icons.Scan/> Scan</button>
        </div>
        <div style={{display:"flex",background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:10,padding:4}}>
          <div style={{display:"flex",alignItems:"center",padding:"0 14px",color:T.textDim,fontSize:13,fontWeight:600,whiteSpace:"nowrap",borderRight:`1px solid ${T.border}`}}>Topic</div>
          <input value={tv} onChange={e=>setTv(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder='Optional: "tires", "pricing", "B2B sales"' style={{flex:1,background:"transparent",border:"none",padding:"10px 14px",color:T.text,fontSize:14,fontFamily:T.font}}/>
          {tv&&<button onClick={()=>setTv("")} style={{background:"transparent",border:"none",color:T.textDim,cursor:"pointer",padding:"0 12px",fontSize:16}}>✕</button>}
        </div>
      </div>
      <p className="anim-fade-up" style={{fontSize:13,color:T.textDim,marginTop:14,animationDelay:"0.35s"}}>{tv?`Scoped to "${tv}" — competitors & scores for this topic only.`:"Leave topic empty for full-site audit."}</p>
      <div className="anim-fade-up" style={{marginTop:16,animationDelay:"0.4s",display:"inline-flex",alignItems:"center",gap:10,background:T.accentDim,border:`1px solid ${T.accent}30`,borderRadius:10,padding:"10px 18px",color:T.accent,fontSize:13,fontWeight:600}}>
        <span style={{display:"flex",gap:5}}><span style={{width:7,height:7,borderRadius:"50%",background:T.accent}}/><span style={{width:7,height:7,borderRadius:"50%",background:T.blue}}/><span style={{width:7,height:7,borderRadius:"50%",background:T.warn}}/><span style={{width:7,height:7,borderRadius:"50%",background:T.purple}}/></span>
        ChatGPT · Perplexity · Gemini · Claude — All Tested Live
      </div>
    </section>
    <section style={{padding:"80px 24px",maxWidth:1100,margin:"0 auto",position:"relative",zIndex:1}}>
      <div style={{textAlign:"center",marginBottom:64}}><p style={{fontSize:13,color:T.accent,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:12}}>How It Works</p><h2 style={{fontSize:"clamp(28px,4vw,44px)",fontWeight:800}}>Real API calls. Real scores.</h2></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:24}}>
        {[{icon:<Icons.Brain/>,n:"01",t:"Crawl & Discover",d:"Claude searches the web to understand your site exactly how AI retrieval systems work.",c:T.accent},{icon:<Icons.Vector/>,n:"02",t:"Test All 4 Engines",d:"We ask ChatGPT, Perplexity, Gemini & Claude the same query and check if they cite your brand.",c:T.blue},{icon:<Icons.Check/>,n:"03",t:"Score & Recommend",d:"Real citation scores per engine, with prioritized GEO fixes and before/after examples.",c:T.accent}].map((it,i)=>
          <div key={i} style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:16,padding:32,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:-20,right:-10,fontSize:100,fontWeight:900,color:`${it.c}08`,fontFamily:T.mono}}>{it.n}</div>
            <div style={{width:52,height:52,borderRadius:14,background:`${it.c}10`,border:`1px solid ${it.c}20`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20}}>{it.icon}</div>
            <h3 style={{fontSize:22,fontWeight:700,marginBottom:10}}>{it.t}</h3><p style={{fontSize:15,color:T.textMuted,lineHeight:1.65}}>{it.d}</p></div>)}
      </div>
    </section>
    <section style={{padding:"80px 24px",maxWidth:1100,margin:"0 auto",position:"relative",zIndex:1}}>
      <div style={{textAlign:"center",marginBottom:64}}><p style={{fontSize:13,color:T.accent,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:12}}>The GEO Guide</p><h2 style={{fontSize:"clamp(28px,4vw,44px)",fontWeight:800}}>Master AI search</h2></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:24}}>{BLOG_POSTS.map((p,i)=><div key={i} style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:16,padding:28,display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",gap:8,marginBottom:16}}><span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",background:T.accentDim,color:T.accent,padding:"4px 10px",borderRadius:6}}>{p.tag}</span><span style={{fontSize:11,color:T.textDim,padding:"4px 10px",background:`${T.border}80`,borderRadius:6}}>{p.read}</span></div>
        <h3 style={{fontSize:18,fontWeight:700,lineHeight:1.35,marginBottom:12}}>{p.title}</h3><p style={{fontSize:14,color:T.textMuted,lineHeight:1.6,flex:1}}>{p.desc}</p>
        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:20,color:T.accent,fontSize:14,fontWeight:600}}>Read <Icons.Arrow/></div></div>)}</div>
    </section>
    <footer style={{padding:"60px 24px",borderTop:`1px solid ${T.border}`,maxWidth:1100,margin:"0 auto",position:"relative",zIndex:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}><div style={{display:"flex",alignItems:"center",gap:8}}><Icons.Logo/><span style={{fontWeight:800}}>Generative<span style={{color:T.accent}}>Rank</span></span></div><span style={{fontSize:13,color:T.textDim}}>© 2026 GenerativeRank</span></div>
    </footer>
  </div>;
}

// ─── DASHBOARD ───
function Dashboard({url,setPage,auditData}){
  const[tab,setTab]=useState("overview");const[expanded,setExpanded]=useState(null);
  const{scores,engineScores,recommendations,competitorData,meta}=auditData;
  const pillars=[{l:"Semantic Density",v:scores.semantic,c:T.accent},{l:"Entity Resolution",v:scores.entity,c:T.blue},{l:"Statistical Authority",v:scores.statistical,c:T.warn},{l:"RAG Readiness",v:scores.rag,c:T.purple}];
  const sl=s=>s>=90?"Excellent":s>=75?"Good":s>=60?"Fair — structural work needed":"Needs improvement";
  const hc=recommendations.filter(r=>r.severity==="high").length;
  const tabs=[{id:"overview",l:"Overview",i:<Icons.Overview/>},{id:"scores",l:"Scores",i:<Icons.Score/>},{id:"actions",l:"Actions",i:<Icons.Tasks/>,badge:hc>0?String(hc):null},{id:"competitors",l:"Competitors",i:<Icons.Chart/>},{id:"settings",l:"Settings",i:<Icons.Settings/>}];

  return <div style={{display:"flex",minHeight:"100vh",background:T.bg}}>
    <aside style={{width:260,background:T.bgSidebar,borderRight:`1px solid ${T.border}`,padding:"80px 0 24px",display:"flex",flexDirection:"column",position:"fixed",top:0,left:0,bottom:0,zIndex:100}} className="sb">
      <div style={{padding:"0 20px",marginBottom:32}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><Icons.Live/><span style={{fontSize:10,color:T.accent,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em"}}>Live Results</span></div>
        <div style={{fontSize:14,fontWeight:600,color:T.text,wordBreak:"break-all"}}>{extractDomain(url)}</div>
        {meta.topic&&<div style={{display:"inline-flex",alignItems:"center",gap:5,marginTop:6,background:T.blueDim,border:`1px solid ${T.blue}30`,borderRadius:6,padding:"3px 10px"}}><span style={{fontSize:11,color:T.blue,fontWeight:600}}>{meta.topic}</span></div>}
        <div style={{fontSize:12,color:T.textDim,marginTop:4,fontFamily:T.mono}}>{meta.industry}</div></div>
      <nav style={{flex:1}}>{tabs.map(t=><div key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 20px",cursor:"pointer",background:tab===t.id?`${T.accent}10`:"transparent",borderRight:tab===t.id?`2px solid ${T.accent}`:"2px solid transparent",color:tab===t.id?T.accent:T.textMuted,fontSize:14,fontWeight:tab===t.id?600:400}}>{t.i}<span style={{flex:1}}>{t.l}</span>{t.badge&&<span style={{background:T.danger,color:"#fff",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10,fontFamily:T.mono}}>{t.badge}</span>}</div>)}</nav>
      <div style={{padding:"0 20px"}}><button onClick={()=>setPage("home")} style={{width:"100%",padding:10,background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:8,color:T.textMuted,fontSize:13,cursor:"pointer",fontFamily:T.font}}>← New Audit</button></div>
    </aside>
    <main style={{flex:1,marginLeft:260,padding:"80px 32px 48px"}} className="dm">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:32,flexWrap:"wrap",gap:12}}>
        <div><div style={{display:"inline-flex",alignItems:"center",gap:6,background:T.accentDim,border:`1px solid ${T.accent}30`,borderRadius:6,padding:"3px 10px",fontSize:11,color:T.accent,fontWeight:700,marginBottom:8}}><Icons.Live/> LIVE — 4 ENGINES</div>
          <h1 style={{fontSize:24,fontWeight:800}}>AI Visibility Audit{meta.topic?": ":""}{meta.topic&&<span style={{color:T.blue}}>{meta.topic}</span>}</h1></div>
        <button onClick={()=>generatePDF(url,auditData)} style={{display:"flex",alignItems:"center",gap:8,background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 16px",color:T.textMuted,fontSize:13,cursor:"pointer",fontFamily:T.font}}><Icons.Export/> Export PDF</button>
      </div>

      {(tab==="overview"||tab==="scores")&&<div className="anim-fade-in">
        <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:24,marginBottom:32,background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:16,padding:32}} className="sg">
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><CiteGauge score={scores.global} size={200}/><div style={{fontSize:14,color:T.textMuted,marginTop:8,textAlign:"center",fontWeight:500,maxWidth:180}}>{sl(scores.global)}</div></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:16,alignContent:"center"}}>
            {[{l:"Top Keyword",v:`"${meta.topKeyword}"`,s:"Strongest match",c:T.accent},{l:"Top Entity",v:meta.topEntity,s:"Category",c:T.blue},{l:"RAG Readiness",v:`${scores.rag}%`,s:"Parse quality",c:T.purple},{l:"Hallucination Risk",v:meta.hallRisk,s:meta.hallDetail,c:T.warn}].map((c,i)=>
              <div key={i} style={{background:`${T.bg}80`,border:`1px solid ${T.border}`,borderRadius:12,padding:18}}><div style={{fontSize:11,color:T.textDim,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600,marginBottom:8}}>{c.l}</div><div style={{fontSize:18,fontWeight:700,fontFamily:T.mono,color:c.c,marginBottom:4,wordBreak:"break-word"}}>{c.v}</div><div style={{fontSize:12,color:T.textDim}}>{c.s}</div></div>)}
          </div></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:24,marginBottom:32}}>
          <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:16,padding:28}}><h3 style={{fontSize:16,fontWeight:700,marginBottom:24}}>Score Pillars</h3>{pillars.map((p,i)=><MiniBar key={i} label={p.l} value={p.v} color={p.c} delay={i*150}/>)}</div>
          <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:16,padding:28}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:24}}><h3 style={{fontSize:16,fontWeight:700}}>Engine Visibility</h3><span style={{fontSize:10,fontWeight:700,background:T.accentDim,color:T.accent,padding:"2px 8px",borderRadius:4}}>{engineScores.filter(e=>e.live).length}/{engineScores.length} LIVE</span></div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>{engineScores.map((e,i)=><div key={i} style={{background:e.live?`${e.color}06`:"transparent",borderRadius:8,padding:e.live?"10px 12px":"4px 0"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14,fontWeight:500}}>{e.name}</span>
                  <span style={{fontSize:9,fontWeight:700,background:e.live?T.accentDim:T.border,color:e.live?T.accent:T.textDim,padding:"2px 6px",borderRadius:3,textTransform:"uppercase"}}>{e.live?"Live":"Est"}</span>
                  {e.cited!==null&&<span style={{fontSize:9,fontWeight:700,background:e.cited?T.accentDim:T.dangerDim,color:e.cited?T.accent:T.danger,padding:"2px 6px",borderRadius:3}}>{e.cited?"✓ CITED":"✗ NOT CITED"}</span>}</div>
                <span style={{fontFamily:T.mono,fontWeight:700,color:e.color}}>{e.score}%</span></div>
              <div style={{height:8,background:T.border,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${e.score}%`,borderRadius:4,background:`linear-gradient(90deg,${e.color}CC,${e.color})`,boxShadow:`0 0 12px ${e.color}30`,transition:"width 1s cubic-bezier(0.22,1,0.36,1)"}}/></div>
              {e.snippet&&<details style={{marginTop:8}}><summary style={{fontSize:11,color:T.textDim,cursor:"pointer"}}>View response</summary><div style={{marginTop:6,fontSize:12,color:T.textMuted,fontFamily:T.mono,lineHeight:1.6,background:T.bg,border:`1px solid ${T.border}`,borderRadius:6,padding:10,maxHeight:120,overflowY:"auto",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{e.snippet}</div></details>}
            </div>)}</div></div>
        </div></div>}

      {(tab==="overview"||tab==="actions")&&recommendations.length>0&&<div className="anim-fade-in" style={{marginBottom:32}}>
        <h3 style={{fontSize:18,fontWeight:700,marginBottom:20,display:"flex",alignItems:"center",gap:10}}>Recommendations{hc>0&&<span style={{fontSize:11,fontWeight:700,background:T.dangerDim,color:T.danger,padding:"3px 10px",borderRadius:6}}>{hc} Critical</span>}</h3>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>{recommendations.map((a,i)=>{const sev=a.severity||"medium";const sc=sev==="high"?T.danger:sev==="medium"?T.warn:T.blue;const sb=sev==="high"?T.dangerDim:sev==="medium"?T.warnDim:T.blueDim;const isX=expanded===i;
          return <div key={i} style={{background:T.bgCard,border:`1px solid ${isX?sc+"40":T.border}`,borderRadius:12,padding:20,borderLeft:`3px solid ${sc}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:200}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",background:sb,color:sc,padding:"3px 8px",borderRadius:4}}>{sev}</span>{a.impact&&<span style={{fontSize:11,fontFamily:T.mono,color:T.accent,fontWeight:700}}>{a.impact}</span>}</div>
                <h4 style={{fontSize:15,fontWeight:600,marginBottom:6}}>{a.title}</h4><p style={{fontSize:13,color:T.textMuted,lineHeight:1.55}}>{a.desc}</p></div>
              <button onClick={()=>setExpanded(isX?null:i)} style={{background:isX?sc:`${sc}15`,border:`1px solid ${sc}30`,borderRadius:8,padding:"8px 16px",color:isX?T.bg:sc,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:T.font,whiteSpace:"nowrap"}}>{isX?"Close ✕":"View Fix →"}</button>
            </div>{isX&&<FixDetailPanel action={a} domain={extractDomain(url)} industry={meta.industry} topic={meta.topic}/>}</div>})}</div></div>}

      {(tab==="overview"||tab==="competitors")&&competitorData.length>1&&<div className="anim-fade-in" style={{marginBottom:32}}>
        <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:16,padding:28}}>
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:8}}>Competitor Vector Map</h3><p style={{fontSize:13,color:T.textMuted,marginBottom:24}}>X: Semantic Density · Y: Entity Authority</p>
          <ResponsiveContainer width="100%" height={340}><ScatterChart margin={{top:10,right:20,bottom:20,left:10}}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis type="number" dataKey="x" domain={[0,100]} tick={{fill:T.textDim,fontSize:11}} axisLine={{stroke:T.border}}/><YAxis type="number" dataKey="y" domain={[0,100]} tick={{fill:T.textDim,fontSize:11}} axisLine={{stroke:T.border}}/>
            <Tooltip content={({payload})=>{if(!payload?.length)return null;const d=payload[0].payload;return <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 14px",fontSize:13}}><div style={{fontWeight:700,marginBottom:4}}>{d.name}</div><div style={{color:T.textMuted}}>S:{d.x} E:{d.y}</div></div>}}/>
            <Scatter data={competitorData} shape="circle">{competitorData.map((_,i)=><Cell key={i} fill={COMPETITOR_COLORS[i%COMPETITOR_COLORS.length]} fillOpacity={i===0?1:.6} r={i===0?10:7} stroke={i===0?COMPETITOR_COLORS[0]:"none"} strokeWidth={i===0?3:0}/>)}</Scatter>
          </ScatterChart></ResponsiveContainer>
          <div style={{display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center",marginTop:12}}>{competitorData.map((d,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:T.textMuted}}><div style={{width:8,height:8,borderRadius:"50%",background:COMPETITOR_COLORS[i%COMPETITOR_COLORS.length]}}/>{d.name}</div>)}</div>
        </div></div>}

      {tab==="settings"&&<div className="anim-fade-in" style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:16,padding:32}}>
        <h3 style={{fontSize:18,fontWeight:700,marginBottom:24}}>Audit Details</h3>
        {[{l:"URL",v:extractDomain(url)},{l:"Topic",v:meta.topic||"Entire site"},{l:"Industry",v:meta.industry},{l:"Entity",v:meta.topEntity},{l:"Method",v:"ChatGPT + Perplexity + Gemini + Claude (live)"},{l:"Hallucination",v:`${meta.hallRisk} — ${meta.hallDetail}`}].map((s,i)=>
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 0",borderBottom:i<5?`1px solid ${T.border}`:"none"}}><span style={{fontSize:14,color:T.textMuted}}>{s.l}</span><span style={{fontSize:14,fontWeight:600,fontFamily:T.mono,textAlign:"right",maxWidth:"60%",wordBreak:"break-word"}}>{s.v}</span></div>)}
      </div>}
    </main>
    <style>{`@media(max-width:900px){.sb{display:none!important}.dm{margin-left:0!important;padding:80px 16px 48px!important}.sg{grid-template-columns:1fr!important}}`}</style>
  </div>;
}

// ─── APP ───
export default function App(){
  const[page,setPage]=useState("home");const[url,setUrl]=useState("");const[topic,setTopic]=useState("");const[auditData,setAuditData]=useState(null);
  const done=useCallback(r=>{setAuditData(r);setPage("dashboard")},[]);
  return <div><Navbar page={page} setPage={setPage}/>
    {page==="home"&&<HomePage setPage={setPage} setUrl={setUrl} setTopic={setTopic}/>}
    {page==="scan"&&<LiveScanScreen url={url} topic={topic} onComplete={done}/>}
    {page==="dashboard"&&auditData&&<Dashboard url={url} setPage={setPage} auditData={auditData}/>}
  </div>;
}
