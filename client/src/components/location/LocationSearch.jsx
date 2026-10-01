import React, { useState, useEffect, useRef } from 'react';
import { HiOutlineSearch, HiOutlineLocationMarker, HiX } from 'react-icons/hi';
import { searchLocations } from '../../services/locationService';

/**
 * LocationSearch
 * Debounced search input querying Nominatim OpenStreetMap for places, landmarks, pincodes.
 */
const LocationSearch = ({ onSelectLocation, disabled = false }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchError, setSearchError] = useState('');

  const containerRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      setHasSearched(false);
      setSearchError('');
      return;
    }

    setLoading(true);
    setSearchError('');

    const timer = setTimeout(async () => {
      // Cancel any ongoing fetch
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        const data = await searchLocations(query, abortControllerRef.current.signal);
        if (data !== null) {
          setResults(data);
          setHasSearched(true);
          setIsOpen(true);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setSearchError('Search failed. Please check network or try again.');
        }
      } finally {
        setLoading(false);
      }
    }, 450); // 450ms debounce

    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query]);

  const handleSelect = (item) => {
    setIsOpen(false);
    setQuery(item.displayName);
    if (onSelectLocation) {
      onSelectLocation(item);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B4E71]">
          <HiOutlineSearch className="text-base" />
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          disabled={disabled}
          placeholder="Search area, landmark, street, city, or pincode..."
          className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2.5 pl-10 pr-10 text-xs text-[#29252A] placeholder-[#6B4E71]/60 focus:outline-none focus:border-[#C65F63] transition shadow-sm"
        />

        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
          {loading && (
            <div className="w-3.5 h-3.5 border-2 border-[#C65F63] border-t-transparent rounded-full animate-spin" />
          )}
          {query && !loading && (
            <button
              type="button"
              onClick={handleClear}
              className="text-[#6B4E71] hover:text-[#29252A] transition"
              title="Clear search"
            >
              <HiX className="text-sm" />
            </button>
          )}
        </div>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#EFE7E0] rounded-2xl shadow-xl max-h-64 overflow-y-auto z-50 divide-y divide-[#EFE7E0]">
          {loading && results.length === 0 && (
            <div className="p-4 text-center text-xs text-[#6B4E71] flex items-center justify-center gap-2">
              <div className="w-3 h-3 border-2 border-[#C65F63] border-t-transparent rounded-full animate-spin" />
              <span>Searching locations...</span>
            </div>
          )}

          {!loading && hasSearched && results.length === 0 && (
            <div className="p-4 text-center text-xs text-[#6B4E71]">
              No location results found. Try a different search.
            </div>
          )}

          {searchError && (
            <div className="p-3 text-center text-xs text-red-600">
              {searchError}
            </div>
          )}

          {results.map((item, idx) => (
            <button
              key={item.placeId || idx}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full text-left p-3 hover:bg-[#FAF5F0] transition flex items-start gap-2.5 group"
            >
              <HiOutlineLocationMarker className="text-[#C65F63] text-base shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-[#29252A] line-clamp-1 group-hover:text-[#C65F63]">
                  {item.address || item.displayName.split(',')[0]}
                </div>
                <div className="text-[11px] text-[#6B4E71] line-clamp-1 mt-0.5">
                  {item.displayName}
                </div>
                <div className="text-[10px] text-[#6B4E71]/70 font-mono mt-0.5">
                  Lat: {item.lat.toFixed(5)}, Lng: {item.lng.toFixed(5)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationSearch;
