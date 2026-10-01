import React from 'react';
import {
  HiOutlineLocationMarker,
  HiOutlineTrendingUp,
  HiOutlineOfficeBuilding
} from 'react-icons/hi';

const AuthVisualPanel = ({
  title = 'Your Voice Matters',
  subtitle = 'Report local problems, track progress and stay connected with your community.',
  tagline = 'LocalFix Community',
  imageSrc = '/auth_community_card.jpg',
  features = null
}) => {
  const defaultFeatures = [
    {
      title: 'Report Issues',
      desc: 'Report civic problems with accurate location.',
      icon: HiOutlineLocationMarker,
      bg: 'bg-[#FDECEF]',
      text: 'text-[#C65F63]'
    },
    {
      title: 'Track Progress',
      desc: 'Receive real-time updates on your requests.',
      icon: HiOutlineTrendingUp,
      bg: 'bg-[#E8D7E6]',
      text: 'text-[#6B4E71]'
    },
    {
      title: 'Better Communities',
      desc: 'Help improve services around you.',
      icon: HiOutlineOfficeBuilding,
      bg: 'bg-emerald-50',
      text: 'text-[#5C9A72]'
    }
  ];

  const activeFeatures = features || defaultFeatures;

  return (
    <div className="h-full w-full bg-[#FDECEF]/60 rounded-3xl border border-[#EFE7E0] p-6 sm:p-7 xl:p-8 flex flex-col justify-between select-none shadow-sm overflow-hidden">
      <div className="space-y-4">
        {/* Header */}
        <div>
          {tagline && (
            <span className="text-xs font-extrabold text-[#C65F63] uppercase tracking-wider block">
              {tagline}
            </span>
          )}
          <h2 className="text-2xl sm:text-3xl font-black text-[#29252A] tracking-tight mt-1">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-[#6B666E] mt-1.5 leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Civic Illustration Card */}
        <div className="rounded-2xl overflow-hidden border border-[#C65F63]/20 shadow-sm bg-white">
          <img
            src={imageSrc}
            alt="LocalFix Civic Community"
            className="w-full h-48 sm:h-52 object-cover object-center"
          />
        </div>

        {/* 3 Civic Feature Benefit Cards */}
        <div className="space-y-3 pt-1">
          {activeFeatures.map((feat, index) => {
            const Icon = feat.icon;
            return (
              <div
                key={index}
                className="p-3.5 rounded-xl bg-white border border-[#EFE7E0] flex items-start gap-3.5 shadow-xs transition hover:border-[#C65F63]/30"
              >
                <div className={`p-2 rounded-lg ${feat.bg} ${feat.text} shrink-0 text-base`}>
                  <Icon />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#29252A]">{feat.title}</h4>
                  <p className="text-[11px] text-[#6B666E] leading-snug mt-0.5">{feat.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Note */}
      <div className="pt-6 border-t border-[#EFE7E0]/60 text-center text-[11px] font-medium text-[#6B4E71]">
        Empowering citizens across municipal corporations & town councils
      </div>
    </div>
  );
};

export default AuthVisualPanel;
