import React, { useState } from 'react';
import { HiOutlinePhotograph, HiOutlineExclamationCircle, HiOutlineX } from 'react-icons/hi';
import { getImageUrl } from '../../utils/imageUrl';

const RequestEvidence = ({ images = [], beforeImage = '', afterImage = '' }) => {
  const [activeImage, setActiveImage] = useState(null);
  const [imageErrors, setImageErrors] = useState({});

  const handleImageError = (index) => {
    setImageErrors((prev) => ({ ...prev, [index]: true }));
  };

  const hasEvidence = (images && images.length > 0) || beforeImage || afterImage;

  if (!hasEvidence) {
    return (
      <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 sm:p-8 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 text-[#29252A] font-black text-base border-b border-[#EFE7E0] pb-4">
          <HiOutlinePhotograph className="text-[#C65F63] text-xl" />
          <h2>Submitted Evidence</h2>
        </div>
        <div className="p-8 text-center text-xs text-[#6B666E] bg-[#FAF5F0] rounded-2xl border border-[#EFE7E0]">
          No photographic evidence uploaded with this request.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
      <div className="flex items-center gap-2 text-[#29252A] font-black text-base border-b border-[#EFE7E0] pb-4">
        <HiOutlinePhotograph className="text-[#C65F63] text-xl" />
        <h2>Submitted Evidence Gallery</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((img, idx) => {
          const isError = imageErrors[idx];
          return (
            <div
              key={idx}
              className="relative group rounded-2xl overflow-hidden bg-[#FAF5F0] border border-[#EFE7E0] aspect-square flex items-center justify-center cursor-pointer shadow-sm hover:shadow-md transition"
              onClick={() => !isError && setActiveImage(img)}
            >
              {isError ? (
                <div className="p-2 text-center text-[10px] text-[#6B666E] flex flex-col items-center gap-1">
                  <HiOutlineExclamationCircle className="text-lg text-rose-500" />
                  <span>Image unavailable</span>
                </div>
              ) : (
                <>
                  <img
                    src={getImageUrl(img)}
                    alt={`Evidence ${idx + 1}`}
                    onError={() => handleImageError(idx)}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-[#29252A]/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs font-bold text-white">
                    Click to Enlarge
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Lightbox */}
      {activeImage && (
        <div className="fixed inset-0 bg-[#29252A]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="relative max-w-4xl w-full bg-white border border-[#EFE7E0] rounded-3xl p-3 shadow-2xl">
            <button
              onClick={() => setActiveImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-[#FAF5F0] hover:bg-[#EFE7E0] text-[#29252A] z-10 transition"
            >
              <HiOutlineX className="text-xl" />
            </button>
            <img
              src={getImageUrl(activeImage)}
              alt="Enlarged Evidence"
              className="max-h-[80vh] w-auto mx-auto object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestEvidence;
