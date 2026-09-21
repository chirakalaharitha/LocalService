import React from 'react';
import { HiOutlinePhotograph } from 'react-icons/hi';
import { getImageUrl } from '../../utils/imageUrl';

const BeforeAfterViewer = ({ beforeImage, afterImage }) => {
  if (!beforeImage && !afterImage) {
    return (
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-500">
        No before/after resolution proof images uploaded yet.
      </div>
    );
  }

  const resolvedBefore = getImageUrl(beforeImage);
  const resolvedAfter = getImageUrl(afterImage);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* BEFORE WORK */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col items-center">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-2 uppercase tracking-wider">
          <HiOutlinePhotograph />
          <span>Before Work (Initial Issue)</span>
        </div>
        {beforeImage ? (
          <a href={resolvedBefore} target="_blank" rel="noreferrer" className="w-full">
            <img
              src={resolvedBefore}
              alt="Before Work Proof"
              className="w-full h-48 object-cover rounded-lg border border-slate-700 hover:scale-[1.02] transition"
            />
          </a>
        ) : (
          <div className="w-full h-48 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center text-xs text-slate-600">
            Before image pending staff upload
          </div>
        )}
      </div>

      {/* AFTER WORK */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col items-center">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-2 uppercase tracking-wider">
          <HiOutlinePhotograph />
          <span>After Work (Resolved State)</span>
        </div>
        {afterImage ? (
          <a href={resolvedAfter} target="_blank" rel="noreferrer" className="w-full">
            <img
              src={resolvedAfter}
              alt="After Work Proof"
              className="w-full h-48 object-cover rounded-lg border border-slate-700 hover:scale-[1.02] transition"
            />
          </a>
        ) : (
          <div className="w-full h-48 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center text-xs text-slate-600">
            After image pending completion
          </div>
        )}
      </div>
    </div>
  );
};

export default BeforeAfterViewer;

