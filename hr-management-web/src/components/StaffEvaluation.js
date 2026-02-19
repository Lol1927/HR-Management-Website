import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Award, Calendar, Users, ChevronRight, Star, AlertCircle } from 'lucide-react';
import EventEvaluationFullModal from './EventEvaluationFullModal';
import { useTheme } from '../ThemeContext';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function StaffEvaluation() {
  const [evaluationEvents, setEvaluationEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE_URL}/events`);
        const eventData = Array.isArray(res.data) ? res.data : [];
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const oneMonthAgo = new Date(today);
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const filtered = eventData.filter(ev => {
          if (!ev.endDate) return false;
          const endDate = new Date(ev.endDate);
          const pureEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
          return pureEndDate < today && pureEndDate >= oneMonthAgo;
        });
        filtered.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
        setEvaluationEvents(filtered);
      } catch (err) { console.error("평가 데이터 로드 실패:", err); }
      finally { setLoading(false); }
    };
    fetchEvents();
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-5">
        <div className="p-2 bg-amber-50 rounded-lg">
          <Award className="text-amber-600" size={18} />
        </div>
        <div>
          <h2 className={`text-lg font-semibold ${theme.text.primary}`}>인력 평가</h2>
          <p className={`text-xs ${theme.text.muted} mt-0.5`}>최근 한 달 이내에 종료된 행사 목록입니다.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {evaluationEvents.length > 0 ? (
            evaluationEvents.map(ev => {
              const staffCount = ev.assignedStaff?.length || 0;
              return (
                <div key={ev.id} onClick={() => setSelectedEvent(ev)}
                  className={`${theme.card} ${theme.cardHover} p-5 group cursor-pointer`}>
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2 py-0.5 ${theme.badge.closed} rounded text-[10px] font-medium uppercase`}>Closed</span>
                    <Star size={16} className="text-gray-200 group-hover:text-amber-400 fill-current transition-colors" />
                  </div>
                  <h3 className={`text-sm font-semibold mb-3 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[2.5rem] ${theme.text.primary}`}>
                    {ev.title}
                  </h3>
                  <div className="space-y-1.5 mb-4">
                    <div className={`flex items-center gap-1.5 ${theme.text.muted} text-xs`}>
                      <Calendar size={12} className="shrink-0" />
                      <span>{ev.startDate} ~ {ev.endDate}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${theme.text.muted} text-xs`}>
                      <Users size={12} className="shrink-0" />
                      <span>배정 인원: <span className={staffCount > 0 ? theme.text.primary : "text-rose-500"}>{staffCount}명</span></span>
                    </div>
                  </div>
                  <button disabled={staffCount === 0}
                    className={`w-full py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      staffCount > 0 ? `${theme.btnDark} group-hover:bg-blue-600` : `${theme.btnSecondary} cursor-not-allowed opacity-50`
                    }`}>
                    {staffCount > 0 ? "평가 시작하기" : "평가 대상 없음"} <ChevronRight size={14} />
                  </button>
                </div>
              );
            })
          ) : (
            <div className={`col-span-full py-20 ${theme.emptyState} rounded-xl flex flex-col items-center justify-center text-center`}>
              <AlertCircle size={32} className="text-gray-300 mb-3" />
              <p className={`${theme.text.muted} font-medium text-sm`}>최근 한 달간 종료된 행사가 없습니다.</p>
              <p className={`${theme.text.muted} text-xs mt-1`}>평가는 행사가 종료된 후부터 가능합니다.</p>
            </div>
          )}
        </div>
      )}

      {selectedEvent && (
        <EventEvaluationFullModal event={selectedEvent} onClose={() => setSelectedEvent(null)} API_URL={API_BASE_URL} />
      )}
    </div>
  );
}

export default StaffEvaluation;
