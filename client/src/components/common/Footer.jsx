import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-white text-[#29252A] border-t border-[#EFE7E0] py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Bottom Legal bar */}
        <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#9E98A2]">
          <div>
            © {new Date().getFullYear()} LocalFix Civic Technology Platform. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <a href="#privacy" className="hover:text-[#29252A] transition">
              Privacy Policy
            </a>
            <span>•</span>
            <a href="#terms" className="hover:text-[#29252A] transition">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
