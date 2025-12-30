import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Award, Calendar, Users, ChevronRight,Star } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function StaffEvaluation() {
  const [evaluationEvents, setEvaluationEvents] = useState([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/events`);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 📅 한 달 전 날짜 계산
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        oneMonthAgo.setHours(0, 0, 0, 0);

        // 필터 조건: (이벤트 종료일 < 오늘) AND (이벤트 종료일 >= 한 달 전)
        const filtered = res.data.filter(ev => {
          const endDate = new Date(ev.endDate);
          endDate.setHours(0, 0, 0, 0);
          return endDate < today && endDate >= oneMonthAgo;
        });

        // 최신순 정렬
        filtered.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
        setEvaluationEvents(filtered);
      } catch (err) {
        console.error("평가 데이터 로드 실패:", err);
      }
    };
    fetchEvents();
  }, []);

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans text-slate-900">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-amber-100 rounded-2xl">
            <Award className="text-amber-600" size={32} />
          </div>
          <h2 className="text-3xl font-black tracking-tight">인력 평가</h2>
        </div>
        <p className="text-slate-500 font-bold ml-1">최근 한 달 이내에 종료된 행사 목록입니다.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {evaluationEvents.length > 0 ? (
          evaluationEvents.map(ev => (
            <div 
              key={ev.id} 
              className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-full text-xs font-black uppercase tracking-wider">
                  Closed
                </div>
                <div className="text-slate-300 group-hover:text-amber-500 transition-colors">
                  <Star size={24} className="fill-current" />
                </div>
              </div>

              <h3 className="text-2xl font-black mb-4 leading-tight group-hover:text-blue-600 transition-colors">
                {ev.title}
              </h3>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                  <Calendar size={16} />
                  <span>{ev.startDate} ~ {ev.endDate}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                  <Users size={16} />
                  <span>배정 인원: {ev.assignedStaff?.length || 0}명</span>
                </div>
              </div>

              <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 group-hover:bg-blue-600 transition-all">
                평가 시작하기 <ChevronRight size={18} />
              </button>
            </div>
          ))
        ) : (
          <div className="col-span-full py-32 bg-white rounded-[50px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
            <p className="text-slate-400 font-black text-xl">최근 한 달간 종료된 행사가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default StaffEvaluation;