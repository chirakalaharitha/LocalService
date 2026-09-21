import React from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineLightBulb,
  HiOutlineLocationMarker,
  HiOutlineUserGroup,
  HiOutlineShieldCheck,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineThumbUp,
  HiOutlinePhotograph,
  HiOutlineArrowRight
} from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
  const { user } = useAuth();

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-20 py-6">
      
      {/* HERO SECTION */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 border border-slate-800 p-8 sm:p-14 text-center overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl mx-auto space-y-6 relative z-10">
          <span className="px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-semibold text-xs tracking-wider uppercase inline-flex items-center gap-2">
            <span>⚡ Smart Civic Request & Tracking System</span>
          </span>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Report Local Problems.<br />
            <span className="bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
              Track Real Progress.
            </span> Build Better Communities.
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Report water leaks, road damage, street lights, garbage accumulation, and drainage problems with GPS location mapping. Track progress in real time with SLA deadlines and field proof verification.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {user ? (
              <Link
                to={user.role === 'ADMIN' ? '/admin/dashboard' : user.role === 'STAFF' ? '/staff/dashboard' : '/dashboard'}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white font-bold shadow-xl shadow-blue-600/30 transition text-sm flex items-center justify-center gap-2"
              >
                <span>Go to {user.role} Dashboard</span>
                <HiOutlineArrowRight />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white font-bold shadow-xl shadow-blue-600/30 transition text-sm"
                >
                  Report an Issue
                </Link>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition text-sm"
                >
                  How It Works
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* QUICK SERVICE CATEGORIES SECTION */}
      <div id="services" className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Service Issue Categories</h2>
          <p className="text-slate-400 text-xs sm:text-sm">Covering all major civic and municipal service domains</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { name: 'Water Supply & Leakage', desc: 'Report water supply disruptions, pipeline bursts, or water contamination.', icon: '💧', color: 'border-blue-500/30 bg-blue-500/10' },
            { name: 'Electricity & Outages', desc: 'Report transformer faults, dangerous sparking wires, or power cuts.', icon: '⚡', color: 'border-amber-500/30 bg-amber-500/10' },
            { name: 'Road Damage & Potholes', desc: 'Report hazardous potholes, damaged pavements, or road blockages.', icon: '🛣️', color: 'border-rose-500/30 bg-rose-500/10' },
            { name: 'Street Light Failures', desc: 'Report dark streets, broken poles, or unlit public pathways.', icon: '💡', color: 'border-purple-500/30 bg-purple-500/10' },
            { name: 'Garbage & Sanitation', desc: 'Report uncollected waste dumps, overflowing bins, or public litter.', icon: '🗑️', color: 'border-emerald-500/30 bg-emerald-500/10' },
            { name: 'Drainage & Sewage', desc: 'Report blocked drains, sewage leaks, or storm water overflow.', icon: '🌊', color: 'border-cyan-500/30 bg-cyan-500/10' },
            { name: 'Public Infrastructure', desc: 'Report damaged public parks, bus stops, or civic property.', icon: '🏞️', color: 'border-teal-500/30 bg-teal-500/10' },
            { name: 'Other Local Services', desc: 'Report general civic complaints and neighborhood maintenance.', icon: '🏢', color: 'border-slate-500/30 bg-slate-500/10' },
          ].map((item) => (
            <div key={item.name} className={`p-6 rounded-2xl border ${item.color} space-y-3 hover:scale-[1.02] transition duration-200`}>
              <div className="text-3xl">{item.icon}</div>
              <h3 className="font-bold text-white text-base">{item.name}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* HOW LOCALFIX WORKS SECTION */}
      <div id="how-it-works" className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">How LocalFix Works</h2>
          <p className="text-slate-400 text-xs sm:text-sm">End-to-end transparent civic issue resolution workflow</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-blue-500/50 transition">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center">1</div>
            <h3 className="font-bold text-white text-base">Report & Capture</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Citizens report an issue with details and optional photos. Precise location is captured via map/GPS.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-teal-500/50 transition">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center">2</div>
            <h3 className="font-bold text-white text-base">Locate & Duplicate Check</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The system checks nearby active requests and warns if a similar complaint exists nearby.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-purple-500/50 transition">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center">3</div>
            <h3 className="font-bold text-white text-base">Review & Priority Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automated smart engine suggests priority severity. Admins review and adjust SLA deadlines.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-amber-500/50 transition">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center">4</div>
            <h3 className="font-bold text-white text-base">Assign Field Staff</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Admin assigns staff member based on department expertise and current workload.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-indigo-500/50 transition">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center">5</div>
            <h3 className="font-bold text-white text-base">Resolve & Upload Proof</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Staff start work on site, upload Before-work proof, complete repairs, and upload After-work images.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-emerald-500/50 transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center">6</div>
            <h3 className="font-bold text-white text-base">Verify & Feedback</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Citizen inspects completed work proof, verifies resolution, or reopens issue with feedback.
            </p>
          </div>
        </div>
      </div>

      {/* WHY LOCALFIX / BENEFITS SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 space-y-8 shadow-xl">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Why Choose LocalFix?</h2>
          <p className="text-slate-400 text-xs sm:text-sm">Built for accountability, efficiency, and community collaboration</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2 bg-slate-950 p-5 rounded-2xl border border-slate-800">
            <HiOutlineLocationMarker className="text-blue-400 text-2xl" />
            <h3 className="font-bold text-white text-sm">GIS Location Accuracy</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Exact GPS coordinates map problem spots directly for municipal maintenance teams.
            </p>
          </div>

          <div className="space-y-2 bg-slate-950 p-5 rounded-2xl border border-slate-800">
            <HiOutlineClock className="text-amber-400 text-2xl" />
            <h3 className="font-bold text-white text-sm">SLA Deadline Tracking</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automated countdown timers ensure urgent hazards are prioritized and monitored against deadline breaches.
            </p>
          </div>

          <div className="space-y-2 bg-slate-950 p-5 rounded-2xl border border-slate-800">
            <HiOutlinePhotograph className="text-emerald-400 text-2xl" />
            <h3 className="font-bold text-white text-sm">Before & After Field Proof</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Verifiable image evidence uploaded by field staff guarantees repair authenticity.
            </p>
          </div>
        </div>
      </div>

      {/* COMMUNITY TRANSPARENCY SECTION */}
      <div className="text-center bg-gradient-to-r from-blue-950 via-slate-900 to-teal-950 border border-slate-800 p-8 sm:p-12 rounded-3xl space-y-4 shadow-xl">
        <h2 className="text-2xl font-extrabold text-white">Community Driven Civic Improvement</h2>
        <p className="text-slate-300 text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed">
          See problems in your neighborhood. Support existing reports with community upvotes. Track progress transparently until completion.
        </p>
        <div className="pt-2">
          <Link
            to={user ? '/requests/create' : '/register'}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition"
          >
            <HiOutlineUserGroup className="text-lg text-teal-400" />
            <span>{user ? 'Report a Civic Issue' : 'Join Civic Action Today'}</span>
          </Link>
        </div>
      </div>

      {/* CALL TO ACTION SECTION */}
      <div className="text-center bg-slate-900 border border-slate-800 p-8 sm:p-12 rounded-3xl space-y-6 shadow-2xl">
        <h2 className="text-2xl sm:text-3xl font-black text-white">Have a Local Civic Issue?</h2>
        <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto">
          Report it on LocalFix today and help your local municipal administration resolve it quickly.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to={user ? '/requests/create' : '/register'}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 transition"
          >
            {user ? 'Report an Issue Now' : 'Get Started & Register'}
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold transition"
          >
            Sign In to Account
          </Link>
        </div>
      </div>

    </div>
  );
};

export default LandingPage;
