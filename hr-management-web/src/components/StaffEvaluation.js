import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Award, Calendar, Users, ChevronRight, Star, AlertCircle } from 'lucide-react';
import EventEvaluationFullModal from './EventEvaluationFullModal';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function StaffEvaluation() {
  const [evaluationEvents, setEvaluationEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true); // 로딩 상태 추가

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE_URL}/events`);
        
        // 데이터가 배열인지 확인 (방어 코드)
        const eventData = Array.isArray(res.data) ? res.data : [];

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const oneMonthAgo = new Date(today);
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const filtered = eventData.filter(ev => {
          if (!ev.endDate) return false;
          const endDate = new Date(ev.endDate);
          // 시간 정보를 제거하고 날짜만 비교
          const pureEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
          
          // 조건: 오늘보다 이전(종료됨) AND 한 달 전보다는 이후
          return pureEndDate < today && pureEndDate >= oneMonthAgo;
        });

        // 최신순 정렬
        filtered.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
        setEvaluationEvents(filtered);
      } catch (err) {
        console.error("평가 데이터 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans text-slate-900">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-amber-100 rounded-2xl shadow-sm">
            <Award className="text-amber-600" size={32} />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800">인력 평가</h2>
        </div>
        <p className="text-slate-500 font-bold ml-1">최근 한 달 이내에 종료된 행사 목록입니다.</p>
      </header>

      {loading ? (
        // 로딩 중 UI
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {evaluationEvents.length > 0 ? (
            evaluationEvents.map(ev => {
              const staffCount = ev.assignedStaff?.length || 0;
              
              return (
                <div 
                  key={ev.id} 
                  onClick={() => setSelectedEvent(ev)}
                  className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 hover:shadow-2xl hover:-translate-y-2 transition-all group cursor-pointer relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                      Closed
                    </div>
                    <div className="text-slate-200 group-hover:text-amber-400 transition-colors">
                      <Star size={24} className="fill-current" />
                    </div>
                  </div>

                  <h3 className="text-2xl font-black mb-4 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[4rem]">
                    {ev.title}
                  </h3>

                  <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                      <Calendar size={16} className="shrink-0" />
                      <span>{ev.startDate} ~ {ev.endDate}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                      <Users size={16} className="shrink-0" />
                      <span>배정 인원: <span className={staffCount > 0 ? "text-slate-700" : "text-rose-500"}>{staffCount}명</span></span>
                    </div>
                  </div>

                  <button 
                    disabled={staffCount === 0}
                    className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${
                      staffCount > 0 
                      ? "bg-slate-900 text-white group-hover:bg-blue-600 shadow-lg shadow-slate-200" 
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {staffCount > 0 ? "평가 시작하기" : "평가 대상 없음"} <ChevronRight size={18} />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-32 bg-white rounded-[50px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
              <AlertCircle size={48} className="text-slate-200 mb-4" />
              <p className="text-slate-400 font-black text-xl">최근 한 달간 종료된 행사가 없습니다.</p>
              <p className="text-slate-300 text-sm mt-2">평가는 행사가 종료된 후부터 가능합니다.</p>
            </div>
          )}
        </div>
      )}

      {selectedEvent && (
        <EventEvaluationFullModal 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)} 
          API_URL={API_BASE_URL}
        />
      )}
    </div>
  );
}

export default StaffEvaluation;