import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineSearch,
  HiOutlineOfficeBuilding,
  HiOutlineSparkles,
  HiOutlineCheckCircle
} from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';

const SERVICES = [
  {
    id: 'road',
    category: 'ROAD',
    title: 'Road & Pothole',
    icon: '🛣️',
    description: 'Fix potholes, damaged roads and road issues.',
    color: 'bg-orange-50 text-orange-600 border-orange-100'
  },
  {
    id: 'water',
    category: 'WATER',
    title: 'Water Supply',
    icon: '💧',
    description: 'Water leakage, low pressure and supply issues.',
    color: 'bg-blue-50 text-blue-600 border-blue-100'
  },
  {
    id: 'streetlight',
    category: 'STREET_LIGHT',
    title: 'Streetlight',
    icon: '💡',
    description: 'Streetlight not working or damaged.',
    color: 'bg-amber-50 text-amber-600 border-amber-100'
  },
  {
    id: 'drainage',
    category: 'DRAINAGE',
    title: 'Drainage',
    icon: '🌊',
    description: 'Blocked drains and sewerage issues.',
    color: 'bg-cyan-50 text-cyan-600 border-cyan-100'
  },
  {
    id: 'garbage',
    category: 'GARBAGE',
    title: 'Garbage & Sanitation',
    icon: '🗑️',
    description: 'Garbage collection and waste management.',
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100'
  },
  {
    id: 'parks',
    category: 'PUBLIC_AREA',
    title: 'Parks & Greenery',
    icon: '🌳',
    description: 'Park maintenance and tree related issues.',
    color: 'bg-green-50 text-green-600 border-green-100'
  },
  {
    id: 'traffic',
    category: 'OTHER',
    title: 'Traffic & Road Sign',
    icon: '🚦',
    description: 'Traffic signals and road signs.',
    color: 'bg-purple-50 text-purple-600 border-purple-100'
  },
  {
    id: 'animal',
    category: 'OTHER',
    title: 'Stray Animal',
    icon: '🐕',
    description: 'Report stray animals and related issues.',
    color: 'bg-rose-50 text-rose-600 border-rose-100'
  }
];

const ServicesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredServices = SERVICES.filter(s =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleReportService = (category) => {
    navigate(`/requests/create?category=${category}`, {
      state: { category }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#29252A] tracking-tight">
            Our Services
          </h1>
          <p className="text-xs sm:text-sm text-[#6B666E] mt-1">
            Choose a service to report an issue or access related information.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <HiOutlineSearch className="absolute left-3.5 top-3 text-[#9E98A2] text-base" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter civic services..."
            className="w-full bg-white border border-[#EFE7E0] rounded-2xl py-2.5 pl-10 pr-4 text-xs text-[#29252A] placeholder-[#9E98A2] shadow-sm focus:outline-none focus:border-[#C65F63]"
          />
        </div>
      </div>

      {/* Mobile / Tablet Visual Banner */}
      <div className="lg:hidden relative rounded-3xl overflow-hidden border border-[#EFE7E0] p-6 shadow-sm min-h-[160px] flex flex-col justify-end">
        <img
          src="/city_park_banner.jpg"
          alt="Cleaner Cities Happier Communities"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#29252A]/80 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 text-white">
          <span className="font-serif italic text-2xl font-bold block leading-tight">
            Cleaner Cities
          </span>
          <span className="font-serif italic text-xl font-bold text-[#FDECEF] block leading-tight">
            Happier Communities
          </span>
        </div>
      </div>

      {/* Main Grid + Right Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Middle Content Section: Services Cards Grid (8 cols on lg) - Scrollable */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-3xl border border-[#EFE7E0] p-6 shadow-sm hover:shadow-md hover:border-[#C65F63]/30 transition-all duration-150 flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-2xl ${service.color} border flex items-center justify-center text-2xl shadow-sm group-hover:scale-105 transition`}>
                    {service.icon}
                  </div>
                  <span className="text-[10px] font-bold text-[#6B4E71] bg-[#E8D7E6] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Civic Utility
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-[#29252A] group-hover:text-[#C65F63] transition">
                    {service.title}
                  </h3>
                  <p className="text-xs text-[#6B666E] mt-1 leading-relaxed">
                    {service.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleReportService(service.category)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white text-xs font-bold shadow-md shadow-[#C65F63]/25 transition flex items-center justify-center gap-1.5"
              >
                <span>Report Issue</span>
              </button>
            </div>
          ))}
        </div>

        {/* Right Side Visual Banner: Fixed Full Screen Height on Desktop with Background Image */}
        <div className="hidden lg:flex lg:col-span-4 sticky top-4 h-[calc(100vh-130px)] min-h-[620px] rounded-3xl overflow-hidden border border-[#EFE7E0] shadow-md flex-col justify-between p-7 relative select-none self-start group">
          {/* Full Cover Background Image */}
          <img
            src="/city_park_banner.jpg"
            alt="Cleaner Cities Happier Communities"
            className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
          />

          {/* Soft Gradient Overlay for text contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/75 via-transparent to-[#29252A]/60 pointer-events-none" />

          {/* Top Tagline matching Reference Screenshot */}
          <div className="relative z-10 text-right">
            <span className="font-serif italic text-3xl font-bold text-[#6B4E71] block drop-shadow-sm leading-tight">
              Cleaner
            </span>
            <span className="font-serif italic text-3xl font-bold text-[#C65F63] block drop-shadow-sm leading-tight">
              Cities
            </span>
            <span className="font-serif italic text-2xl font-bold text-[#29252A] block drop-shadow-sm leading-tight mt-1">
              Happier Communities
            </span>
            <div className="inline-block mt-2 px-3 py-1 rounded-full bg-white/80 backdrop-blur-sm border border-white/80 text-[10px] font-bold text-[#C65F63] uppercase tracking-wider shadow-sm">
              ✦ Stronger Together
            </div>
          </div>

          {/* Bottom Card Overlay */}
          <div className="relative z-10 p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-white/80 shadow-lg text-xs text-[#29252A] space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-[#C65F63]">
              <HiOutlineSparkles className="text-base" />
              <span className="text-xs uppercase tracking-wider font-extrabold text-[#6B4E71]">LocalFix Civic Care</span>
            </div>
            <p className="text-[11px] text-[#6B666E] leading-relaxed">
              Every reported service issue is automatically matched to your local municipal corporation or town council based on physical location.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicesPage;
