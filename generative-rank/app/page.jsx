"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";

const T = {
  bg:"#06080F",bgCard:"#0C1019",bgCardHover:"#111827",bgSidebar:"#090D16",
  border:"#1A1F2E",borderLight:"#252B3B",text:"#E8ECF4",textMuted:"#7B8BA5",
  textDim:"#4A5568",accent:"#00E5BE",accentDim:"rgba(0,229,190,0.12)",
  accentGlow:"rgba(0,229,190,0.3)",warn:"#FBBF24",warnDim:"rgba(251,191,36,0.12)",
  danger:"#F87171",dangerDim:"rgba(248,113,113,0.12)",blue:"#60A5FA",
  blueDim:"rgba(96,165,250,0.12)",purple:"#A78BFA",purpleDim:"rgba(167,139,250,0.12)",
  font:"'Outfit',sans-serif",mono:"'Space Mono',monospace",
};
const CC=[T.accent,T.danger,T.blue,T.warn,T.purple,"#F472B6"];
const BLOG=[
  {title:"SEO is Dead, Long Live GEO",desc:"How LLMs choose their sources — the shift from keyword matching to semantic retrieval.",tag:"Foundation",read:"12 min"},
  {title:"The RAG Advantage",desc:"Structuring content for AI retrieval, chunking, and why fluff kills visibility.",tag:"Tactical",read:"15 min"},
  {title:"Entity Optimization vs. Keyword Stuffing",desc:"How LLMs use Knowledge Graphs — attach your brand to industry concepts.",tag:"Advanced",read:"10 min"},
];

function exDomain(u){try{return u.replace(/^https?:\/\//,"").replace(/^www\./,"").split("/")[0].split("?")[0]||u}catch{return u}}
function exBrand(u){const d=exDomain(u).split(".")[0];return d.charAt(0).toUpperCase()+d.slice(1)}

async function callClaude(messages,useSearch=false){
  try{
    const r=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages,useSearch})});
    const d=await r.json();
    if(d.error)console.error("API:",d.error);
    return d.text||"";
  }catch(e){console.error(e);return ""}
}

function parseJSON(t,fb){try{return JSON.parse(t.replace(/```json|```/g,"").trim())}catch{try{const m=t.match(Array.isArray(fb)?/\[[\s\S]*\]/:/{[\s\S]*}/);return m?JSON.parse(m[0]):fb}catch{return fb}}}
const clamp=(v,lo=0,hi=100)=>Math.min(hi,Math.max(lo,Number(v)||50));

// ─── EXPANDED LIVE SCAN ENGINE ───
async function runLiveAudit(url,onStage,topic){
  const domain=exDomain(url),brand=exBrand(url);
  const topicCtx=topic?`, specifically their "${topic}" section/vertical`:"";
  const topicQ=topic?` "${topic}"`:"";
  const isCanadian=domain.endsWith(".ca")||["canadian","canada","ontario","toronto","quebec","alberta","bc","vancouver","montreal","ottawa"].some(w=>domain.toLowerCase().includes(w)||brand.toLowerCase().includes(w));
  const canadianCtx=isCanadian?"\nThis is a CANADIAN company — prioritize Canadian market context, Canadian competitors, and Canadian consumer search patterns throughout your analysis.":"";

  // ── 1. Deep Web Discovery ──
  onStage(`Deep web discovery: ${domain}${topicQ}...`);
  const discovery=await callClaude([{role:"user",content:`Search the web thoroughly for "${domain}"${topicCtx}. I need a comprehensive analysis:

1. COMPANY OVERVIEW: What does this company do? When were they founded? Are they Canadian? What's their market position?
2. ${topic?`"${topic.toUpperCase()}" SPECIFIC: What exactly do they offer for "${topic}"? Product range, pricing tiers, brands carried, unique selling points, any dedicated landing pages or categories.`:"PRODUCTS & SERVICES: Full list of major product/service categories, key brands, pricing model."}
3. ONLINE PRESENCE: Website structure, blog presence, resource center, FAQ sections, buying guides.
4. MARKET POSITION: Market share, reputation, awards, media mentions, customer reviews summary.
5. UNIQUE DATA: Any original research, statistics, tools, or calculators they publish.
6. CANADIAN CONTEXT: If Canadian, note their Canadian-specific strengths — local stores, Canadian brands, bilingual content, Canadian pricing.
${canadianCtx}
Be extremely thorough and specific. Include URLs if you find them.`}],true);

  // ── 2. Brand Awareness (no search) ──
  onStage(`Testing pure AI knowledge of ${brand}${topicQ}...`);
  const awareness=await callClaude([{role:"user",content:`WITHOUT searching the web, tell me everything you know about "${domain}" ("${brand}")${topicCtx}.

I want to understand how much an AI "knows" about this brand from training data alone:
1. Can you identify what they do?
2. ${topic?`What do you know about their "${topic}" offerings specifically? Can you name specific products, brands, or features?`:"What products/services can you name?"}
3. What industry are they in?
4. Who are their main competitors that you know of?
5. Any statistics, founding date, or facts you can recall?
6. How would you rate your confidence in this knowledge? (high/medium/low)
7. If someone asked you to recommend a company in this space, would ${brand} come to mind?

Be completely honest about gaps in your knowledge. If you're unsure, say so.`}],false);

  // ── 3. Industry Detection ──
  onStage("Identifying industry vertical...");
  const industryRaw=await callClaude([{role:"user",content:`Based on this description${topic?` focused on "${topic}"`:""},what is the specific industry category? Be precise — e.g., "automotive tire retail" not just "retail". 3-5 words max, nothing else.\n\n${discovery.substring(0,600)}`}],false);
  const industry=industryRaw.trim().replace(/['"]/g,"")||(topic||"their industry");

  // ── 4. Deep Content Analysis ──
  onStage(`Analyzing content depth${topicQ}...`);
  const content=await callClaude([{role:"user",content:`Search "${domain}${topic?" "+topic:""}" and perform a deep content quality audit${topicCtx}:

STRUCTURE & PARSEABILITY:
- Do pages use proper H1/H2/H3 hierarchy?
- Are there FAQ sections with proper Q&A formatting?
- Do they use HTML tables for comparisons/specs?
- Is there schema markup (FAQ, Product, HowTo)?
- How is their mobile experience?

CONTENT DEPTH:
- ${topic?`How detailed is their "${topic}" content? Do they have buying guides, comparison pages, how-to articles?`:"Do they have in-depth guides, comparisons, how-to articles?"}
- Do they publish original statistics, research, or survey data?
- Is there expert authorship or E-E-A-T signals?
- What's the content update frequency?

CANADIAN-SPECIFIC (if applicable):
- Is pricing in CAD?
- Do they have French-language content?
- Are there Canadian-specific landing pages?
- Do they mention Canadian shipping, stores, or availability?
${canadianCtx}
Rate each area 1-10 and explain why.`}],true);

  // ── 5. Citation Simulation ──
  onStage(`Simulating AI citation queries for ${industry}...`);
  const citationTest=await callClaude([{role:"user",content:`Imagine 5 different people asking an AI assistant these questions. For each, list who/what you would recommend and WHY. Be specific with company names:

1. "What's the best ${industry}${topic?" for "+topic:""} in Canada?"
2. "Where should I ${topic?"buy "+topic:"go for "+industry} — comparing quality and price?"
3. "${topic?`Best ${topic} brands`:`Top ${industry} companies`} for Canadian consumers?"
4. "I need expert advice on ${topic||industry} — which websites have the best guides?"
5. "${brand} vs competitors — is ${brand} worth it for ${topic||industry}?"

For each question, give your honest top 3-5 recommendations. Note whether ${brand} / ${domain} would naturally appear in your response.`}],false);

  // ── 6. Recommendations ──
  onStage("Generating detailed GEO recommendations...");
  const recs=await callClaude([{role:"user",content:`You are a Generative Engine Optimization expert auditing "${domain}"${topicCtx}.
${canadianCtx}

SITE DISCOVERY: ${discovery.substring(0,800)}
CONTENT AUDIT: ${content.substring(0,800)}
AI AWARENESS: ${awareness.substring(0,500)}
CITATION TEST: ${citationTest.substring(0,500)}

Generate 5-7 SPECIFIC, ACTIONABLE recommendations. Each must reference actual findings from the audit above — no generic advice. Think about what would make AI engines cite this site MORE.

Consider:
- Content gaps vs competitors
- Structural improvements for RAG extraction
- Missing data/statistics that LLMs crave
- Entity association weaknesses
- ${topic?`Specific "${topic}" content improvements`:"Category-specific improvements"}
- Canadian market advantages they're not leveraging

Respond ONLY with a valid JSON array. No markdown, no backticks:
[{"severity":"high|medium|low","title":"specific title max 100 chars","desc":"detailed explanation with specific page/section references, max 250 chars","impact":"+N CiteScore"}]`}],false);

  // ── 7. Comprehensive Scoring ──
  onStage("Computing CiteScore across all dimensions...");
  const scoring=await callClaude([{role:"user",content:`Score "${domain}"${topicCtx} for AI citation likelihood (0-100 each pillar).
${canadianCtx}

DATA:
Discovery: ${discovery.substring(0,500)}
Awareness test: ${awareness.substring(0,400)}
Content audit: ${content.substring(0,400)}
Citation test: ${citationTest.substring(0,400)}

SCORING RULES — be brutally honest:
- semantic_density: Topic coverage depth. Does the ${topic||"site"} content go deep enough to be a primary source? Consider: guides, specs, comparisons, FAQs, expert content.
- entity_resolution: Brand recognition in AI training data. If the awareness test showed low knowledge, score LOW (under 40). Major brands like Amazon get 90+.
- statistical_authority: Original data, stats, research, reviews, ratings. LLMs love hard numbers for citations.
- rag_readiness: Content structure for AI parsing — headings, tables, FAQ markup, clean HTML, no walls of text.
- chatgpt_visibility: Would ChatGPT cite this in responses? (no web search, pure knowledge)
- perplexity_visibility: Would Perplexity cite this? (has web search, favors authoritative sources)  
- gemini_visibility: Would Google AI cite this? (favors domain authority + structured data)
- claude_visibility: Would Claude cite this? (favors detailed, well-structured content)
- top_keyword: Strongest topic keyword (3-5 words)
- top_entity: Primary entity category (2-4 words)
- hallucination_risk: "Low"|"Medium"|"High" — risk of AI misrepresenting this brand
- hallucination_detail: Why (max 80 chars)
- canadian_advantage: "Strong"|"Moderate"|"Weak"|"N/A" — how well they leverage Canadian market positioning

JSON only, no markdown:
{"semantic_density":N,"entity_resolution":N,"statistical_authority":N,"rag_readiness":N,"chatgpt_visibility":N,"perplexity_visibility":N,"gemini_visibility":N,"claude_visibility":N,"top_keyword":"...","top_entity":"...","hallucination_risk":"...","hallucination_detail":"...","canadian_advantage":"..."}`}],false);

  // ── 8. Competitor Mapping ──
  onStage("Mapping competitor landscape...");
  const compData=await callClaude([{role:"user",content:`Top 5 competitors of "${domain}"${topicCtx}.
${canadianCtx}

Based on: ${discovery.substring(0,300)}

IMPORTANT: Include a MIX of:
- Direct Canadian competitors (same market)
- ${topic?`Specialist "${topic}" competitors (even if smaller)`:"Category specialists"}
- Major international competitors active in Canada
- Any pure-online/DTC competitors disrupting this space

For each, estimate:
- x: semantic_density (0-100) — how deep is their ${topic||"industry"} content?
- y: entity_authority (0-100) — how well-known are they to AI?

JSON array only, no markdown:
[{"name":"CompanyName","x":N,"y":N,"note":"one-line description"}]`}],false);

  // ── Parse Everything ──
  onStage("Compiling results...");
  const scores=parseJSON(scoring,{semantic_density:50,entity_resolution:30,statistical_authority:40,rag_readiness:55,chatgpt_visibility:45,perplexity_visibility:50,gemini_visibility:40,claude_visibility:50,top_keyword:industry,top_entity:"Unknown",hallucination_risk:"Medium",hallucination_detail:"Limited data",canadian_advantage:"N/A"});
  let recommendations=parseJSON(recs,[]);if(!Array.isArray(recommendations))recommendations=[];
  let competitors=parseJSON(compData,[]);if(!Array.isArray(competitors))competitors=[];

  const sd=clamp(scores.semantic_density),er=clamp(scores.entity_resolution),sa=clamp(scores.statistical_authority),rr=clamp(scores.rag_readiness);
  const globalScore=Math.round(sd*0.3+er*0.25+sa*0.2+rr*0.25);

  const engineScores=[
    {name:"ChatGPT",score:clamp(scores.chatgpt_visibility),color:T.accent,snippet:null},
    {name:"Perplexity",score:clamp(scores.perplexity_visibility),color:T.blue,snippet:null},
    {name:"Google Gemini",score:clamp(scores.gemini_visibility),color:T.warn,snippet:null},
    {name:"Claude",score:clamp(scores.claude_visibility),color:T.purple,snippet:null},
  ];

  const competitorData=[{x:sd,y:er,name:"Your Site",z:200},...competitors.slice(0,5).map(c=>({x:clamp(c.x,15),y:clamp(c.y,15),name:String(c.name||"Competitor").substring(0,30),z:130,note:c.note||""}))];

  return{
    scores:{global:globalScore,semantic:sd,entity:er,statistical:sa,rag:rr},
    engineScores,recommendations:recommendations.slice(0,7),competitorData,
    meta:{topKeyword:scores.top_keyword||industry,topEntity:scores.top_entity||"Unknown",hallRisk:scores.hallucination_risk||"Medium",hallDetail:scores.hallucination_detail||"Limited data",industry,topic:topic||null,canadianAdvantage:scores.canadian_advantage||"N/A"},
    rawInsights:{discovery:discovery.substring(0,600),awareness:awareness.substring(0,600),citationTest:citationTest.substring(0,600),contentAudit:content.substring(0,600)},
  };
}

// ─── ICONS ───
const Ic={
  Logo:()=><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="2" y="2" width="24" height="24" rx="6" stroke={T.accent} strokeWidth="2"/><path d="M8 20V10l6 5 6-5v10" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Scan:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>,
  Brain:()=><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="1.5"><path d="M12 2a7 7 0 017 7c0 2-1 3.5-2 4.5S15 16 15 18H9c0-2-1-3-2-4.5S5 11 5 9a7 7 0 017-7z"/></svg>,
  Vec:()=><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/></svg>,
  Chk:()=><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12l2 2 4-4"/></svg>,
  Arr:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  Exp:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>,
  Zap:()=><svg width="14" height="14" viewBox="0 0 24 24" fill={T.accent}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Ov:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  Sc:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/></svg>,
  Tk:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  Ch:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>,
  St:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  Ins:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Lv:()=><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill={T.accent}/></svg>,
};

// ─── GAUGE ───
function Gauge({score,size=200}){
  const[a,setA]=useState(0);
  useEffect(()=>{let f,s=null;const an=ts=>{if(!s)s=ts;const p=Math.min((ts-s)/1200,1);setA(Math.round((1-Math.pow(1-p,3))*score));if(p<1)f=requestAnimationFrame(an)};f=requestAnimationFrame(an);return()=>cancelAnimationFrame(f)},[score]);
  const r=size*.38,cx=size/2,cy=size/2,ci=2*Math.PI*r,ar=ci*.75,fi=(a/100)*ar,col=a>=80?T.accent:a>=60?T.warn:T.danger;
  return <div style={{position:"relative",width:size,height:size}}><svg width={size} height={size}><circle cx={cx} cy={cy} r={r} fill="none" stroke={T.border} strokeWidth={size*.06} strokeDasharray={`${ar} ${ci}`} strokeLinecap="round" transform={`rotate(135 ${cx} ${cy})`}/><circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={size*.06} strokeDasharray={`${fi} ${ci}`} strokeLinecap="round" transform={`rotate(135 ${cx} ${cy})`} style={{filter:`drop-shadow(0 0 8px ${col}40)`}}/></svg><div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-45%)",textAlign:"center"}}><div style={{fontSize:size*.22,fontWeight:800,fontFamily:T.mono,color:col,lineHeight:1}}>{a}</div><div style={{fontSize:size*.07,color:T.textMuted,marginTop:4}}>out of 100</div></div></div>;
}
function Bar({label,value,color,delay=0}){const[w,setW]=useState(0);useEffect(()=>{const t=setTimeout(()=>setW(value),100+delay);return()=>clearTimeout(t)},[value,delay]);return<div style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:13}}><span style={{color:T.textMuted}}>{label}</span><span style={{fontFamily:T.mono,color,fontWeight:700}}>{value}</span></div><div style={{height:6,background:T.border,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${w}%`,background:color,borderRadius:3,transition:"width 1s cubic-bezier(0.22,1,0.36,1)",boxShadow:`0 0 12px ${color}40`}}/></div></div>}

// ─── FIX DETAIL ───
function FixDetail({action,domain,industry,topic}){
  const[data,setData]=useState(null);const[loading,setLoading]=useState(true);const started=useRef(false);
  useEffect(()=>{if(started.current)return;started.current=true;(async()=>{try{
    const t=await callClaude([{role:"user",content:`GEO expert. Detailed fix for "${domain}" (${industry})${topic?`, "${topic}" section`:""}.
Issue: ${action.title}
Desc: ${action.desc}

JSON only:{"why_it_matters":"2-3 sentences","steps":["step1","step2","step3","step4","step5"],"before_example":"current bad state example","after_example":"fixed state example","tools_needed":["tool1","tool2"],"estimated_time":"X hours","ai_engines_affected":["engine1","engine2"],"priority_note":"urgency note","canadian_tip":"Canadian-specific tip if applicable or null"}`}],false);
    const p=parseJSON(t,null);if(p)setData(p);
  }catch{}finally{setLoading(false)}})()},[]);
  const sc=action.severity==="high"?T.danger:action.severity==="medium"?T.warn:T.blue;
  if(loading)return<div style={{padding:"20px 0",display:"flex",alignItems:"center",gap:12}}><div style={{width:18,height:18,border:`2px solid ${T.border}`,borderTopColor:T.accent,borderRadius:"50%",animation:"rotate .8s linear infinite"}}/><span style={{fontSize:13,color:T.accent,fontFamily:T.mono}}>Generating fix...</span></div>;
  if(!data)return<div style={{padding:12,fontSize:13,color:T.danger}}>Could not generate fix details.</div>;
  const stl={fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:T.textMuted,marginBottom:8};
  return<div style={{marginTop:16,borderTop:`1px solid ${T.border}`,paddingTop:20,animation:"fadeIn .3s ease"}}>
    <div style={{marginBottom:20}}><div style={stl}>Why This Matters</div><p style={{fontSize:14,color:T.text,lineHeight:1.6}}>{data.why_it_matters}</p></div>
    <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
      <div style={{background:`${sc}10`,border:`1px solid ${sc}25`,borderRadius:8,padding:"10px 14px",flex:1,minWidth:160}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:T.textDim,marginBottom:4}}>Priority</div><div style={{fontSize:13,color:sc,fontWeight:600}}>{data.priority_note}</div></div>
      <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 14px",minWidth:100}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:T.textDim,marginBottom:4}}>Time</div><div style={{fontSize:13,color:T.accent,fontWeight:600,fontFamily:T.mono}}>{data.estimated_time}</div></div>
      <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 14px",flex:1,minWidth:160}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:T.textDim,marginBottom:4}}>Engines</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{(data.ai_engines_affected||[]).map((e,i)=><span key={i} style={{fontSize:11,background:T.accentDim,color:T.accent,padding:"2px 8px",borderRadius:4,fontWeight:600}}>{e}</span>)}</div></div>
    </div>
    <div style={{marginBottom:20}}><div style={stl}>Implementation Steps</div><div style={{display:"flex",flexDirection:"column",gap:8}}>{(data.steps||[]).map((s,i)=><div key={i} style={{display:"flex",gap:12,alignItems:"flex-start"}}><div style={{width:24,height:24,borderRadius:"50%",background:T.accentDim,border:`1px solid ${T.accent}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:T.accent,fontFamily:T.mono,flexShrink:0}}>{i+1}</div><p style={{fontSize:14,color:T.text,lineHeight:1.55,paddingTop:2}}>{s}</p></div>)}</div></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
      <div style={{background:`${T.danger}08`,border:`1px solid ${T.danger}20`,borderRadius:8,padding:14}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:T.danger,marginBottom:8}}>Before</div><code style={{fontSize:12,color:T.textMuted,fontFamily:T.mono,lineHeight:1.5,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{data.before_example}</code></div>
      <div style={{background:`${T.accent}08`,border:`1px solid ${T.accent}20`,borderRadius:8,padding:14}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:T.accent,marginBottom:8}}>After</div><code style={{fontSize:12,color:T.text,fontFamily:T.mono,lineHeight:1.5,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{data.after_example}</code></div>
    </div>
    {data.canadian_tip&&data.canadian_tip!=="null"&&<div style={{background:`${T.blue}08`,border:`1px solid ${T.blue}20`,borderRadius:8,padding:14,marginBottom:16}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:T.blue,marginBottom:6}}>🇨🇦 Canadian Tip</div><p style={{fontSize:13,color:T.text,lineHeight:1.5}}>{data.canadian_tip}</p></div>}
    {data.tools_needed?.length>0&&<div><div style={stl}>Tools</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{data.tools_needed.map((t,i)=><span key={i} style={{fontSize:12,background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:6,padding:"5px 12px",color:T.text}}>{t}</span>)}</div></div>}
  </div>;
}

// ─── PDF ───
function genPDF(url,d){
  const{scores,engineScores,recommendations,competitorData,meta}=d;const domain=exDomain(url),dt=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
  const sl=s=>s>=90?"Excellent":s>=75?"Good":s>=60?"Fair":"Needs Work";
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>GR Audit - ${domain}</title><style>@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Outfit',sans-serif;color:#1a1a2e;background:#fff}.p{max-width:800px;margin:0 auto;padding:48px 40px}.m{font-family:'Space Mono',monospace}h2{font-size:20px;font-weight:700;margin:32px 0 16px;padding-bottom:8px;border-bottom:2px solid #00E5BE}.hd{display:flex;justify-content:space-between;margin-bottom:32px;border-bottom:3px solid #00E5BE;padding-bottom:24px}.br{font-size:24px;font-weight:800}.br span{color:#00E5BE}.sh{text-align:center;background:linear-gradient(135deg,#06080F,#0C1019);color:#fff;border-radius:16px;padding:40px;margin:24px 0}.bg{font-size:72px;font-weight:800;font-family:'Space Mono',monospace}.bg.g{color:#00E5BE}.bg.y{color:#FBBF24}.bg.r{color:#F87171}.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}.sc{background:#f8f9fb;border:1px solid #e5e7eb;border-radius:10px;padding:16px}.sl{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;font-weight:600;margin-bottom:6px}.sv{font-size:14px;font-weight:700;font-family:'Space Mono',monospace}.bw{margin-bottom:12px}.bl{display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px}.bv{font-family:'Space Mono',monospace;font-weight:700}.bt{height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden}.bf{height:100%;border-radius:4px}.ai{border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:10px;border-left:4px solid}.ai.high{border-left-color:#F87171}.ai.medium{border-left-color:#FBBF24}.ai.low{border-left-color:#60A5FA}.sv2{font-size:10px;font-weight:700;text-transform:uppercase;padding:2px 8px;border-radius:4px;display:inline-block;margin-right:8px}.sv2.high{background:#FEE2E2;color:#F87171}.sv2.medium{background:#FEF3C7;color:#D97706}.sv2.low{background:#DBEAFE;color:#60A5FA}.im{font-family:'Space Mono',monospace;font-size:11px;color:#00E5BE;font-weight:700}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{padding:10px 14px;text-align:left;font-size:13px;border-bottom:1px solid #e5e7eb}th{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;font-weight:600;background:#f8f9fb}.ft{margin-top:40px;padding-top:20px;border-top:2px solid #e5e7eb;text-align:center;font-size:12px;color:#999}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="p">
  <div class="hd"><div><div class="br">Generative<span>Rank</span></div><p style="color:#888;font-size:13px;margin-top:4px">AI Visibility Audit</p></div><div style="text-align:right;font-size:13px;color:#666"><strong>${domain}</strong><br>${meta.topic?`<span style="color:#60A5FA;font-weight:600">${meta.topic}</span><br>`:""}${dt}<br>${meta.industry}${meta.canadianAdvantage&&meta.canadianAdvantage!=="N/A"?`<br>🇨🇦 Canadian Advantage: ${meta.canadianAdvantage}`:""}</div></div>
  <div class="sh"><div class="bg ${scores.global>=80?"g":scores.global>=60?"y":"r"}">${scores.global}</div><div style="font-size:16px;color:#7B8BA5;margin-top:4px">CiteScore — ${sl(scores.global)}</div></div>
  <div class="g4">${[{l:"Top Keyword",v:`"${meta.topKeyword}"`,c:"#00E5BE"},{l:"Top Entity",v:meta.topEntity,c:"#60A5FA"},{l:"RAG Readiness",v:scores.rag+"%",c:"#A78BFA"},{l:"Hallucination Risk",v:meta.hallRisk,c:"#FBBF24"}].map(c=>`<div class="sc"><div class="sl">${c.l}</div><div class="sv" style="color:${c.c}">${c.v}</div></div>`).join("")}</div>
  <h2>Score Pillars</h2>${[{l:"Semantic Density",v:scores.semantic,c:"#00E5BE"},{l:"Entity Resolution",v:scores.entity,c:"#60A5FA"},{l:"Statistical Authority",v:scores.statistical,c:"#FBBF24"},{l:"RAG Readiness",v:scores.rag,c:"#A78BFA"}].map(p=>`<div class="bw"><div class="bl"><span>${p.l}</span><span class="bv">${p.v}/100</span></div><div class="bt"><div class="bf" style="width:${p.v}%;background:${p.c}"></div></div></div>`).join("")}
  <h2>Engine Visibility</h2>${engineScores.map(e=>`<div class="bw"><div class="bl"><span>${e.name}</span><span class="bv">${e.score}%</span></div><div class="bt"><div class="bf" style="width:${e.score}%;background:${e.color}"></div></div></div>`).join("")}
  <h2>Recommendations</h2>${recommendations.map(a=>`<div class="ai ${a.severity||"medium"}"><span class="sv2 ${a.severity||"medium"}">${(a.severity||"medium").toUpperCase()}</span><span class="im">${a.impact||""}</span><div style="font-size:15px;font-weight:600;margin:8px 0 4px">${a.title}</div><div style="font-size:13px;color:#666;line-height:1.55">${a.desc}</div></div>`).join("")}
  <h2>Competitors</h2><table><thead><tr><th>Name</th><th>Semantic</th><th>Entity</th></tr></thead><tbody>${competitorData.map(c=>`<tr><td><strong>${c.name}</strong></td><td class="m">${c.x}</td><td class="m">${c.y}</td></tr>`).join("")}</tbody></table>
  <div class="ft"><strong>GenerativeRank</strong>${meta.topic?` (${meta.topic})`:""}<br>${dt} • ${domain}</div></div><script>window.onload=()=>window.print()</script></body></html>`;
  const b=new Blob([html],{type:"text/html"}),u=URL.createObjectURL(b),w=window.open(u,"_blank");
  if(!w){const a=document.createElement("a");a.href=u;a.download=`GR_${domain.replace(/\./g,"_")}${meta.topic?`_${meta.topic.replace(/\s+/g,"_")}`:""}.html`;document.body.appendChild(a);a.click();document.body.removeChild(a)}
}

// ─── SCAN SCREEN ───
function ScanScreen({url,topic,onComplete}){
  const[stage,setStage]=useState("Initializing...");const[logs,setLogs]=useState([]);const[error,setError]=useState(null);const ref=useRef(null);const started=useRef(false);
  const addLog=useCallback(m=>setLogs(p=>[...p,{time:new Date().toLocaleTimeString(),msg:m}]),[]);
  useEffect(()=>{if(started.current)return;started.current=true;const onS=s=>{setStage(s);addLog(s)};(async()=>{try{
    addLog(`Audit: ${exDomain(url)}${topic?` → "${topic}"`:""}`)
    addLog("Powered by Claude API with web search")
    addLog("Running deep 8-step analysis...")
    const r=await runLiveAudit(url,onS,topic);
    addLog(`✓ CiteScore: ${r.scores.global}/100`);addLog(`✓ ${r.recommendations.length} recommendations`);addLog(`✓ ${r.competitorData.length-1} competitors mapped`);
    setTimeout(()=>onComplete(r),1200)
  }catch(e){setError(e.message||"Failed");addLog("✗ "+e.message)}})()},[url]);
  useEffect(()=>{ref.current?.scrollIntoView({behavior:"smooth"})},[logs]);
  return<div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:T.bg,padding:24}}>
    {!error&&<div style={{width:80,height:80,border:`3px solid ${T.border}`,borderTopColor:T.accent,borderRadius:"50%",animation:"rotate 1s linear infinite",marginBottom:32}}/>}
    <div style={{textAlign:"center",maxWidth:600,width:"100%",marginBottom:32}}>
      <div style={{display:"inline-flex",alignItems:"center",gap:8,background:T.accentDim,border:`1px solid ${T.accent}30`,borderRadius:100,padding:"6px 16px",marginBottom:16,fontSize:12,color:T.accent,fontWeight:700}}><Ic.Lv/> DEEP AUDIT</div>
      <h2 style={{fontSize:22,fontWeight:700,marginBottom:8}}>Auditing <span style={{color:T.accent}}>{exDomain(url)}</span>{topic&&<span style={{display:"block",fontSize:15,color:T.blue,marginTop:4}}>&quot;{topic}&quot;</span>}</h2>
      <div style={{fontFamily:T.mono,fontSize:13,color:error?T.danger:T.accent,animation:error?"none":"pulse 1.5s ease infinite"}}>{error||stage}</div>
    </div>
    <div style={{width:"100%",maxWidth:600,background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",borderBottom:`1px solid ${T.border}`,background:T.bgSidebar}}><div style={{width:8,height:8,borderRadius:"50%",background:T.danger}}/><div style={{width:8,height:8,borderRadius:"50%",background:T.warn}}/><div style={{width:8,height:8,borderRadius:"50%",background:T.accent}}/><span style={{fontSize:11,color:T.textDim,marginLeft:8,fontFamily:T.mono}}>geo-audit</span></div>
      <div style={{padding:16,maxHeight:300,overflowY:"auto",fontFamily:T.mono,fontSize:12,lineHeight:1.8}}>{logs.map((l,i)=><div key={i} style={{color:l.msg.startsWith("✓")?T.accent:l.msg.startsWith("✗")?T.danger:T.textMuted}}><span style={{color:T.textDim,marginRight:8}}>[{l.time}]</span>{l.msg}</div>)}<div ref={ref}/></div>
    </div>
    {error&&<button onClick={()=>location.reload()} style={{marginTop:24,background:T.accent,color:T.bg,border:"none",borderRadius:8,padding:"10px 24px",fontWeight:700,cursor:"pointer",fontFamily:T.font}}>Retry</button>}
  </div>;
}

function GridBG(){return<div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:0}}><div style={{position:"absolute",inset:0,opacity:.03,backgroundImage:`linear-gradient(${T.accent} 1px,transparent 1px),linear-gradient(90deg,${T.accent} 1px,transparent 1px)`,backgroundSize:"60px 60px"}}/></div>}

// ─── NAV ───
function Nav({setPage}){const[s,setS]=useState(false);useEffect(()=>{const f=()=>setS(window.scrollY>20);window.addEventListener("scroll",f);return()=>window.removeEventListener("scroll",f)},[]);
  return<nav style={{position:"fixed",top:0,left:0,right:0,zIndex:1000,padding:"0 24px",height:64,display:"flex",alignItems:"center",justifyContent:"space-between",background:s?`${T.bg}EE`:"transparent",backdropFilter:s?"blur(20px)":"none",borderBottom:s?`1px solid ${T.border}`:"1px solid transparent",transition:"all .3s"}}>
    <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setPage("home")}><Ic.Logo/><span style={{fontWeight:800,fontSize:18}}>Generative<span style={{color:T.accent}}>Rank</span></span></div>
    <button onClick={()=>setPage("home")} style={{background:T.accent,color:T.bg,border:"none",borderRadius:8,padding:"8px 20px",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:T.font}}>New Audit</button>
  </nav>;
}

// ─── HOME ───
function Home({setPage,setUrl,setTopic}){
  const[iv,setIv]=useState("");const[tv,setTv]=useState("");
  const go=()=>{if(iv.trim()){setUrl(iv.trim());setTopic(tv.trim());setPage("scan")}};
  return<div style={{minHeight:"100vh",position:"relative"}}><GridBG/>
    <section style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"120px 24px 80px",position:"relative",zIndex:1}}>
      <div className="anim-fade-up" style={{display:"inline-flex",alignItems:"center",gap:8,background:T.accentDim,border:`1px solid ${T.accent}30`,borderRadius:100,padding:"6px 16px",marginBottom:28,fontSize:13,color:T.accent,fontWeight:600}}><Ic.Zap/> Deep AI Audit — Powered by Claude</div>
      <h1 className="anim-fade-up" style={{fontSize:"clamp(40px,7vw,80px)",fontWeight:900,lineHeight:1.05,letterSpacing:"-0.035em",maxWidth:800,animationDelay:".1s"}}>Be the Answer,{" "}<span style={{background:`linear-gradient(135deg,${T.accent},${T.blue})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Not Just the Link.</span></h1>
      <p className="anim-fade-up" style={{fontSize:"clamp(16px,2vw,20px)",color:T.textMuted,maxWidth:640,lineHeight:1.6,marginTop:24,animationDelay:".2s"}}>Audit your website&apos;s AI citation likelihood with deep analysis. Drill into any section. <strong style={{color:T.text}}>Canadian businesses</strong> get market-specific insights automatically.</p>
      <div className="anim-fade-up" style={{marginTop:48,maxWidth:580,width:"100%",animationDelay:".3s",display:"flex",flexDirection:"column",gap:8}}>
        <div style={{display:"flex",background:T.bgCard,border:`1px solid ${T.borderLight}`,borderRadius:14,padding:4,boxShadow:`0 0 60px ${T.accent}08,0 20px 60px rgba(0,0,0,.4)`}}>
          <input value={iv} onChange={e=>setIv(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="Enter URL (e.g., canadiantire.ca)" style={{flex:1,background:"transparent",border:"none",padding:"14px 18px",color:T.text,fontSize:15,fontFamily:T.font}}/>
          <button onClick={go} style={{background:`linear-gradient(135deg,${T.accent},#00C9A7)`,color:T.bg,border:"none",borderRadius:10,padding:"14px 24px",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:T.font,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:8}}><Ic.Scan/> Scan</button>
        </div>
        <div style={{display:"flex",background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:10,padding:4}}>
          <div style={{display:"flex",alignItems:"center",padding:"0 14px",color:T.textDim,fontSize:13,fontWeight:600,whiteSpace:"nowrap",borderRight:`1px solid ${T.border}`}}>Topic</div>
          <input value={tv} onChange={e=>setTv(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder='Optional: "tires", "hockey equipment", "appliances"' style={{flex:1,background:"transparent",border:"none",padding:"10px 14px",color:T.text,fontSize:14,fontFamily:T.font}}/>
          {tv&&<button onClick={()=>setTv("")} style={{background:"transparent",border:"none",color:T.textDim,cursor:"pointer",padding:"0 12px",fontSize:16}}>✕</button>}
        </div>
      </div>
      <p className="anim-fade-up" style={{fontSize:13,color:T.textDim,marginTop:14,animationDelay:".35s"}}>{tv?`Deep audit of "${tv}" on ${iv||"your site"} — Canadian-focused competitors & analysis.`:"8-step deep analysis. Canadian .ca sites get auto-detected market insights."}</p>
    </section>
    <section style={{padding:"80px 24px",maxWidth:1100,margin:"0 auto",position:"relative",zIndex:1}}>
      <div style={{textAlign:"center",marginBottom:64}}><p style={{fontSize:13,color:T.accent,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:12}}>How It Works</p><h2 style={{fontSize:"clamp(28px,4vw,44px)",fontWeight:800}}>Deep 8-step audit</h2></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:24}}>
        {[{i:<Ic.Brain/>,n:"01",t:"Deep Discovery",d:"Web search to understand your site's full content, products, market position, and Canadian context.",c:T.accent},{i:<Ic.Vec/>,n:"02",t:"AI Knowledge Test",d:"Ask Claude about your brand with NO search — reveals exactly what AI 'knows' from training data.",c:T.blue},{i:<Ic.Chk/>,n:"03",t:"Citation Simulation",d:"5 real user queries simulated. Would AI recommend you? Scores + prioritized fixes with before/after examples.",c:T.accent}].map((it,i)=>
          <div key={i} style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:16,padding:32,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:-20,right:-10,fontSize:100,fontWeight:900,color:`${it.c}08`,fontFamily:T.mono}}>{it.n}</div>
            <div style={{width:52,height:52,borderRadius:14,background:`${it.c}10`,border:`1px solid ${it.c}20`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20}}>{it.i}</div>
            <h3 style={{fontSize:22,fontWeight:700,marginBottom:10}}>{it.t}</h3><p style={{fontSize:15,color:T.textMuted,lineHeight:1.65}}>{it.d}</p></div>)}
      </div>
    </section>
    <footer style={{padding:"60px 24px",borderTop:`1px solid ${T.border}`,maxWidth:1100,margin:"0 auto",position:"relative",zIndex:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}><div style={{display:"flex",alignItems:"center",gap:8}}><Ic.Logo/><span style={{fontWeight:800}}>Generative<span style={{color:T.accent}}>Rank</span></span></div><span style={{fontSize:13,color:T.textDim}}>© 2026</span></div>
    </footer>
  </div>;
}

// ─── DASHBOARD ───
function Dash({url,setPage,data}){
  const[tab,setTab]=useState("overview");const[exp,setExp]=useState(null);const[insightTab,setInsightTab]=useState("discovery");
  const{scores,engineScores,recommendations,competitorData,meta,rawInsights}=data;
  const pillars=[{l:"Semantic Density",v:scores.semantic,c:T.accent},{l:"Entity Resolution",v:scores.entity,c:T.blue},{l:"Statistical Authority",v:scores.statistical,c:T.warn},{l:"RAG Readiness",v:scores.rag,c:T.purple}];
  const sl=s=>s>=90?"Excellent":s>=75?"Good":s>=60?"Fair":s>=40?"Needs work":"Poor";
  const hc=recommendations.filter(r=>r.severity==="high").length;
  const tabs=[{id:"overview",l:"Overview",i:<Ic.Ov/>},{id:"scores",l:"Scores",i:<Ic.Sc/>},{id:"actions",l:"Actions",i:<Ic.Tk/>,badge:hc||null},{id:"insights",l:"Raw Insights",i:<Ic.Ins/>},{id:"competitors",l:"Competitors",i:<Ic.Ch/>},{id:"settings",l:"Settings",i:<Ic.St/>}];

  return<div style={{display:"flex",minHeight:"100vh",background:T.bg}}>
    <aside style={{width:260,background:T.bgSidebar,borderRight:`1px solid ${T.border}`,padding:"80px 0 24px",display:"flex",flexDirection:"column",position:"fixed",top:0,left:0,bottom:0,zIndex:100}} className="sb">
      <div style={{padding:"0 20px",marginBottom:32}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><Ic.Lv/><span style={{fontSize:10,color:T.accent,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em"}}>Live Results</span></div>
        <div style={{fontSize:14,fontWeight:600,color:T.text,wordBreak:"break-all"}}>{exDomain(url)}</div>
        {meta.topic&&<div style={{display:"inline-flex",alignItems:"center",gap:5,marginTop:6,background:T.blueDim,border:`1px solid ${T.blue}30`,borderRadius:6,padding:"3px 10px"}}><span style={{fontSize:11,color:T.blue,fontWeight:600}}>{meta.topic}</span></div>}
        <div style={{fontSize:12,color:T.textDim,marginTop:4,fontFamily:T.mono}}>{meta.industry}</div>
        {meta.canadianAdvantage&&meta.canadianAdvantage!=="N/A"&&<div style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:6,fontSize:11,color:T.warn,fontWeight:600}}>🇨🇦 {meta.canadianAdvantage}</div>}
      </div>
      <nav style={{flex:1}}>{tabs.map(t=><div key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 20px",cursor:"pointer",background:tab===t.id?`${T.accent}10`:"transparent",borderRight:tab===t.id?`2px solid ${T.accent}`:"2px solid transparent",color:tab===t.id?T.accent:T.textMuted,fontSize:14,fontWeight:tab===t.id?600:400}}>{t.i}<span style={{flex:1}}>{t.l}</span>{t.badge&&<span style={{background:T.danger,color:"#fff",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10,fontFamily:T.mono}}>{t.badge}</span>}</div>)}</nav>
      <div style={{padding:"0 20px"}}><button onClick={()=>setPage("home")} style={{width:"100%",padding:10,background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:8,color:T.textMuted,fontSize:13,cursor:"pointer",fontFamily:T.font}}>← New Audit</button></div>
    </aside>

    <main style={{flex:1,marginLeft:260,padding:"80px 32px 48px"}} className="dm">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:32,flexWrap:"wrap",gap:12}}>
        <div><h1 style={{fontSize:24,fontWeight:800}}>AI Visibility Audit{meta.topic?": ":""}{meta.topic&&<span style={{color:T.blue}}>{meta.topic}</span>}</h1></div>
        <button onClick={()=>genPDF(url,data)} style={{display:"flex",alignItems:"center",gap:8,background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 16px",color:T.textMuted,fontSize:13,cursor:"pointer",fontFamily:T.font}}><Ic.Exp/> Export PDF</button>
      </div>

      {(tab==="overview"||tab==="scores")&&<div className="anim-fade-in">
        <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:24,marginBottom:32,background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:16,padding:32}} className="sg">
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><Gauge score={scores.global} size={200}/><div style={{fontSize:14,color:T.textMuted,marginTop:8,textAlign:"center",maxWidth:180}}>{sl(scores.global)}</div></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:16,alignContent:"center"}}>
            {[{l:"Top Keyword",v:`"${meta.topKeyword}"`,s:"Best match",c:T.accent},{l:"Top Entity",v:meta.topEntity,s:"Category",c:T.blue},{l:"RAG Readiness",v:`${scores.rag}%`,s:"Parse quality",c:T.purple},{l:"Hallucination Risk",v:meta.hallRisk,s:meta.hallDetail,c:T.warn}].map((c,i)=><div key={i} style={{background:`${T.bg}80`,border:`1px solid ${T.border}`,borderRadius:12,padding:16}}><div style={{fontSize:11,color:T.textDim,textTransform:"uppercase",letterSpacing:".08em",fontWeight:600,marginBottom:6}}>{c.l}</div><div style={{fontSize:16,fontWeight:700,fontFamily:T.mono,color:c.c,marginBottom:4,wordBreak:"break-word"}}>{c.v}</div><div style={{fontSize:12,color:T.textDim}}>{c.s}</div></div>)}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:24,marginBottom:32}}>
          <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:16,padding:28}}><h3 style={{fontSize:16,fontWeight:700,marginBottom:24}}>Score Pillars</h3>{pillars.map((p,i)=><Bar key={i} label={p.l} value={p.v} color={p.c} delay={i*150}/>)}</div>
          <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:16,padding:28}}>
            <h3 style={{fontSize:16,fontWeight:700,marginBottom:24}}>Predicted Engine Visibility</h3>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>{engineScores.map((e,i)=><div key={i}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><span style={{fontSize:14,fontWeight:500}}>{e.name}</span><span style={{fontFamily:T.mono,fontWeight:700,color:e.color}}>{e.score}%</span></div>
              <div style={{height:8,background:T.border,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${e.score}%`,borderRadius:4,background:`linear-gradient(90deg,${e.color}CC,${e.color})`,boxShadow:`0 0 12px ${e.color}30`,transition:"width 1s cubic-bezier(0.22,1,0.36,1)"}}/></div>
            </div>)}</div></div>
        </div></div>}

      {(tab==="overview"||tab==="actions")&&recommendations.length>0&&<div className="anim-fade-in" style={{marginBottom:32}}>
        <h3 style={{fontSize:18,fontWeight:700,marginBottom:20,display:"flex",alignItems:"center",gap:10}}>Recommendations{hc>0&&<span style={{fontSize:11,fontWeight:700,background:T.dangerDim,color:T.danger,padding:"3px 10px",borderRadius:6}}>{hc} Critical</span>}</h3>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>{recommendations.map((a,i)=>{const sv=a.severity||"medium";const sc=sv==="high"?T.danger:sv==="medium"?T.warn:T.blue;const sb=sv==="high"?T.dangerDim:sv==="medium"?T.warnDim:T.blueDim;const isX=exp===i;
          return<div key={i} style={{background:T.bgCard,border:`1px solid ${isX?sc+"40":T.border}`,borderRadius:12,padding:20,borderLeft:`3px solid ${sc}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:200}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",background:sb,color:sc,padding:"3px 8px",borderRadius:4}}>{sv}</span>{a.impact&&<span style={{fontSize:11,fontFamily:T.mono,color:T.accent,fontWeight:700}}>{a.impact}</span>}</div>
                <h4 style={{fontSize:15,fontWeight:600,marginBottom:6}}>{a.title}</h4><p style={{fontSize:13,color:T.textMuted,lineHeight:1.55}}>{a.desc}</p></div>
              <button onClick={()=>setExp(isX?null:i)} style={{background:isX?sc:`${sc}15`,border:`1px solid ${sc}30`,borderRadius:8,padding:"8px 16px",color:isX?T.bg:sc,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:T.font,whiteSpace:"nowrap"}}>{isX?"Close ✕":"View Fix →"}</button>
            </div>{isX&&<FixDetail action={a} domain={exDomain(url)} industry={meta.industry} topic={meta.topic}/>}</div>})}</div></div>}

      {tab==="insights"&&rawInsights&&<div className="anim-fade-in" style={{marginBottom:32}}>
        <h3 style={{fontSize:18,fontWeight:700,marginBottom:20}}>Raw AI Insights</h3>
        <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>{[{id:"discovery",l:"Web Discovery"},{id:"awareness",l:"Brand Awareness"},{id:"citationTest",l:"Citation Test"},{id:"contentAudit",l:"Content Audit"}].map(t=><button key={t.id} onClick={()=>setInsightTab(t.id)} style={{background:insightTab===t.id?T.accentDim:T.bgCard,border:`1px solid ${insightTab===t.id?T.accent+"40":T.border}`,borderRadius:8,padding:"8px 16px",color:insightTab===t.id?T.accent:T.textMuted,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:T.font}}>{t.l}</button>)}</div>
        <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:12,padding:20}}>
          <pre style={{fontSize:13,color:T.textMuted,fontFamily:T.mono,lineHeight:1.7,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{rawInsights[insightTab]||"No data"}</pre>
        </div>
      </div>}

      {(tab==="overview"||tab==="competitors")&&competitorData.length>1&&<div className="anim-fade-in" style={{marginBottom:32}}>
        <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:16,padding:28}}>
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:8}}>Competitor Map</h3><p style={{fontSize:13,color:T.textMuted,marginBottom:24}}>X: Semantic Density · Y: Entity Authority</p>
          <ResponsiveContainer width="100%" height={340}><ScatterChart margin={{top:10,right:20,bottom:20,left:10}}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis type="number" dataKey="x" domain={[0,100]} tick={{fill:T.textDim,fontSize:11}} axisLine={{stroke:T.border}}/><YAxis type="number" dataKey="y" domain={[0,100]} tick={{fill:T.textDim,fontSize:11}} axisLine={{stroke:T.border}}/>
            <Tooltip content={({payload})=>{if(!payload?.length)return null;const d=payload[0].payload;return<div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 14px",fontSize:13}}><div style={{fontWeight:700,marginBottom:4}}>{d.name}</div>{d.note&&<div style={{color:T.textMuted,fontSize:12,marginBottom:4}}>{d.note}</div>}<div style={{color:T.textDim}}>S:{d.x} E:{d.y}</div></div>}}/>
            <Scatter data={competitorData} shape="circle">{competitorData.map((_,i)=><Cell key={i} fill={CC[i%CC.length]} fillOpacity={i===0?1:.6} r={i===0?10:7} stroke={i===0?CC[0]:"none"} strokeWidth={i===0?3:0}/>)}</Scatter>
          </ScatterChart></ResponsiveContainer>
          <div style={{display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center",marginTop:12}}>{competitorData.map((d,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:T.textMuted}}><div style={{width:8,height:8,borderRadius:"50%",background:CC[i%CC.length]}}/>{d.name}</div>)}</div>
        </div></div>}

      {tab==="settings"&&<div className="anim-fade-in" style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:16,padding:32}}>
        <h3 style={{fontSize:18,fontWeight:700,marginBottom:24}}>Audit Details</h3>
        {[{l:"URL",v:exDomain(url)},{l:"Topic",v:meta.topic||"Entire site"},{l:"Industry",v:meta.industry},{l:"Entity",v:meta.topEntity},{l:"Canadian Advantage",v:meta.canadianAdvantage||"N/A"},{l:"Hallucination Risk",v:`${meta.hallRisk} — ${meta.hallDetail}`},{l:"Engine",v:"Claude Sonnet (web search enabled)"}].map((s,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 0",borderBottom:i<6?`1px solid ${T.border}`:"none"}}><span style={{fontSize:14,color:T.textMuted}}>{s.l}</span><span style={{fontSize:14,fontWeight:600,fontFamily:T.mono,textAlign:"right",maxWidth:"60%",wordBreak:"break-word"}}>{s.v}</span></div>)}
      </div>}
    </main>
    <style>{`@media(max-width:900px){.sb{display:none!important}.dm{margin-left:0!important;padding:80px 16px 48px!important}.sg{grid-template-columns:1fr!important}}`}</style>
  </div>;
}

// ─── APP ───
export default function App(){
  const[page,setPage]=useState("home");const[url,setUrl]=useState("");const[topic,setTopic]=useState("");const[data,setData]=useState(null);
  const done=useCallback(r=>{setData(r);setPage("dash")},[]);
  return<div><Nav setPage={setPage}/>
    {page==="home"&&<Home setPage={setPage} setUrl={setUrl} setTopic={setTopic}/>}
    {page==="scan"&&<ScanScreen url={url} topic={topic} onComplete={done}/>}
    {page==="dash"&&data&&<Dash url={url} setPage={setPage} data={data}/>}
  </div>;
}
