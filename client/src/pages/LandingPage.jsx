import React, { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlineArrowRight,
  HiOutlineLocationMarker,
  HiOutlineLightningBolt,
  HiOutlineBell,
  HiOutlineOfficeBuilding,
  HiOutlineClipboardList,
  HiOutlineSwitchHorizontal,
  HiOutlineCheckCircle,
  HiOutlineTrendingUp,
  HiOutlineShieldCheck
} from 'react-icons/hi';
import heroLandscape from '../assets/hero-landscape.jpg';
import communityCtaBanner from '../assets/community-cta-banner.jpg';

const SERVICES = [
  {
    id: 'roads',
    name: 'Roads & Potholes',
    category: 'ROAD',
    desc: 'Fix damaged roads, hazardous potholes and sidewalk issues.',
    icon: '🛣️'
  },
  {
    id: 'water',
    name: 'Water Supply',
    category: 'WATER',
    desc: 'Water leakage, low pressure, contamination and pipeline supply issues.',
    icon: '💧'
  },
  {
    id: 'streetlights',
    name: 'Streetlights',
    category: 'STREET_LIGHT',
    desc: 'Streetlight not working, damaged poles, or dark public walkways.',
    icon: '💡'
  },
  {
    id: 'drainage',
    name: 'Drainage',
    category: 'DRAINAGE',
    desc: 'Blocked drains, overflow issues, wastewater and sewage problems.',
    icon: '🌊'
  },
  {
    id: 'garbage',
    name: 'Garbage & Sanitation',
    category: 'GARBAGE',
    desc: 'Waste collection, overflowing community bins, and public cleanliness.',
    icon: '🗑️'
  },
  {
    id: 'parks',
    name: 'Parks & Greenery',
    category: 'PUBLIC_AREA',
    desc: 'Park maintenance, tree pruning, broken benches and public spaces.',
    icon: '🌳'
  },
  {
    id: 'traffic',
    name: 'Traffic & Road Signs',
    category: 'OTHER',
    desc: 'Damaged traffic signals, missing signboards, and lane markings.',
    icon: '🚦'
  },
  {
    id: 'other',
    name: 'Other Civic Issues',
    category: 'OTHER',
    desc: 'Any other civic or municipal maintenance problem in your neighborhood.',
    icon: '🏛️'
  }
];

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Disable browser automatic scroll restoration so refresh/navigation honors top position
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Handle hash scrolling on page mount or hash change
  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace('#', '');
      const el = document.getElementById(targetId);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } else {
      // If Home page without hash, always ensure starting at the top
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [location.pathname, location.hash]);

  const handleReportClick = (category = '') => {
    const targetUrl = category ? `/create-request?category=${category}` : '/create-request';
    if (user) {
      navigate(targetUrl);
    } else {
      navigate('/login', {
        state: { from: { pathname: '/create-request', search: category ? `?category=${category}` : '' } }
      });
    }
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      window.history.pushState(null, '', `#${id}`);
    }
  };

  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      
      {/* 1. HERO SECTION (Widescreen Panoramic Community Banner) */}
      <section id="home" className="relative w-full overflow-hidden bg-gradient-to-r from-[#FFF9F6] via-[#FDF3EE] to-[#FAF5F0] border-b border-[#EFE7E0]">
        {/* Scenic Background Illustration on Desktop */}
        <div
          className="absolute inset-0 z-0 hidden lg:block bg-no-repeat bg-cover"
          style={{
            backgroundImage: `url(${heroLandscape})`,
            backgroundPosition: 'right center',
          }}
        >
          {/* Subtle gradient wash over left half for 100% crystal-clear text contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#FFF9F6] via-[#FFF9F6]/85 to-transparent w-[55%]" />
        </div>

        {/* Hero Content Container */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-28">
          <div className="max-w-xl lg:max-w-2xl space-y-6">
            {/* Tagline */}
            <p className="text-[#6B4E71] text-xs sm:text-sm font-semibold tracking-wide flex items-center gap-2">
              <span>Stronger Communities</span>
              <span className="text-[#C65F63]">•</span>
              <span>Cleaner Cities</span>
              <span className="text-[#C65F63]">•</span>
              <span>A Better Tomorrow</span>
            </p>

            {/* Main Hero Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#3A223B] tracking-tight leading-[1.12]">
              Fix Your Community.<br />
              <span className="text-[#C65F63]">Track the Change.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-[#4A454E] text-sm sm:text-base lg:text-lg leading-relaxed max-w-lg">
              Report local service problems, track their progress in real time, and help build cleaner, safer and better communities.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                onClick={() => handleReportClick()}
                className="px-7 py-3.5 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white font-bold text-sm sm:text-base shadow-lg shadow-[#C65F63]/25 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                <span>Report an Issue</span>
                <span>→</span>
              </button>
              <button
                onClick={() => scrollToSection('services')}
                className="px-7 py-3.5 rounded-xl bg-white hover:bg-[#FFF9F6] text-[#3A223B] border border-[#E5B5B8] font-bold text-sm sm:text-base shadow-xs transition-all transform hover:-translate-y-0.5"
              >
                Explore Services
              </button>
            </div>
          </div>

          {/* Mobile Illustration display */}
          <div className="mt-8 lg:hidden rounded-2xl overflow-hidden shadow-md border border-[#EFE7E0]">
            <img src={heroLandscape} alt="LocalFix Community Civic Illustration" className="w-full h-auto object-cover" />
          </div>
        </div>
      </section>

      {/* 2. SERVICES SECTION */}
      <section
        id="services"
        style={{ scrollMarginTop: '90px' }}
        className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8"
      >
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-[#29252A] tracking-tight">
            Local Services, All in One Place
          </h2>
          <p className="text-xs sm:text-sm text-[#6B666E]">
            Report problems related to the services that matter most to your community.
          </p>
        </div>

        {/* 8 Service Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SERVICES.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-[#EFE7E0] p-6 shadow-xs hover:shadow-md hover:border-[#C65F63]/40 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF5F0] border border-[#EFE7E0] flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                  {s.icon}
                </div>
                <h3 className="font-extrabold text-[#29252A] text-base group-hover:text-[#C65F63] transition">
                  {s.name}
                </h3>
                <p className="text-xs text-[#6B666E] leading-relaxed line-clamp-3">
                  {s.desc}
                </p>
              </div>

              <div className="pt-5 mt-auto">
                <button
                  type="button"
                  onClick={() => handleReportClick(s.category)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white text-xs font-bold shadow-md shadow-[#C65F63]/20 transition flex items-center justify-center gap-1.5"
                >
                  <span>Report Issue</span>
                  <HiOutlineArrowRight className="text-sm" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3 & 4. HOW IT WORKS + IMPORTANT LOCATION MESSAGE */}
      <section
        id="how-it-works"
        style={{ scrollMarginTop: '90px' }}
        className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Column: How LocalFix Works (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-[#EFE7E0] p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-[#29252A] tracking-tight">
                How LocalFix Works
              </h2>
              <p className="text-xs text-[#6B666E]">
                A transparent, step-by-step civic issue resolution pipeline
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Step 01 */}
              <div className="p-4 rounded-2xl bg-[#FAF5F0] border border-[#EFE7E0] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#C65F63] tracking-wider">01</span>
                  <HiOutlineClipboardList className="text-lg text-[#C65F63]" />
                </div>
                <h3 className="font-extrabold text-[#29252A] text-sm">Report</h3>
                <p className="text-xs text-[#6B666E] leading-relaxed">
                  Tell us what went wrong and where it happened.
                </p>
              </div>

              {/* Step 02 */}
              <div className="p-4 rounded-2xl bg-[#FAF5F0] border border-[#EFE7E0] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#6B4E71] tracking-wider">02</span>
                  <HiOutlineSwitchHorizontal className="text-lg text-[#6B4E71]" />
                </div>
                <h3 className="font-extrabold text-[#29252A] text-sm">Route</h3>
                <p className="text-xs text-[#6B666E] leading-relaxed">
                  Your issue is routed to the right local authority based on location.
                </p>
              </div>

              {/* Step 03 */}
              <div className="p-4 rounded-2xl bg-[#FAF5F0] border border-[#EFE7E0] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#6B4E71] tracking-wider">03</span>
                  <HiOutlineCheckCircle className="text-lg text-[#5C9A72]" />
                </div>
                <h3 className="font-extrabold text-[#29252A] text-sm">Resolve</h3>
                <p className="text-xs text-[#6B666E] leading-relaxed">
                  Municipal staff review and work on the request.
                </p>
              </div>

              {/* Step 04 */}
              <div className="p-4 rounded-2xl bg-[#FAF5F0] border border-[#EFE7E0] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#C65F63] tracking-wider">04</span>
                  <HiOutlineTrendingUp className="text-lg text-[#C65F63]" />
                </div>
                <h3 className="font-extrabold text-[#29252A] text-sm">Track</h3>
                <p className="text-xs text-[#6B666E] leading-relaxed">
                  Track progress and receive real-time updates.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Important Location Message (5 cols) */}
          <div className="lg:col-span-5 bg-[#FDECEF] rounded-3xl border border-[#C65F63]/25 p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C65F63] text-white text-[10px] font-bold uppercase tracking-wider">
                <HiOutlineLocationMarker className="text-xs" />
                <span>Crucial Feature</span>
              </div>
              <h2 className="text-2xl font-black text-[#29252A] tracking-tight">
                Your issue location matters.
              </h2>
              <p className="text-xs sm:text-sm text-[#29252A]/85 leading-relaxed">
                Your LocalFix account address does not determine where your complaint is routed. Each request is routed according to the <strong>actual location of the reported issue</strong>.
              </p>
            </div>

            {/* Visual Location Routing Workflow */}
            <div className="p-4 rounded-2xl bg-white border border-[#C65F63]/20 shadow-xs space-y-3">
              <span className="text-[11px] font-bold text-[#6B4E71] uppercase tracking-wider block">
                Routing Example
              </span>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-bold text-[#29252A]">
                <div className="p-2.5 bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl text-center flex-1 w-full">
                  <span className="text-[10px] text-[#6B666E] block font-normal">Registered in</span>
                  <span className="text-xs font-bold text-[#6B4E71]">Guntur</span>
                </div>
                <span className="text-[#C65F63] font-bold">→</span>
                <div className="p-2.5 bg-[#FDECEF] border border-[#C65F63]/20 rounded-xl text-center flex-1 w-full">
                  <span className="text-[10px] text-[#C65F63] block font-normal">Issue reported in</span>
                  <span className="text-xs font-bold text-[#C65F63]">Tenali</span>
                </div>
                <span className="text-[#C65F63] font-bold">→</span>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center flex-1 w-full text-emerald-800">
                  <span className="text-[10px] text-emerald-600 block font-normal">Routed to</span>
                  <span className="text-xs font-bold">Tenali Municipality</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 5. ABOUT LOCALFIX SECTION */}
      <section
        id="about"
        style={{ scrollMarginTop: '90px' }}
        className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8D7E6] text-[#6B4E71] text-[10px] font-bold uppercase tracking-wider">
            <span>Our Mission & Transparency</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#29252A] tracking-tight">
            About LocalFix
          </h2>
          <p className="text-xs sm:text-sm text-[#6B666E] max-w-2xl mx-auto">
            A modern civic infrastructure platform connecting citizens with local government for transparent, accountable, and timely municipal resolution.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Feature 1 */}
          <div className="bg-white rounded-2xl border border-[#EFE7E0] p-6 shadow-xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FDECEF] text-[#C65F63] flex items-center justify-center text-lg">
              <HiOutlineLocationMarker />
            </div>
            <h3 className="font-extrabold text-[#29252A] text-sm">Location-Based Routing</h3>
            <p className="text-xs text-[#6B666E] leading-relaxed">
              Every complaint is geocoded and dispatched directly to the responsible municipal jurisdiction regardless of where the citizen’s account was created.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-2xl border border-[#EFE7E0] p-6 shadow-xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#E8D7E6] text-[#6B4E71] flex items-center justify-center text-lg">
              <HiOutlineLightningBolt />
            </div>
            <h3 className="font-extrabold text-[#29252A] text-sm">Citizen & Staff Synergy</h3>
            <p className="text-xs text-[#6B666E] leading-relaxed">
              Citizens provide photos, location pins, and urgency details. Field workers upload before-work inspections and proof of resolution before completing tasks.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-2xl border border-[#EFE7E0] p-6 shadow-xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FDECEF] text-[#C65F63] flex items-center justify-center text-lg">
              <HiOutlineBell />
            </div>
            <h3 className="font-extrabold text-[#29252A] text-sm">Full Transparency</h3>
            <p className="text-xs text-[#6B666E] leading-relaxed">
              Live status history, clear service-level timelines, and instant notifications keep citizens informed at every step without repetitive follow-ups.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white rounded-2xl border border-[#EFE7E0] p-6 shadow-xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#5C9A72] border border-emerald-100 flex items-center justify-center text-lg">
              <HiOutlineShieldCheck />
            </div>
            <h3 className="font-extrabold text-[#29252A] text-sm">Verified Resolutions</h3>
            <p className="text-xs text-[#6B666E] leading-relaxed">
              Resolutions remain in pending verification until citizens review the completed repair and rate service quality, guaranteeing civic satisfaction.
            </p>
          </div>
        </div>
      </section>

      {/* 6. COMMUNITY CTA (Scenic Community Banner) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden border border-[#F2CBD3] shadow-lg shadow-[#C65F63]/10 bg-[#FFF5F7] min-h-[250px] sm:min-h-[280px] lg:min-h-[310px] flex items-center">
          
          {/* Panoramic Illustration Background */}
          <div
            className="absolute inset-0 z-0 bg-no-repeat bg-cover"
            style={{
              backgroundImage: `url(${communityCtaBanner})`,
              backgroundPosition: 'left center',
            }}
          />

          {/* Soft Gradient Overlay for Optimal Readability across Viewports */}
          <div className="absolute inset-0 z-1 bg-gradient-to-r from-[#FFF5F7]/30 via-[#FFF5F7]/80 to-[#FFF5F7]/40 sm:via-[#FFF5F7]/75 lg:via-[#FFF5F7]/65 pointer-events-none" />

          {/* Content Box Positioned to the right of the Lamppost and River Walkway */}
          <div className="relative z-10 w-full px-6 py-8 sm:px-10 sm:py-10 md:py-12 md:pl-[28%] lg:pl-[32%] lg:pr-10">
            <div className="max-w-xl space-y-3.5 bg-white/70 sm:bg-transparent backdrop-blur-xs sm:backdrop-blur-none p-5 sm:p-0 rounded-2xl sm:rounded-none border border-[#F2CBD3]/60 sm:border-none shadow-xs sm:shadow-none">
              
              {/* Heading */}
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-black tracking-tight leading-[1.12]">
                <span className="text-[#361E38] block">See a problem?</span>
                <span className="text-[#C84E6E] block">Report it.</span>
              </h2>

              {/* Subtitle */}
              <p className="text-[#6D5D70] font-medium text-xs sm:text-sm lg:text-[15px] leading-relaxed max-w-md">
                Your report can help your local community become cleaner, safer and better maintained.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <button
                  onClick={() => handleReportClick()}
                  className="px-6 sm:px-7 py-3 rounded-xl bg-[#C84E6E] hover:bg-[#B33E5C] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#C84E6E]/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 group"
                >
                  <span>Report an issue</span>
                  <span className="text-sm font-semibold transition-transform group-hover:translate-x-0.5">→</span>
                </button>

                {!user ? (
                  <Link
                    to="/register"
                    className="px-6 sm:px-7 py-3 rounded-xl bg-white/95 hover:bg-white text-[#C84E6E] border border-[#EAAAB9] hover:border-[#C84E6E] font-bold text-xs sm:text-sm shadow-xs transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-center"
                  >
                    Create Account
                  </Link>
                ) : (
                  <Link
                    to={user.role === 'admin' ? '/admin/dashboard' : user.role === 'staff' ? '/staff/dashboard' : '/citizen/my-reports'}
                    className="px-6 sm:px-7 py-3 rounded-xl bg-white/95 hover:bg-white text-[#C84E6E] border border-[#EAAAB9] hover:border-[#C84E6E] font-bold text-xs sm:text-sm shadow-xs transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-center"
                  >
                    {user.role === 'citizen' ? 'My Reports' : 'Dashboard'}
                  </Link>
                )}
              </div>

            </div>
          </div>

        </div>
      </section>

    </div>
  );
};

export default LandingPage;
