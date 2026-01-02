import React, { useEffect, useState } from 'react';
import axios from 'axios';
// 분리한 컴포넌트들을 불러옵니다.
import StaffManagement from './components/StaffManagement';
import EventManager from './components/EventManager';
import BulkEmployeeUpload from './components/BulkEmployeeUpload';
import StaffEvaluation from './components/StaffEvaluation';
import CategoryManager from './components/CategoryManager';
// 아이콘 라이브러리
import { Calendar, X, MapPin, ChevronDown,Languages,Users,Star,Settings } from 'lucide-react';

import { useTranslation } from 'react-i18next';
import i18n from './i18n';


function App() {
  // --- 상태 관리 (State) ---
  const [activeMenu, setActiveMenu] = useState('staff_management'); // 현재 메뉴 ('dashboard' 또는 'events')
  const [employees, setEmployees] = useState([]); // 직원 목록 데이터
  const [isModalOpen, setIsModalOpen] = useState(false); // 등록/수정 모달 열림 상태
  const [editingId, setEditingId] = useState(null); // 수정 중인 직원의 ID
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const { t } = useTranslation();
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [activeProvince, setActiveProvince] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 신규/수정용 직원 데이터 양식
  const [newEmployee, setNewEmployee] = useState({
    name: '', contact: '', bankName: '', accountNumber: '', residentNumber: '', 
    status: '활성', availableWork: [] 
  });

  

  const fetchRegions = async () => {
    try {
      // 주(Province) 목록 가져오기
      const pRes = await axios.get(`${API_URL}/province`);
      // 백엔드 필드명이 provinceName이므로 이를 추출합니다.
      setProvinces(pRes.data || []);

      // 시(City) 목록 가져오기
      const cRes = await axios.get(`${API_URL}/city`);
      setCities(cRes.data || []);
    } catch (err) {
      console.error("지역 정보 로드 실패", err);
    }
  };
    

  const toggleLanguage = () => {
    // i18n.js에서 직접 가져온 인스턴스의 기능을 사용합니다.
    const nextLng = i18n.language.includes('ko') ? 'en' : 'ko';
    i18n.changeLanguage(nextLng);
  };

  const API_URL = process.env.REACT_APP_API_BASE_URL;
  
  // --- 옵션 데이터 ---
  const bankOptions = ["국민은행", "신한은행", "우리은행", "하나은행", "기업은행", "농협은행", "카카오뱅크", "토스뱅크", "새마을금고", "신용협동조합", "우체국"];
  
  

  // --- API 호출 및 데이터 처리 ---
  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API_URL}/employees`);
      setEmployees(res.data);
    } catch (err) { console.error("로딩 실패", err); }
  };

  useEffect(() => { fetchEmployees(); fetchRegions();}, []);

  // 연락처/주민번호 포맷팅 함수 (모달 내부용)
  const formatPhoneNumber = (value) => {
    const num = value.replace(/[^\d]/g, "");
    if (num.length < 4) return num;
    if (num.length < 7) return `${num.slice(0, 3)}-${num.slice(3)}`;
    if (num.length < 11) return `${num.slice(0, 3)}-${num.slice(3, 6)}-${num.slice(6)}`;
    return `${num.slice(0, 3)}-${num.slice(3, 7)}-${num.slice(7, 11)}`;
  };

  const formatResidentNumber = (value) => {
    const num = value.replace(/[^\d]/g, "");
    if (num.length < 7) return num;
    return `${num.slice(0, 6)}-${num.slice(6, 13)}`;
  };

  // --- 이벤트 핸들러 ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 2. 이미 제출 중이면 함수 실행을 차단 (중복 방어)
    if (isSubmitting) return;

    try {
      setIsSubmitting(true); // 제출 시작

      if (editingId) {
        await axios.put(`${API_URL}/employees/${editingId}`, newEmployee);
      } else {
        await axios.post(`${API_URL}/employees`, newEmployee);
      }
      
      alert("성공적으로 저장되었습니다.");
      closeModal();
      fetchEmployees();
    } catch (err) { 
      alert("저장 실패"); 
    } finally {
      // 3. 성공하든 실패하든 마지막에 상태 해제
      setIsSubmitting(false); 
    }
  };

  const openEditModal = (emp) => {
    setEditingId(emp.id);
    setNewEmployee({ ...emp, availableWork: Array.isArray(emp.availableWork) ? emp.availableWork : [] });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setIsSubmitting(false);
    setNewEmployee({ name: '', contact: '', bankName: '', accountNumber: '', residentNumber: '', status: '활성', availableWork: [] });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("정말 삭제할까요?")) return;
    try {
      await axios.delete(`${API_URL}/employees/${id}`);
      fetchEmployees();
    } catch (err) { console.error(err); }
  };

  const handleRegionChange = (region) => {
    setNewEmployee(prev => {
      const current = prev.availableWork || [];
      if (current.includes(region)) return { ...prev, availableWork: current.filter(r => r !== region) };
      if (current.length >= 5) { alert("최대 5개 선택 가능"); return prev; }
      return { ...prev, availableWork: [...current, region] };
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* 1. 사이드바 메뉴 (Side Navigation) */}
      <aside className="w-64 bg-slate-900 text-white p-6 hidden md:block shrink-0 shadow-2xl">
        <div className="flex items-center justify-between mb-10 px-2">
          <h1 className="text-2xl font-black text-blue-400 italic">HR MANAGE</h1>
          
          <button 
            onClick={toggleLanguage} 
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white flex items-center gap-1 group"
            title={i18n.language === 'ko' ? 'Switch to English' : '한국어로 변경'}
          >
            <Languages size={18} />
            <span className="text-[10px] font-bold border border-slate-500 rounded px-1 group-hover:border-white">
              {i18n.language === 'ko' ? 'A' : '가'}
            </span>
          </button>


        </div>

        <nav className="space-y-2">
          <button 
            onClick={() => setActiveMenu('staff')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeMenu === 'staff' ? 'bg-green-600 text-white shadow-lg shadow-green-900/50' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Users size={20} /> {t('sidebar.staff_management')}
          </button>
          <button 
            onClick={() => setActiveMenu('events')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeMenu === 'events' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Calendar size={20} /> {t('sidebar.events')}
          </button>

          <button 
            onClick={() => setActiveMenu('evaluation')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeMenu === 'evaluation' ? 'bg-amber-500 text-white shadow-lg shadow-amber-900/50' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Star size={20} className={activeMenu === 'evaluation' ? "fill-white" : ""} /> 
            {t('sidebar.evaluation') || '인력 평가'}
          </button>

          <button 
            onClick={() => setActiveMenu('category')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeMenu === 'category' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Settings size={20} /> 카테고리 관리
          </button>
        </nav>
      </aside>

      {/* 2. 메인 콘텐츠 (Main View Area) */}
      <main className="flex-1 p-10 overflow-y-auto">
        {/* 현재 메뉴 상태에 따라 다른 컴포넌트를 보여줌 */}
        {activeMenu === 'staff' && (
          <StaffManagement 
            employees={employees} 
            provinces={provinces}  // 추가
            cities={cities}
            setIsModalOpen={setIsModalOpen} 
            openEditModal={openEditModal} 
            handleDelete={handleDelete}
            setSelectedEmployee={setSelectedEmployee}
            setIsBulkModalOpen={setIsBulkModalOpen}
            onRefresh={() => {
              fetchEmployees(); // 직원 목록 새로고침
              fetchRegions();   // 지역 목록 새로고침
            }}
          />
        )}

        {/* 2. 행사 일정 메뉴일 때 */}
        {activeMenu === 'events' && (
          <EventManager />
        )}

        {/* 3. 인력 평가 메뉴일 때 (추가됨) */}
        {activeMenu === 'evaluation' && (
          <StaffEvaluation />
        )}
        {activeMenu === 'category' && (
          <CategoryManager onRefresh={fetchRegions}/>
        )}
      </main>

      {/* 3. 공통 등록/수정 모달 (필요시 컴포넌트 분리 가능) */}
      {isModalOpen && (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
        {/* 모달 너비를 max-w-5xl로 키워서 옆으로 넓게 만듭니다 */}
        <div className="bg-white rounded-[40px] p-10 w-full max-w-5xl shadow-2xl overflow-y-auto max-h-[90vh]">
          
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-black text-slate-800">{editingId ? "정보 수정" : "신규 등록"}</h3>
            <button onClick={closeModal} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            
            {/* [왼쪽 영역] 인적 사항 입력 */}
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 ml-2">{t('modal.label_name')}</label>
                  <input required className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none font-bold" value={newEmployee.name} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 ml-2">{t('modal.label_resident')}</label>
                  <input required className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none font-bold" placeholder="000000-0000000" value={newEmployee.residentNumber} onChange={e => setNewEmployee({...newEmployee, residentNumber: formatResidentNumber(e.target.value)})} maxLength={14} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 ml-2">{t('modal.label_contact')}</label>
                  <input required className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none font-bold" placeholder="010-0000-0000" value={newEmployee.contact} onChange={e => setNewEmployee({...newEmployee, contact: formatPhoneNumber(e.target.value)})} maxLength={13} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 ml-2">{t('modal.label_bank')}</label>
                  <div className="flex gap-2">
                    <div className="w-[40%] relative">
                      <select required className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none font-bold appearance-none pr-8 text-sm" value={newEmployee.bankName} onChange={e => setNewEmployee({...newEmployee, bankName: e.target.value})}>
                        <option value="">{t('modal.placeholder_bank_select')}</option>
                        {bankOptions.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-5 text-slate-400 pointer-events-none" />
                    </div>
                    <input className="w-[60%] p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none font-bold text-sm" placeholder="계좌번호" value={newEmployee.accountNumber} onChange={e => setNewEmployee({...newEmployee, accountNumber: e.target.value})} />
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting} // 4. 제출 중일 때 버튼 비활성화
                className={`w-full py-5 text-white rounded-[24px] text-lg font-black transition-all mt-4 
                  ${isSubmitting 
                    ? 'bg-slate-400 cursor-not-allowed' // 제출 중일 때 회색 디자인
                    : 'bg-blue-600 shadow-lg shadow-blue-200 hover:bg-blue-700'
                  }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    {/* 간단한 로딩 텍스트나 스피너를 넣으면 더 좋습니다 */}
                    <span>처리 중...</span>
                  </div>
                ) : (
                  editingId ? "수정 완료" : "저장하기"
                )}
              </button>
            </div>

            {/* [오른쪽 영역 - 파란색 원 위치] 근무 지역 선택 */}
            <div className="p-8 bg-slate-50 rounded-[40px] border border-slate-100 flex flex-col h-full min-h-[450px]">
              <p className="text-[11px] font-black text-slate-400 uppercase mb-4 flex items-center gap-2">
                <MapPin size={14} /> {t('modal.label_region')} (최대 5개)
              </p>

              <div className="flex gap-4 flex-1 min-h-0">
                {/* 도 선택 */}
                <div className="w-1/3 bg-white rounded-3xl p-3 overflow-y-auto border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-300 mb-3 text-center uppercase">근무지역 도</p>
                  <div className="space-y-1">
                    {provinces.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveProvince(p.provinceName)}
                        className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-black transition-all ${
                          activeProvince === p.provinceName ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-500'
                        }`}
                      >
                        {p.provinceName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 시 선택 */}
                <div className="flex-1 bg-white rounded-3xl p-3 overflow-y-auto border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-300 mb-3 text-center uppercase">근무지역 시</p>
                  {!activeProvince ? (
                    <div className="h-full flex items-center justify-center text-[11px] text-slate-300 font-bold text-center px-4 italic">
                      왼쪽에서 '도'를 먼저 선택하세요
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {cities.filter(c => c.provinceName === activeProvince).map((c, idx) => {
                        const fullRegionName = `${c.provinceName} ${c.cityName}`;
                        const isSelected = (newEmployee.availableWork || []).includes(fullRegionName);
                        const displayCityName = c.cityName.replace(`${activeProvince} `, "");
                        return (
                          

                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleRegionChange(fullRegionName)}
                            className={`py-3 px-2 rounded-2xl text-[11px] font-black border-2 transition-all ${
                              isSelected ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'
                            }`}
                          >
                            {displayCityName}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 선택된 지역 태그 */}
              <div className="mt-4 flex flex-wrap gap-2 p-2 bg-white/50 rounded-2xl border border-dashed border-slate-200 min-h-[50px]">
                {(newEmployee.availableWork || []).length === 0 && <span className="text-[10px] text-slate-300 m-auto">선택된 지역이 없습니다.</span>}
                {(newEmployee.availableWork || []).map((region) => {
                  const words = region.split(" ");
                  const uniqueWords = [...new Set(words)];
                  const displayRegion = uniqueWords.join(" ");

                  return (
                    <span 
                      key={region} 
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black flex items-center gap-1 border border-blue-100">
                      {displayRegion}
                      
                      <X 
                        size={12} 
                        className="cursor-pointer hover:text-red-500" 
                        onClick={() => handleRegionChange(region)} 
                      />
                    </span>
                  );
                })}
              </div>
            </div>

          </form>
        </div>
      </div>
    )}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-[60]">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-md shadow-2xl relative animate-in zoom-in duration-200">
            <button 
              onClick={() => setSelectedEmployee(null)} 
              className="absolute right-6 top-6 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="flex flex-col items-center mb-8">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-4xl font-black mb-4 shadow-xl shadow-blue-100">
                {selectedEmployee.name?.charAt(0)}
              </div>
              <h3 className="text-3xl font-black text-slate-800">{selectedEmployee.name}</h3>
              <p className="text-blue-600 font-bold">
                {selectedEmployee.status === '활성' ? t('common.status_active') : t('common.status_inactive')} {t('detail.member_suffix')}
              </p>
            </div>

            <div className="space-y-4 bg-slate-50 p-6 rounded-[30px] border border-slate-100">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-xs font-black text-slate-400 uppercase">{t('detail.label_contact')}</span>
                <span className="font-bold text-slate-700">{selectedEmployee.contact}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-xs font-black text-slate-400 uppercase">{t('detail.label_resident')}</span>
                <span className="font-bold text-slate-700">{selectedEmployee.residentNumber}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-xs font-black text-slate-400 uppercase">{t('detail.label_account')}</span>
                <span className="font-bold text-slate-700">{selectedEmployee.bankName} {selectedEmployee.accountNumber}</span>
              </div>
              <div className="pt-2">
                <span className="text-xs font-black text-slate-400 uppercase block mb-2">{t('detail.label_region')}</span>
                <div className="flex flex-wrap gap-1">
                  {selectedEmployee.availableWork?.map(region => (
                    <span key={region} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-600">
                      {region}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 일괄 등록 모달 조건부 렌더링 */}
      {isBulkModalOpen && (
        <BulkEmployeeUpload 
          employees={employees}
          onClose={() => setIsBulkModalOpen(false)} 
          onRefresh={fetchEmployees}
          API_URL={API_URL}
        />
      )}
    </div>
  );
}

export default App;