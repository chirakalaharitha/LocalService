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
  STAFF_ASSIGNED: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  REQUEST_REASSIGNED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  STATUS_UPDATED: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  USER_ACTIVATED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  USER_DEACTIVATED: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  SETTINGS_UPDATED: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  DEPARTMENT_CREATED: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  DEPARTMENT_UPDATED: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  DEPARTMENT_DEACTIVATED: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  DEPARTMENT_DELETED: 'bg-red-500/10 text-red-400 border-red-500/30',
  STAFF_ASSIGNED_TO_DEPT: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  STAFF_REMOVED_FROM_DEPT: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
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
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <HiOutlineClipboardList className="text-teal-400 text-2xl" />
            <span>Administrative Audit Activity Logs</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable audit record of administrative actions, user changes, and system modifications
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition disabled:opacity-50"
        >
          <HiOutlineRefresh className={`text-base ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
          <input
            type="text"
            placeholder="Search by user, action, or target ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <HiOutlineFilter className="text-slate-400 text-sm hidden sm:inline" />
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500 w-full sm:w-auto"
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-xs text-slate-400">Loading audit log entries from database...</div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <HiOutlineClipboardList className="mx-auto text-4xl text-slate-600" />
            <h3 className="text-sm font-bold text-slate-300">No activity logs found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {logs.length === 0
                ? 'No administrative actions have been logged yet.'
                : 'No logs match your current search or action filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Admin Actor</th>
                  <th className="py-3.5 px-4">Action Event</th>
                  <th className="py-3.5 px-4">Target Entity</th>
                  <th className="py-3.5 px-4">Event Details / Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredLogs.map((log) => {
                  const badgeClass =
                    ACTION_COLORS[log.action] || 'bg-slate-800 text-slate-300 border-slate-700';

                  return (
                    <tr key={log._id} className="hover:bg-slate-800/30 transition">
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <HiOutlineClock className="text-slate-500" />
                          <span>{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                      </td>

                      {/* User / Actor */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-teal-400 text-xs">
                            <HiOutlineUser />
                          </div>
                          <div>
                            <div className="font-bold text-slate-200">
                              {log.user?.name || 'System Operator'}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
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
                        <div className="font-semibold text-slate-300">{log.targetType || 'N/A'}</div>
                        {log.targetId && (
                          <div className="text-[10px] font-mono text-slate-500 truncate max-w-[120px]">
                            {log.targetId.toString()}
                          </div>
                        )}
                      </td>

                      {/* Metadata */}
                      <td className="py-3.5 px-4">
                        {log.metadata && Object.keys(log.metadata).length > 0 ? (
                          <button
                            onClick={() => setActiveMetadataModal(log)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-teal-300 text-[11px] font-mono transition border border-slate-700"
                          >
                            <HiOutlineInformationCircle className="text-xs" />
                            <span>View Payload ({Object.keys(log.metadata).length} keys)</span>
                          </button>
                        ) : (
                          <span className="text-slate-600 text-[11px] italic">None</span>
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Event Audit Metadata</h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {activeMetadataModal.action} • {activeMetadataModal.targetType}
                </p>
              </div>
              <button
                onClick={() => setActiveMetadataModal(null)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/80 overflow-x-auto">
              <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">
                {JSON.stringify(activeMetadataModal.metadata, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setActiveMetadataModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
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
