import React from 'react';
import { Link } from 'react-router-dom';
import { Mic, BarChart3, MessageSquare, ShieldCheck, ArrowRight, Zap } from 'lucide-react';

const FEATURES = [
  {
    icon: Mic,
    title: 'Voice-based practice',
    description: 'Speak your answers naturally. The AI interviewer listens, transcribes, and responds in real time.',
  },
  {
    icon: MessageSquare,
    title: 'Context-aware questions',
    description: 'Questions are generated fresh from your room template and conversation history — no repetition.',
  },
  {
    icon: BarChart3,
    title: 'Structured feedback',
    description: 'Get an overall score plus per-dimension ratings, strengths, weaknesses, and concrete recommendations.',
  },
  {
    icon: ShieldCheck,
    title: 'Low-pressure environment',
    description: 'Practise as many times as you need without the nerves of a real interview.',
  },
];

const Landing: React.FC = () => (
  <div className="min-h-screen bg-[#0a0f1e] text-slate-100 flex flex-col">
    {/* Nav */}
    <header className="border-b border-[#1e2d45] bg-[#0a0f1e]/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow shadow-indigo-600/30">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-100 tracking-tight">InterviewPrep</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-ghost text-sm h-9 px-4">
            Sign in
          </Link>
          <Link to="/register" className="btn-primary text-sm h-9 px-4">
            Get started
          </Link>
        </div>
      </div>
    </header>

    {/* Hero */}
    <section className="relative flex-1 flex items-center overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/8 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-600/10 border border-indigo-500/20 rounded-full px-4 py-1.5 text-xs text-indigo-300 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          AI-powered interview coaching
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-slate-100 leading-tight mb-5">
          Practice interviews.<br />
          <span className="text-indigo-400">Get real feedback.</span>
        </h1>

        <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
          Choose a room template, speak your answers aloud, and receive a detailed AI scorecard — all in your browser.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/register" className="btn-primary text-base px-6 py-3 gap-2">
            Start for free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/login" className="btn-ghost text-base px-6 py-3">
            Sign in
          </Link>
        </div>
      </div>
    </section>

    {/* Features */}
    <section className="border-t border-[#1e2d45] bg-[#0a0f1e]">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-slate-100 text-center mb-3">
          Everything in one flow
        </h2>
        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
          Pick a room, start a session, answer questions with your voice, read your report.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="card hover:border-indigo-500/30 transition">
              <div className="w-9 h-9 rounded-lg bg-indigo-600/15 flex items-center justify-center mb-4">
                <Icon className="w-4.5 h-4.5 w-[18px] h-[18px] text-indigo-400" />
              </div>
              <h3 className="font-semibold text-slate-100 mb-1">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* How it works */}
    <section className="border-t border-[#1e2d45]">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-slate-100 text-center mb-12">How it works</h2>
        <ol className="space-y-6">
          {[
            { step: '1', label: 'Create an account', detail: 'Register with your email. No credit card needed.' },
            { step: '2', label: 'Choose a room',     detail: 'Browse templates by company, role, and round type.' },
            { step: '3', label: 'Start the interview', detail: 'The AI interviewer asks questions. Hold the mic button to answer.' },
            { step: '4', label: 'Read your report',  detail: 'Get an overall score, dimension breakdown, and actionable recommendations.' },
          ].map(({ step, label, detail }) => (
            <li key={step} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-sm font-bold text-indigo-300 shrink-0">
                {step}
              </div>
              <div>
                <p className="font-medium text-slate-100">{label}</p>
                <p className="text-sm text-slate-400 mt-0.5">{detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>

    {/* CTA */}
    <section className="border-t border-[#1e2d45]">
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-2xl font-bold text-slate-100 mb-4">Ready to start?</h2>
        <p className="text-slate-400 mb-8">
          Create a free account and run your first interview in minutes.
        </p>
        <Link to="/register" className="btn-primary text-base px-8 py-3 inline-flex items-center gap-2">
          Get started free
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>

    {/* Footer */}
    <footer className="border-t border-[#1e2d45] bg-[#0a0f1e]">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-medium text-slate-400">InterviewPrep</span>
        </div>
        <p>© {new Date().getFullYear()} InterviewPrep. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link to="/login"    className="hover:text-slate-300 transition">Sign in</Link>
          <Link to="/register" className="hover:text-slate-300 transition">Register</Link>
        </div>
      </div>
    </footer>
  </div>
);

export default Landing;
