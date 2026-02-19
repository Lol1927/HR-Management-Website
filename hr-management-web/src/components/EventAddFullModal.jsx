import React, { useState, useEffect } from 'react';
import { X, Users as UsersIcon, Search, Check, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../ThemeContext';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

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

const EventAddFullModal = ({ selectionInfo, onClose, onSaveSuccess, initialData, provinces = [], cities = [] }) => {
  const { theme } = useTheme();
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

  const getDatesInRange = (start, end) => {
    const dates = []; let curr = new Date(start); let last = new Date(end); last.setDate(last.getDate() - 1);
    while (curr <= last) { dates.push(curr.toISOString().split('T')[0]); curr.setDate(curr.getDate() + 1); }
    return dates;
  };

  const filteredStaffList = employees.filter(emp => {
    const matchesSearch = (emp.name?.includes(searchName)) || (emp.contact?.includes(searchName)) || (emp.phone?.includes(searchName));
    const matchesProvince = selectedProvince === "모든 주" || emp.availableWork?.some(loc => String(loc).includes(selectedProvince));
    const matchesCity = selectedCity === "전체 보기" || emp.availableWork?.some(loc => String(loc).includes(selectedCity));
    return matchesSearch && matchesProvince && matchesCity;
  });

  const handleTempSave = async () => {
    const currentDayStaff = selectedStaffIds.map(id => {
      const s = employees.find(e => e.id === id);
      return { date: currentEditDate, id: s.id, name: s.name, phone: s.phone, positions: staffPositions[id] || [],
        workStart: staffTimes[id]?.start || startTime, workEnd: staffTimes[id]?.end || endTime, pay: staffPay[id] || "0" };
    });
    const updatedTotalStaff = [...allAssignedData.filter(s => s.date !== currentEditDate), ...currentDayStaff];
    try {
      await axios.post(`${API_BASE_URL}/events`, { id: initialData?.id || Date.now().toString(), title: title || "제목 없음(임시저장)",
        startDate: dateList[0], endDate: dateList[dateList.length - 1], assignedStaff: updatedTotalStaff, status: "draft" });
      alert("임시 저장되었습니다."); onSaveSuccess();
    } catch (err) { alert("임시 저장 실패"); }
  };

  const dateList = getDatesInRange(selectionInfo.startStr, selectionInfo.endStr);
  const currentEditDate = dateList[currentIndex];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, posRes] = await Promise.all([axios.get(`${API_BASE_URL}/employees`), axios.get(`${API_BASE_URL}/positions`)]);
        setEmployees(empRes.data); setPositions(posRes.data.map(p => p.name));
      } catch (err) { console.error("데이터 로드 실패:", err); }
    };
    fetchData();
    if (initialData || allAssignedData.length > 0) {
      const todayStaffs = allAssignedData.filter(s => s.date === currentEditDate);
      const ids = [], pays = { ...staffPay }, pos = { ...staffPositions }, times = { ...staffTimes };
      todayStaffs.forEach(s => { ids.push(s.id); pays[s.id] = s.pay; pos[s.id] = s.positions || []; times[s.id] = { start: s.workStart, end: s.workEnd }; });
      setSelectedStaffIds(ids); setStaffPay(pays); setStaffPositions(pos); setStaffTimes(times);
    }
  }, [currentEditDate, initialData, allAssignedData]);

  const toggleStaffPosition = (staffId, posName) => {
    setStaffPositions(prev => {
      const cur = prev[staffId] || [];
      return { ...prev, [staffId]: cur.includes(posName) ? cur.filter(p => p !== posName) : [...cur, posName] };
    });
  };

  const handleTimeInput = (value, setter) => {
    let d = value.replace(/\D/g, '').slice(0, 4); let hh = d.slice(0, 2), mm = d.slice(2, 4);
    if (hh && parseInt(hh) > 23) hh = '23'; if (mm && parseInt(mm) > 59) mm = '59';
    setter(d.length >= 3 ? `${hh}:${mm}` : hh);
  };

  const toggleStaff = (id) => { selectedStaffIds.includes(id) ? setSelectedStaffIds(selectedStaffIds.filter(i => i !== id)) : setSelectedStaffIds([...selectedStaffIds, id]); };

  const handleStepNext = async () => {
    if (!title) return alert("제목을 확인하세요.");
    const currentDayStaff = selectedStaffIds.map(id => {
      const s = employees.find(e => e.id === id);
      return { date: currentEditDate, id: s.id, name: s.name, phone: s.phone, positions: staffPositions[id] || [],
        workStart: staffTimes[id]?.start || startTime, workEnd: staffTimes[id]?.end || endTime, pay: staffPay[id] || "0" };
    });
    const updatedTotalStaff = [...allAssignedData.filter(s => s.date !== currentEditDate), ...currentDayStaff];
    if (currentIndex < dateList.length - 1) { setAllAssignedData(updatedTotalStaff); setCurrentIndex(prev => prev + 1); setSelectedStaffIds([]); }
    else { try { await axios.post(`${API_BASE_URL}/events`, { id: initialData?.id || Date.now().toString(), title, startDate: dateList[0], endDate: dateList[dateList.length - 1], assignedStaff: updatedTotalStaff }); onSaveSuccess(); } catch (err) { alert("저장 실패"); } }
  };

  const handleStaffTimeChange = (staffId, field, value) => {
    let digits = value.replace(/\D/g, '').slice(0, 4);
    setStaffTimes(prev => ({ ...prev, [staffId]: { ...(prev[staffId] || { start: startTime.replace(':', ''), end: endTime.replace(':', '') }), [field]: digits } }));
  };

  return (
    <div className={`fixed inset-0 ${theme.overlay} z-[100] flex items-center justify-center p-3`}>
      <div className={`${theme.modal} w-full h-full flex overflow-hidden`}>
        {/* 왼쪽: 설정 */}
        <div className={`w-2/5 p-5 border-r ${theme.divider} overflow-y-auto bg-gray-50/50`}>
          <div className="mb-5">
            <p className="text-[11px] font-medium text-blue-600 mb-1 tracking-wide">{currentEditDate} 설정</p>
            <input className={`text-lg font-semibold bg-transparent border-b ${theme.divider} w-full pb-1.5 outline-none focus:border-blue-500 mb-4 ${theme.text.primary}`}
              placeholder="행사 제목 입력" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" className={`px-3 py-2 text-sm text-center ${theme.input} font-medium`} value={startTime} onChange={(e) => handleTimeInput(e.target.value, setStartTime)} maxLength={5} />
              <input type="text" className={`px-3 py-2 text-sm text-center ${theme.input} font-medium`} value={endTime} onChange={(e) => handleTimeInput(e.target.value, setEndTime)} maxLength={5} />
            </div>
          </div>

          {/* 검색/필터 */}
          <div className="flex gap-1.5 mb-3">
            <div className="relative flex-1">
              <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${theme.text.muted}`} size={13} />
              <input className={`w-full pl-8 pr-3 py-2 ${theme.input} text-xs`} placeholder="직원 검색" value={searchName} onChange={(e) => setSearchName(e.target.value)} />
            </div>
            <div className="relative">
              <button onClick={() => { setIsProvinceOpen(!isProvinceOpen); setIsCityOpen(false); }}
                className={`px-2.5 py-2 rounded-lg text-xs font-medium flex items-center gap-1 ${selectedProvince !== "모든 주" ? theme.btnPrimary : theme.btnSecondary}`}>
                <span className="truncate max-w-[60px]">{selectedProvince}</span>
                <ChevronDown size={11} className={isProvinceOpen ? 'rotate-180' : ''} />
              </button>
              {isProvinceOpen && (
                <div className={`absolute top-full right-0 mt-1 w-36 ${theme.dropdownBg} rounded-lg z-50 py-1 max-h-48 overflow-y-auto`}>
                  <button onClick={() => { setSelectedProvince("모든 주"); setSelectedCity("전체 보기"); setIsProvinceOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${theme.text.secondary}`}>모든 주</button>
                  {provinces.map((p, idx) => (
                    <button key={idx} onClick={() => { setSelectedProvince(p.provinceName); setSelectedCity("전체 보기"); setIsProvinceOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${theme.text.secondary}`}>{p.provinceName}</button>
                  ))}
                </div>
              )}
            </div>
            {selectedProvince !== "모든 주" && (
              <div className="relative">
                <button onClick={() => { setIsCityOpen(!isCityOpen); setIsProvinceOpen(false); }}
                  className="px-2.5 py-2 bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1">
                  <span className="truncate max-w-[60px]">{selectedCity}</span>
                  <ChevronDown size={11} className={isCityOpen ? 'rotate-180' : ''} />
                </button>
                {isCityOpen && (
                  <div className={`absolute top-full right-0 mt-1 w-36 ${theme.dropdownBg} rounded-lg z-40 py-1 max-h-48 overflow-y-auto`}>
                    <button onClick={() => { setSelectedCity("전체 보기"); setIsCityOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${theme.text.secondary}`}>전체 보기</button>
                    {cities.filter(c => c.provinceName === selectedProvince && c.cityName !== `${selectedProvince} 전체`).map((c, idx) => (
                      <button key={idx} onClick={() => { setSelectedCity(c.cityName); setIsCityOpen(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${theme.text.secondary}`}>
                        {c.cityName.replace(`${selectedProvince} `, "")}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 직원 리스트 */}
          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
            {filteredStaffList.map(staff => (
              <div key={staff.id} onClick={() => toggleStaff(staff.id)}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  selectedStaffIds.includes(staff.id) ? `border-blue-400 bg-blue-50/50 ${theme.card}` : `border-transparent ${theme.card}`
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${selectedStaffIds.includes(staff.id) ? "bg-blue-600" : "bg-gray-300"}`}>
                      {staff.name.charAt(0)}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${theme.text.primary}`}>{staff.name}</p>
                      <p className={`text-[11px] ${theme.text.muted}`}>{staff.phone || "010-0000-0000"}</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedStaffIds.includes(staff.id) ? "bg-blue-600 border-blue-600" : "border-gray-300"
                  }`}>
                    {selectedStaffIds.includes(staff.id) && <Check size={11} className="text-white" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 오른쪽: 배정 현황 */}
        <div className="flex-1 flex flex-col p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-sm font-semibold ${theme.text.primary} flex items-center gap-2`}>
              <UsersIcon className="text-blue-600" size={16} /> {currentEditDate} 배정 현황
            </h3>
            <button onClick={onClose} className={`p-1.5 ${theme.btnSecondary} rounded-md`}><X size={16}/></button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {selectedStaffIds.map(id => {
              const staff = employees.find(e => e.id === id);
              return (
                <div key={id} className={`${theme.card} p-4 flex items-center gap-4 flex-wrap`}>
                  <div className="flex items-center gap-3 min-w-[140px]">
                    <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">{staff?.name.charAt(0)}</div>
                    <div>
                      <p className={`text-sm font-medium ${theme.text.primary}`}>{staff?.name}</p>
                      <p className={`text-[11px] ${theme.text.muted}`}>{staff?.phone}</p>
                    </div>
                  </div>

                  <div className={`flex flex-col items-end px-3 border-l ${theme.divider}`}>
                    <span className="text-[9px] font-medium text-blue-500 uppercase">Pay</span>
                    <div className="flex items-center gap-1">
                      <input type="text" className={`w-20 text-right bg-transparent border-b ${theme.divider} focus:border-blue-500 outline-none text-sm font-medium`}
                        value={staffPay[id] || ""} onChange={(e) => setStaffPay({ ...staffPay, [id]: formatPay(e.target.value) })} />
                      <span className={`text-xs ${theme.text.muted}`}>원</span>
                    </div>
                  </div>

                  <div className={`px-3 border-l ${theme.divider}`}>
                    <p className={`text-[9px] font-medium ${theme.text.muted} uppercase mb-1`}>포지션</p>
                    <div className="flex flex-wrap gap-1">
                      {positions.map(pos => (
                        <button key={pos} onClick={() => toggleStaffPosition(id, pos)}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                            (staffPositions[id] || []).includes(pos) ? theme.btnPrimary : theme.btnSecondary
                          }`}>{pos}</button>
                      ))}
                    </div>
                  </div>

                  <div className={`flex items-center gap-1.5 px-3 border-l ${theme.divider}`}>
                    <input type="text" className={`w-14 text-center text-xs font-medium bg-transparent border-b ${theme.divider} focus:border-blue-500 outline-none`}
                      value={formatInputTime(staffTimes[id]?.start !== undefined ? staffTimes[id].start : startTime)}
                      onChange={(e) => handleStaffTimeChange(id, 'start', e.target.value)} maxLength={5}/>
                    <span className={`text-xs ${theme.text.muted}`}>~</span>
                    <input type="text" className={`w-14 text-center text-xs font-medium bg-transparent border-b ${theme.divider} focus:border-blue-500 outline-none`}
                      value={formatInputTime(staffTimes[id]?.end !== undefined ? staffTimes[id].end : endTime)}
                      onChange={(e) => handleStaffTimeChange(id, 'end', e.target.value)} maxLength={5}/>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`mt-4 pt-4 border-t ${theme.divider} flex justify-end items-center gap-2`}>
            <button onClick={onClose} className={`px-3 py-2 text-xs font-medium ${theme.text.muted}`}>취소</button>
            <button onClick={handleTempSave} className="px-4 py-2 bg-amber-400 text-white rounded-lg text-xs font-medium hover:bg-amber-500 transition-colors">임시 저장</button>
            <button onClick={handleStepNext} className={`px-5 py-2 ${theme.btnPrimary} text-xs font-medium`}>
              {currentIndex < dateList.length - 1 ? "다음 날짜" : "저장 완료"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventAddFullModal;
