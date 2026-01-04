import React, { useState, useEffect } from 'react';
import { X, Users as UsersIcon, Search, Check,ChevronDown } from 'lucide-react';
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

const EventAddFullModal = ({ selectionInfo, onClose, onSaveSuccess, initialData,provinces = [],  cities = [] }) => {
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allAssignedData, setAllAssignedData] = useState(initialData?.assignedStaff || []);
  const [staffTimes, setStaffTimes] = useState({});
  const [isProvinceOpen, setIsProvinceOpen] = useState(false);
  const [isCityOpen, setIsCityOpen] = useState(false);

  const [selectedProvince, setSelectedProvince] = useState("모든 주");
  const [selectedCity, setSelectedCity] = useState("전체 보기");

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

  const filteredStaffList = employees.filter(emp => {
    // 1. 이름/연락처 검색 (emp?.name 처럼 물음표 추가)
    const matchesSearch = 
      (emp.name?.includes(searchName)) || 
      (emp.contact?.includes(searchName)) ||
      (emp.phone?.includes(searchName));

    // 2. 주(Province) 필터링
    const isAllProvince = selectedProvince === "모든 주";
    const matchesProvince = isAllProvince || 
      emp.availableWork?.some(loc => String(loc).includes(selectedProvince));

    // 3. 시(City) 필터링
    const isAllCity = selectedCity === "전체 보기";
    const matchesCity = isAllCity || 
      emp.availableWork?.some(loc => String(loc).includes(selectedCity));

    return matchesSearch && matchesProvince && matchesCity;
  });
  // 임시 저장 핸들러: 중간 단계에서도 무조건 저장 후 닫기
  const handleTempSave = async () => {
    // 현재 페이지에서 선택된 데이터까지 포함시키기 위해 데이터 정리
    const currentDayStaff = selectedStaffIds.map(id => {
      const s = employees.find(e => e.id === id);
      return { 
        date: currentEditDate,
        id: s.id, 
        name: s.name,
        phone: s.phone,
        positions: staffPositions[id] || [],
        workStart: staffTimes[id]?.start || startTime,
        workEnd: staffTimes[id]?.end || endTime,
        pay: staffPay[id] || "0"
      };
    });

    const filteredOtherDays = allAssignedData.filter(s => s.date !== currentEditDate);
    const updatedTotalStaff = [...filteredOtherDays, ...currentDayStaff];

    try {
      await axios.post(`${API_BASE_URL}/events`, {
        id: initialData?.id || Date.now().toString(),
        title: title || "제목 없음(임시저장)", // 제목이 없어도 저장 가능하게 허용
        startDate: dateList[0],
        endDate: dateList[dateList.length - 1],
        assignedStaff: updatedTotalStaff,
        status: "draft" // 옵션: 나중에 임시저장 건만 따로 구분하고 싶을 때 사용
      });
      alert("현재 단계까지 임시 저장되었습니다.");
      onSaveSuccess(); // 목록 새로고침 후 모달 닫기
    } catch (err) {
      alert("임시 저장 실패");
    }
};
  
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

            {/* 1. 지역 선택 (Province) - 너비 축소 및 패딩 조절 */}
            <div className="w-40 relative"> {/* w-64에서 w-40으로 축소 */}
              <p className="text-[10px] font-bold text-slate-400 ml-1 mb-1 uppercase">지역 선택</p>
              <button 
                onClick={() => {
                  setIsProvinceOpen(!isProvinceOpen);
                  setIsCityOpen(false);
                }}
                className={`w-full p-2.5 rounded-xl font-bold text-xs flex justify-between items-center shadow-md transition-all ${
                  selectedProvince !== "모든 주" ? "bg-blue-600 text-white" : "bg-white text-slate-700 border border-slate-100"
                }`}
              >
                <span className="truncate mr-1">{selectedProvince}</span>
                <ChevronDown size={14} className={`shrink-0 transition-transform duration-300 ${isProvinceOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProvinceOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <button
                    onClick={() => { setSelectedProvince("모든 주"); setSelectedCity("전체 보기"); setIsProvinceOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 border-b border-slate-50 text-slate-600"
                  >
                    모든 주
                  </button>
                  <div className="max-h-48 overflow-y-auto"> {/* 리스트가 길면 스크롤 발생 */}
                    {provinces.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => { 
                          setSelectedProvince(p.provinceName); 
                          setSelectedCity("전체 보기"); 
                          setIsProvinceOpen(false); 
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 border-b border-slate-50 last:border-none text-slate-600"
                      >
                        {p.provinceName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

           {/* 2. 세부 시 (City) - 너비 축소 및 애니메이션 유지 */}
          {selectedProvince !== "모든 주" && (
            <div className="w-40 relative animate-in fade-in slide-in-from-left-2 duration-300">
              <p className="text-[10px] font-bold text-slate-400 ml-1 mb-1 uppercase">세부 시</p>
              <button 
                onClick={() => {
                  setIsCityOpen(!isCityOpen);
                  setIsProvinceOpen(false);
                }}
                className="w-full bg-emerald-500 text-white p-2.5 rounded-xl font-bold text-xs flex justify-between items-center shadow-md"
              >
                <span className="truncate mr-1">{selectedCity}</span>
                <ChevronDown size={14} className={`shrink-0 transition-transform duration-300 ${isCityOpen ? 'rotate-180' : ''}`} />
              </button>

              {isCityOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <button
                    onClick={() => { setSelectedCity("전체 보기"); setIsCityOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 border-b border-slate-50 text-slate-600"
                  >
                    전체 보기
                  </button>
                  <div className="max-h-48 overflow-y-auto">
                    {cities
                      .filter(c => c.provinceName === selectedProvince && c.cityName !== `${selectedProvince} 전체`)
                      .map((c, idx) => (
                        <button
                          key={idx}
                          onClick={() => { setSelectedCity(c.cityName); setIsCityOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 border-b border-slate-50 last:border-none text-slate-600"
                        >
                          {c.cityName.replace(`${selectedProvince} `, "")}
                        </button>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          )}
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

          <div className="mt-10 pt-8 border-t border-slate-100 flex justify-end items-center gap-4">
            {/* 취소 버튼: 텍스트 형태로 무게감을 줄여서 왼쪽에 배치 */}
            <button 
              onClick={onClose} 
              className="px-6 py-4 font-black text-slate-400 hover:text-slate-600 transition-colors mr-2"
            >
              취소
            </button>

            {/* 임시 저장: 노란색(Amber), 중간 강조 */}
            <button 
              onClick={handleTempSave}
              className="px-8 py-4 bg-amber-400 text-white rounded-[22px] font-black shadow-md hover:bg-amber-500 hover:-translate-y-0.5 transition-all active:scale-95"
            >
              임시 저장
            </button>

            {/* 다음/완료: 파란색(Blue), 최대 강조 */}
            <button 
              onClick={handleStepNext} 
              className="px-10 py-4 bg-blue-600 text-white rounded-[22px] font-black shadow-xl hover:bg-blue-700 hover:-translate-y-0.5 transition-all active:scale-95"
            >
              {currentIndex < dateList.length - 1 ? "다음 날짜 설정" : "최종 저장 완료"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventAddFullModal;