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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-2 text-white font-bold text-base border-b border-slate-800 pb-3">
          <HiOutlinePhotograph className="text-amber-400 text-xl" />
          <h2>Submitted Evidence</h2>
        </div>
        <div className="p-8 text-center text-xs text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
          No photographic evidence uploaded with this request.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2 text-white font-bold text-base border-b border-slate-800 pb-3">
        <HiOutlinePhotograph className="text-blue-400 text-xl" />
        <h2>Submitted Evidence Gallery</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((img, idx) => {
          const isError = imageErrors[idx];
          return (
            <div
              key={idx}
              className="relative group rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-square flex items-center justify-center cursor-pointer"
              onClick={() => !isError && setActiveImage(img)}
            >
              {isError ? (
                <div className="p-2 text-center text-[10px] text-slate-500 flex flex-col items-center gap-1">
                  <HiOutlineExclamationCircle className="text-lg text-rose-400" />
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
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs font-bold text-white">
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
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-2">
            <button
              onClick={() => setActiveImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 z-10"
            >
              <HiOutlineX className="text-xl" />
            </button>
            <img
              src={getImageUrl(activeImage)}
              alt="Enlarged Evidence"
              className="max-h-[80vh] w-auto mx-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestEvidence;

