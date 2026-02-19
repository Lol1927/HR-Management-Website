import React, { useState } from 'react';
import { X, Star, Save, CheckCircle2, UserCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../ThemeContext';

function EventEvaluationFullModal({ event, onClose, API_URL }) {
  const staffList = event.assignedStaff || [];
  const [selectedStaff, setSelectedStaff] = useState(staffList[0] || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evalData, setEvalData] = useState({});
  const { theme } = useTheme();

  const handleUpdate = (field, value) => {
    if (!selectedStaff) return;
    setEvalData(prev => ({ ...prev, [selectedStaff.id]: { ...prev[selectedStaff.id], [field]: value } }));
  };

  const handleSaveAll = async () => {
    if (isSubmitting) return;
    const staffIds = Object.keys(evalData);
    if (staffIds.length === 0) { alert("평가된 인원이 없습니다."); return; }
    if (!window.confirm("모든 인력의 평가 결과를 제출하시겠습니까?")) return;
    try {
      setIsSubmitting(true);
      await Promise.all(staffIds.map(staffId => axios.post(`${API_URL}/history`, {
        employeeId: staffId,
        evaluation: { eventId: event.id, eventName: event.title, eventDate: `${event.startDate} ~ ${event.endDate}`,
          rating: evalData[staffId].rating || 0, feedback: evalData[staffId].comment || "", createdAt: new Date().toISOString() }
      })));
      alert("모든 인력 평가가 성공적으로 저장되었습니다."); onClose();
    } catch (err) { alert("일부 데이터를 저장하는 데 실패했습니다."); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className={`fixed inset-0 z-[500] flex flex-col ${theme.main}`}>
      {/* 헤더 */}
      <header className={`px-5 py-3 border-b ${theme.divider} ${theme.card} flex justify-between items-center`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <h2 className={`text-sm font-semibold ${theme.text.primary}`}>{event.title}</h2>
            <div className={`flex gap-3 ${theme.text.muted} text-xs`}>
              <span>{event.startDate} ~ {event.endDate}</span>
              <span>총 {staffList.length}명</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} disabled={isSubmitting} className={`p-1.5 ${theme.btnSecondary} rounded-md disabled:opacity-50`}>
          <X size={16} />
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 좌측: 직원 목록 */}
        <aside className={`w-60 border-r ${theme.divider} overflow-y-auto p-3 space-y-1`}>
          <p className={`text-[10px] font-medium ${theme.text.muted} px-2 uppercase tracking-wider mb-2`}>대상 직원</p>
          {staffList.map((staff) => (
            <button key={staff.id} disabled={isSubmitting} onClick={() => setSelectedStaff(staff)}
              className={`w-full px-3 py-2 rounded-lg flex items-center gap-2 text-xs transition-all ${
                selectedStaff?.id === staff.id ? `${theme.btnPrimary}` : `${theme.card} ${theme.text.secondary} hover:bg-gray-50`
              } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <UserCircle size={14} />
              <span className="font-medium">{staff.name}</span>
              {evalData[staff.id]?.rating && <div className="ml-auto w-1.5 h-1.5 bg-green-400 rounded-full" />}
            </button>
          ))}
        </aside>

        {/* 우측: 평가 */}
        <main className="flex-1 p-6 overflow-y-auto">
          {selectedStaff ? (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* 별점 */}
              <section className={`text-center ${theme.card} p-6`}>
                <p className={`${theme.text.muted} text-xs font-medium mb-4 uppercase tracking-wide`}>태도 및 성과 별점</p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} disabled={isSubmitting} onClick={() => handleUpdate('rating', star)}
                      className="transition-transform active:scale-90 hover:scale-110 disabled:opacity-50">
                      <Star size={36} fill={(evalData[selectedStaff.id]?.rating || 0) >= star ? "#3b82f6" : "none"}
                        className={(evalData[selectedStaff.id]?.rating || 0) >= star ? "text-blue-500" : "text-gray-200"} />
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-blue-600 font-semibold text-sm">{(evalData[selectedStaff.id]?.rating || 0)}점 / 5점</p>
              </section>

              {/* 피드백 */}
              <section>
                <div className="flex justify-between items-end mb-2">
                  <label className={`text-sm font-semibold ${theme.text.primary}`}>현장 피드백</label>
                  <span className={`${theme.text.muted} text-xs`}>{selectedStaff.name}</span>
                </div>
                <textarea disabled={isSubmitting} value={evalData[selectedStaff.id]?.comment || ""}
                  onChange={(e) => handleUpdate('comment', e.target.value)}
                  placeholder="직원의 태도, 숙련도, 지각 유무 등 참고 내용을 작성하세요."
                  className={`w-full h-40 px-4 py-3 text-sm ${theme.input} leading-relaxed disabled:opacity-50`} />
              </section>

              <button onClick={handleSaveAll} disabled={isSubmitting}
                className={`w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                  isSubmitting ? 'bg-gray-400 cursor-not-allowed text-gray-200' : `${theme.btnDark} hover:bg-blue-600`
                }`}>
                {isSubmitting ? (<><Loader2 className="animate-spin" size={16} /> 저장 중...</>)
                  : (<><Save size={16} /> 전체 평가 제출</>)}
              </button>
            </div>
          ) : (
            <div className={`h-full flex items-center justify-center ${theme.text.muted} text-sm`}>평가할 직원을 선택해주세요</div>
          )}
        </main>
      </div>
    </div>
  );
}

export default EventEvaluationFullModal;
