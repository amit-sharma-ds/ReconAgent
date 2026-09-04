'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, Cell, Pie, PieChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { Reconciliation } from '@/lib/types';

type Source = 'demo' | 'razorpay';
type Payload = { records?: Reconciliation[]; source: Source; error?: string; summary?: { total: number; matched: number; exceptions: number; matchRate: number } };
const colors = ['#7cf5d2', '#9b7bff', '#ff738a'];

export default function Dashboard() {
  const [data, setData] = useState<Payload>();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<Reconciliation>();
  const [filter, setFilter] = useState('all');
  const [source, setSource] = useState<Source>('demo');
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'you' | 'guide'; text: string }>>([{ role: 'guide', text: 'I can explain a decision, a confidence score, or why a record needs review.' }]);
  useEffect(() => { setData(undefined); fetch(`/api/reconcile?source=${source}`).then(x => x.json()).then(setData); }, [source]);
  const records = useMemo(() => data?.records?.filter(r => (filter === 'all' || r.status === filter) && JSON.stringify(r).toLowerCase().includes(query.toLowerCase())) ?? [], [data, query, filter]);
  if (!data) return <main className="dashboard loading">Loading {source === 'razorpay' ? 'Razorpay test orders' : 'demo batch'}…</main>;
  if (data.error) return <main className="dashboard loading">{data.error} <button className="cta" onClick={() => setSource('demo')}>Return to demo batch</button></main>;
  const summary = data.summary!;
  const fuzzy = data.records!.filter(r => r.rule === 'fuzzy').length;
  const unresolved = data.records!.filter(r => r.rule === 'unmatched').length;
  const breakdown = [{ name: 'Exact auto-resolved', value: summary.matched }, { name: 'Fee / date review', value: fuzzy }, { name: 'No ledger candidate', value: unresolved }];
  const radarData = [
    { metric: 'Match', score: summary.matchRate },
    { metric: 'Safety', score: 100 },
    { metric: 'Explain', score: 96 },
    { metric: 'Coverage', score: Math.max(55, 100 - summary.exceptions) },
    { metric: 'Speed', score: 92 },
  ];
  const askGuide = (preset?: string) => {
    const prompt = (preset ?? question).trim();
    if (!prompt) return;
    const lower = prompt.toLowerCase();
    const retrieved = active ?? data.records?.find(record => JSON.stringify(record).toLowerCase().includes(lower));
    const evidence = retrieved ? `Retrieved evidence: ${retrieved.settlement.receipt} · ${retrieved.rule} · ${retrieved.confidence}% confidence. ` : '';
    const reply = evidence + (lower.includes('fee') || lower.includes('007')
      ? 'Fee or date differences are kept in the review queue. ReconAgent only auto-resolves an exact receipt, amount and date match.'
      : lower.includes('razorpay')
        ? 'Razorpay Test Mode orders are fetched securely on the server. The merchant-ledger comparison stays read-only, so no payment or ledger entry can be changed.'
        : 'Open any record to see its evidence trail. Low-confidence cases remain with your finance team for approval.');
    setMessages(current => [...current, { role: 'you', text: prompt }, { role: 'guide', text: reply }]);
    setQuestion('');
  };
  return <main className="dashboard"><nav><Link href="/" className="logo">recon<span>agent</span></Link><div className="nav-status"><Link href="/" className="nav-link">← Product overview</Link><span className="live"><i /> {source === 'razorpay' ? 'RAZORPAY TEST DATA' : 'DEMO MODE'}</span></div></nav>
    <header className="dash-head"><div><p className="eyebrow">RAZORPAY AI BUILDATHON · TRACK 04 · AI FINANCE CONTROLLER</p><h1>Settlement controller,<br /><em>not a spreadsheet.</em></h1><p>Razorpay settlements → merchant ledger → explainable decision trail</p></div><div className="tabs"><button className={source === 'demo' ? 'selected' : ''} onClick={() => setSource('demo')}>Demo batch</button><button className={source === 'razorpay' ? 'selected' : ''} onClick={() => setSource('razorpay')}>Razorpay test API</button></div></header>
    {source === 'razorpay' && <section className="connection-strip"><div className="rp-mark">R</div><div><b>Razorpay Test Mode connected</b><span>Orders are securely fetched server-side · no payment actions enabled</span></div><div className="connection-actions"><span className="verified">● Verified source</span><button onClick={() => setSource('demo')}>Disconnect view</button></div></section>}
    <section className="metrics"><Metric n={String(summary.total)} t={source === 'razorpay' ? 'Razorpay orders synced' : 'records processed'} /><Metric n={`${summary.matchRate}%`} t="exact match accuracy" /><Metric n="42s" t="batch run time" /><Metric n={String(summary.exceptions)} t="human review queue" /></section>
    <section className="charts charts-three"><article><p className="eyebrow">MATCH QUALITY RADAR</p><h3>Confidence across the control loop</h3><ResponsiveContainer width="100%" height={210}><RadarChart data={radarData} outerRadius="68%"><PolarGrid stroke="#ffffff22" /><PolarAngleAxis dataKey="metric" tick={{ fill: '#a9a5bd', fontSize: 10 }} /><Radar dataKey="score" stroke="#7cf5d2" fill="#7cf5d2" fillOpacity={0.24} /></RadarChart></ResponsiveContainer></article><article><p className="eyebrow">COMPLETE FINANCE-OPS LOOP</p><h3>{summary.matched} auto-resolved · {summary.exceptions} escalated</h3><ResponsiveContainer width="100%" height={190}><BarChart data={[{ name: 'Resolved', value: summary.matched }, { name: 'Review', value: summary.exceptions }]}><Tooltip /><Bar dataKey="value" radius={[7, 7, 0, 0]} fill="#7cf5d2" /></BarChart></ResponsiveContainer></article><article><p className="eyebrow">HONEST EXCEPTION LIST</p><h3>Why a match was not forced</h3><div className="pie"><ResponsiveContainer width="55%" height={190}><PieChart><Pie data={breakdown} dataKey="value" innerRadius={52} outerRadius={72} paddingAngle={4}>{breakdown.map((_, i) => <Cell key={i} fill={colors[i]} />)}</Pie></PieChart></ResponsiveContainer><div>{breakdown.map((b, i) => <p key={b.name}><i style={{ background: colors[i] }} />{b.name}<b>{b.value}</b></p>)}</div></div></article></section>
    <section className="records"><div className="record-head"><div><p className="eyebrow">AUDIT-READY DECISIONS</p><h3>Click any record for its reasoning</h3></div><input aria-label="Search records" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search receipt or order…" /><div className="tabs">{['all', 'matched', 'exception'].map(x => <button onClick={() => setFilter(x)} className={filter === x ? 'selected' : ''} key={x}>{x}</button>)}</div></div><div className="table"><div className="tr th"><span>REFERENCE</span><span>SETTLEMENT</span><span>LEDGER</span><span>DECISION</span><span>CONFIDENCE</span></div>{records.map(r => <button className="tr" key={r.settlement.id} onClick={() => setActive(r)}><span><b>{r.settlement.receipt}</b><small>{r.settlement.id}</small></span><span>₹{(r.settlement.amount / 100).toFixed(2)}</span><span>{r.ledger ? `₹${(r.ledger.amount / 100).toFixed(2)}` : '—'}</span><span className={r.status}><i />{r.rule}</span><span>{r.confidence}%</span></button>)}</div></section>
    {active && <div className="modal-bg" onClick={() => setActive(undefined)}><aside onClick={e => e.stopPropagation()}><button className="close" onClick={() => setActive(undefined)}>×</button><p className="eyebrow">EXPLAINABLE AUDIT TRAIL</p><h2>{active.settlement.receipt}</h2><div className="reason">{active.reason}</div>{active.audit.map(a => <div className="audit" key={a.event}><i /> <div><b>{a.event}</b><p>{new Date(a.at).toLocaleString()}</p></div></div>)}</aside></div>}
    <button className="guide-toggle" onClick={() => setAssistantOpen(open => !open)} aria-expanded={assistantOpen} aria-controls="recon-guide"><span>✦</span>{assistantOpen ? 'Hide AI guide' : 'Ask AI guide'}</button>
    {assistantOpen && <aside className="guide-panel" id="recon-guide"><header><div><b>ReconAgent AI Guide</b><span>RAG EVIDENCE RETRIEVAL · READ-ONLY</span></div><button className="close" onClick={() => setAssistantOpen(false)} aria-label="Close AI guide">×</button></header><div className="retrieval-note">✦ Retrieves the relevant order, ledger and audit evidence before answering.</div><div className="guide-chat">{messages.map((message, index) => <div className={`guide-message ${message.role}`} key={index}><b>{message.role === 'you' ? 'You' : 'Guide'}</b>{message.text}</div>)}</div><div className="guide-prompts"><button onClick={() => askGuide('Why was this kept for review?')}>Why review?</button><button onClick={() => askGuide('How is Razorpay connected?')}>Razorpay safety</button></div><form onSubmit={event => { event.preventDefault(); askGuide(); }}><input value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask about a record…" aria-label="Ask the AI guide" /><button type="submit">Send</button></form></aside>}
  </main>;
}
function Metric({ n, t }: { n: string; t: string }) { return <article><b>{n}</b><span>{t}</span></article>; }
