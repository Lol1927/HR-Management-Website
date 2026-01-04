import React, { useState } from 'react';
import { X, Star, Save, CheckCircle2, UserCircle,Loader2 } from 'lucide-react';
import axios from 'axios';

function EventEvaluationFullModal({ event, onClose, API_URL }) {
  // 이벤트에 배정되었던 직원 목록 (데이터 구조에 따라 ev.assignedStaff 또는 ev.staffList)
  const staffList = event.assignedStaff || [];
  const [selectedStaff, setSelectedStaff] = useState(staffList[0] || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 평가 데이터 저장: { "직원ID": { rating: 5, comment: "" } }
  const [evalData, setEvalData] = useState({});

  const handleUpdate = (field, value) => {
    if (!selectedStaff) return;
    setEvalData(prev => ({
      ...prev,
      [selectedStaff.id]: {
        ...prev[selectedStaff.id],
        [field]: value
      }
    }));
  };

  const handleSaveAll = async () => {
    // 1. 이미 제출 중이면 함수 실행 차단 (방어막)
    if (isSubmitting) return;

    const staffIds = Object.keys(evalData);
    if (staffIds.length === 0) {
      alert("평가된 인원이 없습니다.");
      return;
    }

    // 사용자 확인 (실수 방지)
    if (!window.confirm("모든 인력의 평가 결과를 제출하시겠습니까?")) return;

    try {
      // 2. 제출 시작 상태로 전환 (버튼 비활성화)
      setIsSubmitting(true);
      
      // 3. 모든 평가 데이터를 병렬로 전송
      const savePromises = staffIds.map(staffId => {
        const payload = {
          employeeId: staffId, 
          evaluation: {
            eventId: event.id,
            eventName: event.title,
            eventDate: `${event.startDate} ~ ${event.endDate}`,
            rating: evalData[staffId].rating || 0,
            feedback: evalData[staffId].comment || "",
            createdAt: new Date().toISOString()
          }
        };
        
        return axios.post(`${API_URL}/history`, payload);
      });

      // 모든 요청이 끝날 때까지 대기
      await Promise.all(savePromises);

      alert("모든 인력 평가가 성공적으로 저장되었습니다.");
      onClose();
    } catch (err) {
      console.error("평가 저장 중 에러:", err);
      alert("일부 데이터를 저장하는 데 실패했습니다. 다시 시도해주세요.");
    } finally {
      // 4. 성공하든 실패하든 마지막에 제출 상태 해제 (중요!)
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[500] flex flex-col animate-in fade-in duration-300">
      {/* 1. 상단 헤더 섹션 (기존과 동일) */}
      <header className="p-6 border-b bg-slate-50 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800">{event.title}</h2>
            <div className="flex gap-4 text-slate-400 font-bold text-sm">
              <span>기간: {event.startDate} ~ {event.endDate}</span>
              <span>총 {staffList.length}명의 인력 평가</span>
            </div>
          </div>
        </div>
        <button 
          onClick={onClose} 
          disabled={isSubmitting} // 저장 중에는 닫기 방지
          className="p-4 bg-white rounded-full text-slate-400 hover:text-slate-800 shadow-sm border transition-all disabled:opacity-50"
        >
          <X size={24} />
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 2. 좌측 직원 목록 사이드바 (기존과 동일) */}
        <aside className="w-80 border-r bg-slate-50/30 overflow-y-auto p-4 space-y-3">
          <p className="text-[11px] font-black text-slate-400 px-3 uppercase tracking-widest mb-2">대상 직원 목록</p>
          {staffList.map((staff) => (
            <button
              key={staff.id}
              disabled={isSubmitting} // 저장 중에는 직원 전환 방지
              onClick={() => setSelectedStaff(staff)}
              className={`w-full p-4 rounded-[24px] flex items-center gap-3 transition-all ${
                selectedStaff?.id === staff.id 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 translate-x-2' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-100'
              } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <UserCircle size={20} className={selectedStaff?.id === staff.id ? "text-blue-200" : "text-slate-300"} />
              <span className="font-black text-sm">{staff.name}</span>
              {evalData[staff.id]?.rating && (
                <div className="ml-auto w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              )}
            </button>
          ))}
        </aside>

        {/* 3. 우측 상세 평가 영역 */}
        <main className="flex-1 p-12 overflow-y-auto bg-white">
          {selectedStaff ? (
            <div className="max-w-3xl mx-auto space-y-12">
              {/* 별점 섹션 (기존과 동일) */}
              <section className="text-center bg-slate-50 p-10 rounded-[40px] border border-slate-100">
                <p className="text-slate-400 font-black mb-6 uppercase tracking-wider">직원 태도 및 성과 별점</p>
                <div className="flex justify-center gap-4">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button 
                      key={star} 
                      disabled={isSubmitting}
                      onClick={() => handleUpdate('rating', star)}
                      className="transition-transform active:scale-90 hover:scale-110 disabled:opacity-50"
                    >
                      <Star 
                        size={56} 
                        fill={(evalData[selectedStaff.id]?.rating || 0) >= star ? "#3b82f6" : "none"}
                        className={(evalData[selectedStaff.id]?.rating || 0) >= star ? "text-blue-500" : "text-slate-200"}
                      />
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-blue-600 font-black text-lg">
                  {(evalData[selectedStaff.id]?.rating || 0)}점 / 5점
                </p>
              </section>

              {/* 메모/후기 섹션 (기존과 동일) */}
              <section className="space-y-4">
                <div className="flex justify-between items-end px-2">
                  <label className="text-xl font-black text-slate-800">현장 피드백 (근무 평정)</label>
                  <span className="text-slate-400 text-sm font-bold">{selectedStaff.name} 직원 특이사항</span>
                </div>
                <textarea 
                  disabled={isSubmitting}
                  value={evalData[selectedStaff.id]?.comment || ""}
                  onChange={(e) => handleUpdate('comment', e.target.value)}
                  placeholder="행사 중 직원의 태도, 업무 숙련도, 지각 유무 등 다음 배정 시 참고할 내용을 작성해주세요."
                  className="w-full h-64 p-8 bg-slate-50 border-2 border-slate-100 rounded-[40px] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 focus:outline-none transition-all text-slate-700 font-medium leading-relaxed disabled:opacity-50"
                />
              </section>

              {/* [수정된 부분] 전체 저장 버튼 */}
              <button 
                onClick={handleSaveAll}
                disabled={isSubmitting} // 1. 중복 클릭 방지
                className={`w-full py-6 rounded-[32px] font-black text-xl transition-all flex items-center justify-center gap-3 
                  ${isSubmitting 
                    ? 'bg-slate-400 cursor-not-allowed text-slate-200' 
                    : 'bg-slate-900 text-white hover:bg-blue-600 hover:shadow-2xl hover:shadow-blue-200'
                  }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={24} /> 
                    데이터 저장 중...
                  </>
                ) : (
                  <>
                    <Save size={24} /> 
                    전체 인원 평가 결과 제출하기
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-300 font-black text-2xl uppercase tracking-widest">
              평가할 직원을 선택해주세요
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default EventEvaluationFullModal;