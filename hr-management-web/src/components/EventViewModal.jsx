import React from 'react';
import { X, Calendar as CalendarIcon, Pencil, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../ThemeContext';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const EventViewModal = ({ eventData, onClose, onRefresh, onEditClick }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const handleDeleteFullEvent = async () => {
    if (!window.confirm(t('event_view.confirm_delete_all', { title: eventData.title }))) return;
    try {
      const response = await axios.delete(`${API_BASE_URL}/events/${eventData.id}`);
      if (response.status === 200 || response.status === 204) { alert(t('event_view.success_delete')); onRefresh(); onClose(); }
    } catch (err) { alert(`삭제 오류: ${err.response?.data?.error || err.message}`); }
  };

  const handleRemoveStaff = async (staffId, date) => {
    if (!window.confirm(t('event_view.confirm_remove_staff'))) return;
    const updatedStaff = eventData.assignedStaff.filter(s => !(s.id === staffId && s.date === date));
    try {
      await axios.post(`${API_BASE_URL}/events`, { ...eventData, assignedStaff: updatedStaff });
      alert(t('event_view.success_remove_staff')); onRefresh();
    } catch (err) { alert(t('event_view.error_update')); }
  };

  const uniqueDates = Array.from(new Set(eventData.assignedStaff?.map(s => s.date))).sort();

  return (
    <div className={`fixed inset-0 ${theme.overlay} z-[100] flex items-center justify-center p-4`}>
      <div className={`${theme.modal} w-full max-w-lg p-5 overflow-y-auto max-h-[85vh]`}>
        {/* 헤더 */}
        <div className={`flex justify-between items-start mb-4 pb-4 border-b ${theme.divider}`}>
          <div className="flex-1 mr-4">
            <h3 className={`text-base font-semibold ${theme.text.primary} mb-1`}>{eventData.title}</h3>
            <p className={`${theme.text.muted} text-xs flex items-center gap-1.5`}>
              <CalendarIcon size={12}/> {eventData.startDate} ~ {eventData.endDate}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onEditClick(eventData)} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-md transition-colors"><Pencil size={15} /></button>
            <button onClick={handleDeleteFullEvent} className="p-1.5 hover:bg-red-50 text-red-400 rounded-md transition-colors"><Trash2 size={15} /></button>
            <button onClick={onClose} className={`p-1.5 ${theme.btnSecondary} rounded-md ml-1`}><X size={15} /></button>
          </div>
        </div>

        {/* 리스트 */}
        <div className="space-y-3">
          {uniqueDates.length > 0 ? (
            uniqueDates.map(date => (
              <div key={date}>
                <p className={`text-xs font-semibold ${theme.text.secondary} mb-2 flex items-center gap-1`}>📅 {date}</p>
                <div className="space-y-1.5">
                  {eventData.assignedStaff.filter(s => s.date === date).map((s, i) => (
                    <div key={`${s.id}-${i}`} className={`flex items-center justify-between px-3 py-2 ${theme.card} group`}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-[11px]">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-medium ${theme.text.primary}`}>{s.name}</span>
                            {(s.positions || []).map(p => (
                              <span key={p} className={`px-1 py-0.5 ${theme.badge.closed} text-[9px] font-medium rounded`}>#{p}</span>
                            ))}
                          </div>
                          <p className={`text-[10px] ${theme.text.muted}`}>{s.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleRemoveStaff(s.id, date)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-red-400 rounded transition-all"><Trash2 size={12} /></button>
                        <span className={`text-xs font-medium ${theme.text.secondary}`}>{s.workStart} - {s.workEnd}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className={`text-center py-8 ${theme.text.muted} text-sm`}>{t('event_view.empty_staff')}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventViewModal;
