import React from 'react';
import { X, Calendar as CalendarIcon, Pencil, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

// API 주소 (필요시 환경변수나 공통 상수로 관리하세요)
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const EventViewModal = ({ eventData, onClose, onRefresh, onEditClick }) => {
  const { t } = useTranslation();
  // 1. [행사 전체 삭제]
  const handleDeleteFullEvent = async () => {
    if (!window.confirm(t('event_view.confirm_delete_all', { title: eventData.title }))) return;

    try {
      const deleteUrl = `${API_BASE_URL}/events/${eventData.id}`;
      const response = await axios.delete(deleteUrl);
      
      if (response.status === 200 || response.status === 204) {
        alert(t('event_view.success_delete'));
        onRefresh(); // 메인 캘린더 새로고침
        onClose();   // 모달 닫기
      }
    } catch (err) {
      console.error("삭제 실패:", err);
      const errorMsg = err.response?.data?.error || err.message;
      alert(`삭제 오류: ${errorMsg}`);
    }
  };

  // 2. [개별 직원 배정 삭제]
  const handleRemoveStaff = async (staffId, date) => {
    if (!window.confirm(t('event_view.confirm_remove_staff'))) return;

    const updatedStaff = eventData.assignedStaff.filter(
      s => !(s.id === staffId && s.date === date)
    );

    const updatedEvent = {
      ...eventData,
      assignedStaff: updatedStaff
    };

    try {
      await axios.post(`${API_BASE_URL}/events`, updatedEvent);
      alert(t('event_view.success_remove_staff'));
      onRefresh(); 
      
    } catch (err) {
      alert(t('event_view.error_update'));
    }
  };

  // 날짜별로 데이터 그룹화
  const uniqueDates = Array.from(new Set(eventData.assignedStaff?.map(s => s.date))).sort();

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-white w-full max-w-2xl p-8 rounded-[40px] shadow-2xl overflow-y-auto max-h-[90vh]">
        
        {/* 헤더 섹션 */}
        <div className="flex justify-between items-center mb-8 border-b pb-6">
          <div>
            <h3 className="text-3xl font-black mb-2 leading-none">{eventData.title}</h3>
            <p className="text-slate-500 font-bold flex items-center gap-2 mt-2">
              <CalendarIcon size={18}/> {eventData.startDate} ~ {eventData.endDate}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onEditClick(eventData)} 
              className="p-3 hover:bg-blue-50 text-blue-500 rounded-full transition-colors"
              title="수정하기"
            >
              <Pencil size={24} />
            </button>
            <button 
              onClick={handleDeleteFullEvent} 
              className="p-3 hover:bg-red-50 text-red-500 rounded-full transition-colors"
              title="전체 삭제"
            >
              <Trash2 size={24} />
            </button>
            <div className="w-[1px] h-8 bg-slate-200 mx-2" />
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
              <X size={32} />
            </button>
          </div>
        </div>
        
        {/* 리스트 섹션 */}
        <div className="space-y-6">
          {uniqueDates.length > 0 ? (
            uniqueDates.map(date => (
              <div key={date} className="bg-slate-50 p-6 rounded-3xl">
                <p className="font-black text-slate-800 mb-4 flex items-center gap-2 text-lg">📅 {date}</p>
                <div className="space-y-3">
                  {eventData.assignedStaff.filter(s => s.date === date).map((s, i) => (
                    <div key={`${s.id}-${i}`} className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100 group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-black">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-800">{s.name}</span>
                            {(s.positions || []).map(p => (
                              <span key={p} className="px-1.5 py-0.5 bg-slate-100 text-[9px] font-black text-slate-400 rounded-md uppercase">#{p}</span>
                            ))}
                          </div>
                          <p className="text-[10px] font-bold text-slate-400">{s.phone}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => handleRemoveStaff(s.id, date)}
                          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 text-red-400 rounded-lg transition-all"
                          title={t('event_view.confirm_remove_staff')}
                        >
                          <Trash2 size={16} />
                        </button>
                        <div className="text-right font-black text-slate-600 text-sm">
                          {s.workStart} - {s.workEnd}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-slate-400 font-bold">
              {t('event_view.empty_staff')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventViewModal;