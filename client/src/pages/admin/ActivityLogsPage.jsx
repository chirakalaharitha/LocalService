import React, { useState, useEffect, useMemo } from 'react';
import API from '../../services/api';
import {
  HiOutlineClipboardList,
  HiOutlineSearch,
  HiOutlineFilter,
  HiOutlineRefresh,
  HiOutlineInformationCircle,
  HiOutlineClock,
  HiOutlineUser
} from 'react-icons/hi';

const ACTION_COLORS = {
  STAFF_ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-200',
  REQUEST_REASSIGNED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  STATUS_UPDATED: 'bg-amber-50 text-amber-700 border-amber-200',
  USER_ACTIVATED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  USER_DEACTIVATED: 'bg-rose-50 text-rose-700 border-rose-200',
  SETTINGS_UPDATED: 'bg-purple-50 text-purple-700 border-purple-200',
  DEPARTMENT_CREATED: 'bg-teal-50 text-teal-700 border-teal-200',
  DEPARTMENT_UPDATED: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  DEPARTMENT_DEACTIVATED: 'bg-orange-50 text-orange-700 border-orange-200',
  DEPARTMENT_DELETED: 'bg-red-50 text-red-700 border-red-200',
  STAFF_ASSIGNED_TO_DEPT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  STAFF_REMOVED_FROM_DEPT: 'bg-yellow-50 text-yellow-700 border-yellow-200'
};

const ActivityLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [activeMetadataModal, setActiveMetadataModal] = useState(null);

  const fetchLogs = () => {
    setLoading(true);
    API.get('/admin/activity-logs')
      .then((res) => {
        if (res.data.success) {
          setLogs(res.data.logs || []);
        }
      })
      .catch((err) => console.error('Failed to load activity logs:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const uniqueActions = useMemo(() => {
    const set = new Set();
    logs.forEach((log) => {
      if (log.action) set.add(log.action);
    });
    return Array.from(set).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        (log.user?.name && log.user.name.toLowerCase().includes(term)) ||
        (log.user?.email && log.user.email.toLowerCase().includes(term)) ||
        (log.action && log.action.toLowerCase().includes(term)) ||
        (log.targetType && log.targetType.toLowerCase().includes(term)) ||
        (log.targetId && log.targetId.toString().toLowerCase().includes(term));

      return matchesAction && matchesSearch;
    });
  }, [logs, selectedAction, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-[#EFE7E0] p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-[#29252A] tracking-tight flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#FDECEF] text-[#C65F63] flex items-center justify-center">
              <HiOutlineClipboardList className="text-xl" />
            </div>
            <span>Administrative Audit Activity Logs</span>
          </h1>
          <p className="text-xs text-[#6B4E71] mt-1">
            Immutable audit record of administrative actions, user changes, and system modifications
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#FAF5F0] hover:bg-[#FDECEF] text-[#6B4E71] hover:text-[#C65F63] text-xs font-semibold rounded-xl border border-[#EFE7E0] transition disabled:opacity-50"
        >
          <HiOutlineRefresh className={`text-base ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#EFE7E0] p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full sm:w-80">
          <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B4E71] text-base" />
          <input
            type="text"
            placeholder="Search by user, action, or target ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl pl-9 pr-4 py-2 text-xs text-[#29252A] placeholder-[#6B4E71]/60 focus:outline-none focus:border-[#C65F63]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <HiOutlineFilter className="text-[#6B4E71] text-sm hidden sm:inline" />
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl px-3 py-2 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] w-full sm:w-auto"
          >
            <option value="ALL">All Action Events ({logs.length})</option>
            {uniqueActions.map((act) => (
              <option key={act} value={act}>
                {act.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table Card */}
      <div className="bg-white border border-[#EFE7E0] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#C65F63] border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-xs text-[#6B4E71]">Loading audit log entries from database...</div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <HiOutlineClipboardList className="mx-auto text-4xl text-[#6B4E71]/40" />
            <h3 className="text-sm font-bold text-[#29252A]">No activity logs found</h3>
            <p className="text-xs text-[#6B4E71] max-w-sm mx-auto">
              {logs.length === 0
                ? 'No administrative actions have been logged yet.'
                : 'No logs match your current search or action filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#29252A]">
              <thead className="bg-[#FAF5F0] text-[#6B4E71] uppercase font-semibold text-[10px] tracking-wider border-b border-[#EFE7E0]">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Admin Actor</th>
                  <th className="py-3.5 px-4">Action Event</th>
                  <th className="py-3.5 px-4">Target Entity</th>
                  <th className="py-3.5 px-4">Event Details / Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE7E0] font-sans">
                {filteredLogs.map((log) => {
                  const badgeClass =
                    ACTION_COLORS[log.action] || 'bg-[#FAF5F0] text-[#6B4E71] border-[#EFE7E0]';

                  return (
                    <tr key={log._id} className="hover:bg-[#FAF5F0]/60 transition">
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 text-[#6B4E71] whitespace-nowrap font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <HiOutlineClock className="text-[#6B4E71]" />
                          <span>{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                      </td>

                      {/* User / Actor */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#FDECEF] flex items-center justify-center text-[#C65F63] text-xs">
                            <HiOutlineUser />
                          </div>
                          <div>
                            <div className="font-bold text-[#29252A]">
                              {log.user?.name || 'System Operator'}
                            </div>
                            <div className="text-[10px] text-[#6B4E71] font-mono">
                              {log.user?.role || 'SYSTEM'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Action Event Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide border ${badgeClass}`}
                        >
                          {log.action?.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Target */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-[#29252A]">{log.targetType || 'N/A'}</div>
                        {log.targetId && (
                          <div className="text-[10px] font-mono text-[#6B4E71] truncate max-w-[120px]">
                            {log.targetId.toString()}
                          </div>
                        )}
                      </td>

                      {/* Metadata */}
                      <td className="py-3.5 px-4">
                        {log.metadata && Object.keys(log.metadata).length > 0 ? (
                          <button
                            onClick={() => setActiveMetadataModal(log)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FAF5F0] hover:bg-[#FDECEF] text-[#6B4E71] hover:text-[#C65F63] text-[11px] font-mono transition border border-[#EFE7E0]"
                          >
                            <HiOutlineInformationCircle className="text-xs" />
                            <span>View Payload ({Object.keys(log.metadata).length} keys)</span>
                          </button>
                        ) : (
                          <span className="text-[#6B4E71]/50 text-[11px] italic">None</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Metadata Detail Modal */}
      {activeMetadataModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EFE7E0] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#29252A]">Event Audit Metadata</h3>
                <p className="text-[11px] text-[#6B4E71] font-mono">
                  {activeMetadataModal.action} • {activeMetadataModal.targetType}
                </p>
              </div>
              <button
                onClick={() => setActiveMetadataModal(null)}
                className="text-[#6B4E71] hover:text-[#29252A] text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#FAF5F0] rounded-xl p-4 border border-[#EFE7E0] overflow-x-auto">
              <pre className="text-xs font-mono text-[#29252A] whitespace-pre-wrap">
                {JSON.stringify(activeMetadataModal.metadata, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setActiveMetadataModal(null)}
                className="px-4 py-2 bg-[#FAF5F0] hover:bg-[#FDECEF] text-[#6B4E71] hover:text-[#C65F63] text-xs font-semibold rounded-xl border border-[#EFE7E0] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogsPage;
