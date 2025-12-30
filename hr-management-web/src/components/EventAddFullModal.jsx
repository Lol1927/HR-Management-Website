import React, { useState, useEffect } from 'react';
import { X, Users as UsersIcon, Search, Check } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// 유틸리티 함수
const formatInputTime = (value) => {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 3) return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  return digits;
};

const formatPay = (value) => {
  const number = value.replace(/\D/g, "");
  return number.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const EventAddFullModal = ({ selectionInfo, onClose, onSaveSuccess, initialData,workplaces }) => {
  // --- 상태 관리 ---
  const [title, setTitle] = useState(initialData?.title || '');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [employees, setEmployees] = useState([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [searchName, setSearchName] = useState('');
  const [staffPay, setStaffPay] = useState({});
  const [positions, setPositions] = useState([]);
  const [staffPositions, setStaffPositions] = useState({});
  const [isAddingPosition, setIsAddingPosition] = useState(false);
  const [newPositionName, setNewPositionName] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allAssignedData, setAllAssignedData] = useState(initialData?.assignedStaff || []);
  const [staffTimes, setStaffTimes] = useState({});
  const [selectedRegion, setSelectedRegion] = useState("모든 지역");

  // --- 날짜 계산 ---
  const getDatesInRange = (start, end) => {
    const dates = [];
    let curr = new Date(start);
    let last = new Date(end);
    last.setDate(last.getDate() - 1); // FullCalendar의 endStr은 마지막날 +1일이므로 조정
    while (curr <= last) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  };

  const filteredStaffList = employees.filter(e => {
    const matchesName = e.name.includes(searchName);
    const matchesRegion = 
      selectedRegion === "모든 지역" || 
      (e.availableWork && e.availableWork.includes(selectedRegion));
    
    return matchesName && matchesRegion;
  });

  const dateList = getDatesInRange(selectionInfo.startStr, selectionInfo.endStr);
  const currentEditDate = dateList[currentIndex];

  // --- 초기 데이터 로드 ---
 useEffect(() => {
  const fetchData = async () => {
    try {
      const [empRes, posRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/employees`),
        axios.get(`${API_BASE_URL}/positions`)
      ]);
      setEmployees(empRes.data);
      setPositions(posRes.data.map(p => p.name));
    } catch (err) { console.error("데이터 로드 실패:", err); }
  };
  fetchData();

  // 수정 모드이거나 이미 입력된 데이터가 있는 경우
  if (initialData || allAssignedData.length > 0) {
    // 1. 현재 편집 중인 날짜(currentEditDate)의 인원만 필터링
    const todayStaffs = allAssignedData.filter(s => s.date === currentEditDate);
    
    const newSelectedIds = [];
    const newPays = { ...staffPay }; // 기존 입력값 유지하며 덮어쓰기 위해 복사
    const newPos = { ...staffPositions };
    const newTimes = { ...staffTimes };

    todayStaffs.forEach(s => {
      newSelectedIds.push(s.id);
      // DB/기존 데이터에서 불러온 값을 상태 객체에 저장
      newPays[s.id] = s.pay; 
      newPos[s.id] = s.positions || [];
      newTimes[s.id] = { start: s.workStart, end: s.workEnd };
    });

    // 2. 상태 업데이트 (이 작업이 수행되어야 화면에 급여와 포지션이 나타납니다)
    setSelectedStaffIds(newSelectedIds);
    setStaffPay(newPays);
    setStaffPositions(newPos);
    setStaffTimes(newTimes);
  }
}, [currentEditDate, initialData, allAssignedData]); // 의존성 배열 유지

    const toggleStaffPosition = (staffId, posName) => {
        setStaffPositions(prev => {
            const currentStaffPos = prev[staffId] || [];
            const isAlreadySelected = currentStaffPos.includes(posName);
            
            return {
            ...prev,
            [staffId]: isAlreadySelected 
                ? currentStaffPos.filter(p => p !== posName) // 이미 있으면 제거
                : [...currentStaffPos, posName]             // 없으면 추가
            };
        });
    };

  // --- 핸들러 함수 ---
  const handleTimeInput = (value, setter) => {
    let digits = value.replace(/\D/g, '');
    if (digits.length > 4) digits = digits.slice(0, 4);
    let hh = digits.slice(0, 2);
    let mm = digits.slice(2, 4);
    if (hh && parseInt(hh) > 23) hh = '23';
    if (mm && parseInt(mm) > 59) mm = '59';
    setter(digits.length >= 3 ? `${hh}:${mm}` : hh);
  };

  const addNewPosition = async () => {
    const trimmed = newPositionName.trim();
    if (trimmed && !positions.includes(trimmed)) {
      try {
        await axios.post(`${API_BASE_URL}/positions`, { name: trimmed });
        setPositions([...positions, trimmed]);
        setNewPositionName('');
        setIsAddingPosition(false);
      } catch (err) { alert("포지션 저장 실패"); }
    }
  };

  const deletePosition = async (posName) => {
    if (!window.confirm(`'${posName}' 포지션을 삭제하시겠습니까?`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/positions/${encodeURIComponent(posName)}`);
      setPositions(prev => prev.filter(p => p !== posName));
      alert("삭제되었습니다.");
    } catch (err) { alert("삭제 실패"); }
  };

  const toggleStaff = (id) => {
    selectedStaffIds.includes(id) 
      ? setSelectedStaffIds(selectedStaffIds.filter(i => i !== id))
      : setSelectedStaffIds([...selectedStaffIds, id]);
  };

  const handleStepNext = async () => {
    if (!title) return alert("제목을 확인하세요.");
    
    const currentDayStaff = selectedStaffIds.map(id => {
      const s = employees.find(e => e.id === id);
      const finalStart = staffTimes[id]?.start || startTime;
      const finalEnd = staffTimes[id]?.end || endTime;

      return { 
        date: currentEditDate,
        id: s.id, 
        name: s.name,
        phone: s.phone,
        positions: staffPositions[id] || [],
        workStart: finalStart,
        workEnd: finalEnd,
        pay: staffPay[id] || "0"
      };
    });

    // 현재 날짜 데이터를 제외한 나머지 데이터 + 현재 날짜 새 데이터
    const filteredOtherDays = allAssignedData.filter(s => s.date !== currentEditDate);
    const updatedTotalStaff = [...filteredOtherDays, ...currentDayStaff];

    if (currentIndex < dateList.length - 1) {
      setAllAssignedData(updatedTotalStaff);
      setCurrentIndex(prev => prev + 1);
      setSelectedStaffIds([]); 
    } else {
      try {
        await axios.post(`${API_BASE_URL}/events`, {
          id: initialData?.id || Date.now().toString(),
          title,
          startDate: dateList[0],
          endDate: dateList[dateList.length - 1],
          assignedStaff: updatedTotalStaff 
        });
        onSaveSuccess();
      } catch (err) { alert("저장 실패"); }
    }
  };

  const handleStaffTimeChange = (staffId, field, value) => {
    let digits = value.replace(/\D/g, '').slice(0, 4);
    setStaffTimes(prev => ({
      ...prev,
      [staffId]: {
        ...(prev[staffId] || { start: startTime.replace(':', ''), end: endTime.replace(':', '') }),
        [field]: digits 
      }
    }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-white w-full h-full rounded-[40px] shadow-2xl flex overflow-hidden border border-white/20">
        
        {/* 왼쪽 섹션: 입력 및 설정 */}
        <div className="w-2/5 bg-slate-50 p-10 border-r border-slate-200 overflow-y-auto">
          <div className="mb-8">
            <h2 className="text-sm font-black text-blue-600 mb-2 tracking-widest">{currentEditDate} 설정</h2>
            <input 
              className="text-3xl font-black bg-transparent border-b-2 border-slate-200 w-full pb-2 outline-none focus:border-blue-500 mb-6 transition-all"
              placeholder="행사 제목 입력"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <input type="text" className="p-4 bg-white rounded-2xl border border-slate-200 font-black text-center" value={startTime} onChange={(e) => handleTimeInput(e.target.value, setStartTime)} maxLength={5} />
              <input type="text" className="p-4 bg-white rounded-2xl border border-slate-200 font-black text-center" value={endTime} onChange={(e) => handleTimeInput(e.target.value, setEndTime)} maxLength={5} />
            </div>
          </div>

          {/* 포지션 설정 */}
          <div className="mb-6 p-6 bg-blue-50/50 rounded-[30px] border border-blue-100">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-black text-blue-600 uppercase tracking-tight">포지션 설정</span>
              {!isAddingPosition ? (
                <button onClick={() => setIsAddingPosition(true)} className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-all underline underline-offset-4">
                  포지션 추가 +
                </button>
              ) : (
                <div className="flex gap-2">
                  <input autoFocus className="text-xs p-1 border-b border-blue-400 bg-transparent outline-none w-24 font-bold" value={newPositionName} onChange={(e) => setNewPositionName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNewPosition()} placeholder="이름 입력" />
                  <button onClick={addNewPosition} className="text-xs font-black text-blue-600">저장</button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {positions.map(pos => (
                <span key={pos} className="group relative px-3 py-1 bg-white border border-blue-200 rounded-full text-[11px] font-black text-blue-600 flex items-center gap-1 shadow-sm">
                  {pos}
                  <button onClick={() => deletePosition(pos)} className="text-blue-200 hover:text-red-500 transition-colors ml-1"><X size={12} /></button>
                </span>
              ))}
            </div>
          </div>

          {/* 직원 검색 및 리스트 */}
          <div className="flex gap-2 mb-4">
            {/* 이름 검색 */}
            <div className="relative flex-[2]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="직원 검색" 
                value={searchName} 
                onChange={(e) => setSearchName(e.target.value)} 
              />
            </div>

            {/* 지역 필터 드롭다운 추가 */}
            <select 
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="flex-1 px-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="모든 지역">모든 지역</option>
              {workplaces && workplaces.map((wp, idx) => (
                <option key={idx} value={wp}>{wp}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {filteredStaffList.map(staff => (
              <div key={staff.id} className={`p-5 rounded-[30px] border-2 transition-all bg-white ${selectedStaffIds.includes(staff.id) ? "border-blue-500 shadow-md" : "border-transparent shadow-sm"}`}>
                <div className="flex items-center justify-between" onClick={() => toggleStaff(staff.id)}>
                   <div className="flex items-center gap-4 cursor-pointer">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-black ${selectedStaffIds.includes(staff.id) ? "bg-blue-600" : "bg-slate-300"}`}>{staff.name.charAt(0)}</div>
                      <div>
                        <p className="font-black text-slate-800 leading-none">{staff.name}</p>
                        <p className="text-xs font-bold text-slate-400 mt-1.5">{staff.phone || "010-0000-0000"}</p>
                      </div>
                   </div>
                   <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedStaffIds.includes(staff.id) ? "bg-blue-600 border-blue-600" : "border-slate-200"}`}>
                      {selectedStaffIds.includes(staff.id) && <Check size={14} className="text-white" />}
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 오른쪽 섹션: 배정 현황 및 상세 설정 */}
        <div className="flex-1 flex flex-col p-10 bg-white">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3"><UsersIcon className="text-blue-600" size={32} /> {currentEditDate} 배정 현황</h3>
            <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full text-slate-400"><X size={32}/></button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4">
            {selectedStaffIds.map(id => {
                const staff = employees.find(e => e.id === id);
                return (
                <div key={id} className="bg-slate-50 p-6 rounded-[35px] border border-slate-100 flex items-center justify-between hover:shadow-xl transition-all group">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white font-black text-xl">{staff?.name.charAt(0)}</div>
                      <div>
                        <span className="text-2xl font-black text-slate-900">{staff?.name}</span>
                        <p className="text-sm font-bold text-slate-400 mt-1">{staff?.phone}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 px-6 border-x border-slate-200/50">
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Expected Pay</span>
                      <div className="flex items-center gap-2">
                        <input type="text" className="w-28 text-right bg-transparent border-b-2 border-slate-200 focus:border-blue-500 outline-none text-xl font-black" value={staffPay[id] || ""} onChange={(e) => setStaffPay({ ...staffPay, [id]: formatPay(e.target.value) })} />
                        <span className="text-sm font-bold text-slate-400">원</span>
                      </div>
                    </div>

                    {/* ★ 추가: 개별 직원 포지션 선택 영역 ★ */}
                    <div className="py-4 border-y border-slate-200/50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">개별 포지션 부여</p>
                        <div className="flex flex-wrap gap-2">
                        {positions.map(pos => (
                            <button key={pos} onClick={() => toggleStaffPosition(id, pos)}
                            className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${
                                (staffPositions[id] || []).includes(pos)
                                ? "bg-blue-600 text-white shadow-md scale-105" // 선택됨
                                : "bg-white text-slate-400 border border-slate-200 hover:border-blue-300" // 미선택
                            }`}
                            >
                            {pos}
                            </button>
                        ))}
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-2 px-6">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Individual Work Time</span>
                      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                        <input type="text" className="w-16 text-center font-black" value={formatInputTime(staffTimes[id]?.start !== undefined ? staffTimes[id].start : startTime)} onChange={(e) => handleStaffTimeChange(id, 'start', e.target.value)} maxLength={5}/>
                        <span className="text-slate-300">~</span>
                        <input type="text" className="w-16 text-center font-black" value={formatInputTime(staffTimes[id]?.end !== undefined ? staffTimes[id].end : endTime)} onChange={(e) => handleStaffTimeChange(id, 'end', e.target.value)} maxLength={5}/>
                      </div>
                    </div>
                </div>
                );
            })}
          </div>

          <div className="mt-10 pt-8 border-t border-slate-100 flex justify-end gap-4">
            <button onClick={onClose} className="px-10 py-5 font-black text-slate-400">취소</button>
            <button onClick={handleStepNext} className="px-14 py-5 bg-blue-600 text-white rounded-[28px] font-black shadow-2xl hover:bg-blue-700 transition-all">
              {currentIndex < dateList.length - 1 ? "다음 날짜 설정" : "최종 저장 완료"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventAddFullModal;