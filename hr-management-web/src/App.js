import React, { useEffect, useState } from 'react';
import axios from 'axios';
import StaffManagement from './components/StaffManagement';
import EventManager from './components/EventManager';
import BulkEmployeeUpload from './components/BulkEmployeeUpload';
import StaffEvaluation from './components/StaffEvaluation';
import CategoryManager from './components/CategoryManager';
import ApplicationManager from './components/ApplicationManager';
import { Calendar, X, MapPin, ChevronDown, Languages, Users, Star, Settings, Palette, ClipboardList } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from './i18n';
import { ThemeProvider, useTheme } from './ThemeContext';
import { themeKeys } from './themes';

function AppContent() {
  const [activeMenu, setActiveMenu] = useState('staff_management');
  const [employees, setEmployees] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const { t } = useTranslation();
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [activeProvince, setActiveProvince] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { theme, themeName, setTheme, themes } = useTheme();

  const [newEmployee, setNewEmployee] = useState({
    name: '', contact: '', bankName: '', accountNumber: '', residentNumber: '',
    status: '활성', availableWork: []
  });

  const fetchRegions = async () => {
    try {
      const pRes = await axios.get(`${API_URL}/province`);
      setProvinces(pRes.data || []);
      const cRes = await axios.get(`${API_URL}/city`);
      setCities(cRes.data || []);
    } catch (err) { console.error("지역 정보 로드 실패", err); }
  };

  const toggleLanguage = () => {
    const nextLng = i18n.language.includes('ko') ? 'en' : 'ko';
    i18n.changeLanguage(nextLng);
  };

  const API_URL = process.env.REACT_APP_API_BASE_URL;
  const bankOptions = ["국민은행", "신한은행", "우리은행", "하나은행", "기업은행", "농협은행", "카카오뱅크", "토스뱅크", "새마을금고", "신용협동조합", "우체국"];

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API_URL}/employees`);
      setEmployees(res.data);
    } catch (err) { console.error("로딩 실패", err); }
  };

  useEffect(() => { fetchEmployees(); fetchRegions(); }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      if (editingId) {
        await axios.put(`${API_URL}/employees/${editingId}`, newEmployee);
      } else {
        await axios.post(`${API_URL}/employees`, newEmployee);
      }
      alert("성공적으로 저장되었습니다.");
      closeModal();
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.message || "저장 실패");
    } finally {
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
    try { await axios.delete(`${API_URL}/employees/${id}`); fetchEmployees(); } catch (err) { console.error(err); }
  };

  const handleRegionChange = (region) => {
    setNewEmployee(prev => {
      const current = prev.availableWork || [];
      if (current.includes(region)) return { ...prev, availableWork: current.filter(r => r !== region) };
      if (current.length >= 5) { alert("최대 5개 선택 가능"); return prev; }
      return { ...prev, availableWork: [...current, region] };
    });
  };

  const menuItems = [
    { id: 'staff', icon: <Users size={18} />, label: t('sidebar.staff_management') },
    { id: 'events', icon: <Calendar size={18} />, label: t('sidebar.events') },
    { id: 'evaluation', icon: <Star size={18} />, label: t('sidebar.evaluation') || '인력 평가' },
    { id: 'applications', icon: <ClipboardList size={18} />, label: '지원자 관리' },
    { id: 'category', icon: <Settings size={18} />, label: '카테고리 관리' },
  ];

  return (
    <div className={`min-h-screen ${theme.main} flex ${theme.text.primary}`} style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* 사이드바 */}
      <aside className={`w-56 ${theme.sidebar} py-5 px-3 hidden md:flex md:flex-col shrink-0`}>
        <div className="flex items-center justify-between mb-8 px-3">
          <h1 className={`text-sm font-bold tracking-wide ${theme.sidebarTitle}`}>HR Manage</h1>
          <button
            onClick={toggleLanguage}
            className={`p-1.5 rounded-md transition-colors ${theme.sidebarInactive}`}
            title={i18n.language === 'ko' ? 'Switch to English' : '한국어로 변경'}
          >
            <Languages size={14} />
          </button>
        </div>

        <nav className="space-y-0.5 flex-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                activeMenu === item.id ? theme.sidebarActive() : theme.sidebarInactive
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        {/* 테마 전환 */}
        <div className={`mt-auto pt-4 border-t ${themeName === 'modernMinimal' ? 'border-gray-200' : 'border-white/10'}`}>
          <div className="flex items-center gap-1.5 px-3 mb-2">
            <Palette size={12} className={theme.text.muted} />
            <span className={`text-[10px] font-medium uppercase tracking-wider ${theme.text.muted}`}>Theme</span>
          </div>
          <div className="flex gap-1.5 px-3">
            {themeKeys.map((key) => (
              <button
                key={key}
                onClick={() => setTheme(key)}
                className={`flex-1 h-6 rounded-md transition-all ${themes[key].preview} ${
                  themeName === key ? 'ring-2 ring-offset-1 ring-blue-500 scale-105' : 'opacity-50 hover:opacity-80'
                }`}
                title={themes[key].name}
              />
            ))}
          </div>
          <p className={`text-[10px] text-center mt-1.5 ${theme.text.muted}`}>{theme.name}</p>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 p-6 overflow-y-auto">
        {activeMenu === 'staff' && (
          <StaffManagement employees={employees} provinces={provinces} cities={cities}
            setIsModalOpen={setIsModalOpen} openEditModal={openEditModal} handleDelete={handleDelete}
            setSelectedEmployee={setSelectedEmployee} setIsBulkModalOpen={setIsBulkModalOpen}
            onRefresh={() => { fetchEmployees(); fetchRegions(); }} />
        )}
        {activeMenu === 'events' && <EventManager />}
        {activeMenu === 'evaluation' && <StaffEvaluation />}
        {activeMenu === 'applications' && <ApplicationManager />}
        {activeMenu === 'category' && <CategoryManager onRefresh={fetchRegions} />}
      </main>

      {/* 등록/수정 모달 */}
      {isModalOpen && (
        <div className={`fixed inset-0 ${theme.overlay} flex items-center justify-center p-4 z-50`}>
          <div className={`${theme.modal} p-6 w-full max-w-4xl overflow-y-auto max-h-[90vh]`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`text-base font-semibold ${theme.text.primary}`}>{editingId ? "정보 수정" : "신규 등록"}</h3>
              <button onClick={closeModal} className={`p-1.5 ${theme.btnSecondary} rounded-md`}><X size={16} /></button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-xs font-medium ${theme.text.secondary} mb-1 block`}>{t('modal.label_name')}</label>
                    <input required className={`w-full px-3 py-2 text-sm ${theme.input}`} value={newEmployee.name} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} />
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${theme.text.secondary} mb-1 block`}>{t('modal.label_resident')}</label>
                    <input required className={`w-full px-3 py-2 text-sm ${theme.input}`} placeholder="000000-0000000" value={newEmployee.residentNumber} onChange={e => setNewEmployee({...newEmployee, residentNumber: formatResidentNumber(e.target.value)})} maxLength={14} />
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-medium ${theme.text.secondary} mb-1 block`}>{t('modal.label_contact')}</label>
                  <input required className={`w-full px-3 py-2 text-sm ${theme.input}`} placeholder="010-0000-0000" value={newEmployee.contact} onChange={e => setNewEmployee({...newEmployee, contact: formatPhoneNumber(e.target.value)})} maxLength={13} />
                </div>

                <div>
                  <label className={`text-xs font-medium ${theme.text.secondary} mb-1 block`}>{t('modal.label_bank')}</label>
                  <div className="flex gap-2">
                    <div className="w-[40%] relative">
                      <select required className={`w-full px-3 py-2 text-sm ${theme.input} appearance-none pr-7`} value={newEmployee.bankName} onChange={e => setNewEmployee({...newEmployee, bankName: e.target.value})}>
                        <option value="">{t('modal.placeholder_bank_select')}</option>
                        {bankOptions.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                      <ChevronDown size={14} className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${theme.text.muted} pointer-events-none`} />
                    </div>
                    <input className={`w-[60%] px-3 py-2 text-sm ${theme.input}`} placeholder="계좌번호" value={newEmployee.accountNumber} onChange={e => setNewEmployee({...newEmployee, accountNumber: e.target.value})} />
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting}
                  className={`w-full py-2.5 text-sm font-medium mt-2 ${isSubmitting ? 'bg-gray-300 cursor-not-allowed text-gray-500 rounded-lg' : theme.btnPrimary}`}>
                  {isSubmitting ? "처리 중..." : (editingId ? "수정 완료" : "저장하기")}
                </button>
              </div>

              {/* 근무 지역 */}
              <div className={`p-5 ${theme.card} flex flex-col min-h-[380px]`}>
                <p className={`text-xs font-medium ${theme.text.secondary} mb-3 flex items-center gap-1.5`}>
                  <MapPin size={13} /> {t('modal.label_region')} (최대 5개)
                </p>
                <div className="flex gap-3 flex-1 min-h-0">
                  <div className={`w-1/3 ${theme.card} p-2 overflow-y-auto`}>
                    <p className={`text-[10px] font-medium ${theme.text.muted} mb-2 text-center uppercase`}>도</p>
                    <div className="space-y-0.5">
                      {provinces.map((p, idx) => (
                        <button key={idx} type="button" onClick={() => setActiveProvince(p.provinceName)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                            activeProvince === p.provinceName ? theme.btnPrimary : `hover:bg-gray-50 ${theme.text.secondary}`
                          }`}>
                          {p.provinceName}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={`flex-1 ${theme.card} p-2 overflow-y-auto`}>
                    <p className={`text-[10px] font-medium ${theme.text.muted} mb-2 text-center uppercase`}>시</p>
                    {!activeProvince ? (
                      <div className={`h-full flex items-center justify-center text-xs ${theme.text.muted} text-center`}>도를 선택하세요</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5">
                        {cities.filter(c => c.provinceName === activeProvince).map((c, idx) => {
                          const fullRegionName = `${c.provinceName} ${c.cityName}`;
                          const isSelected = (newEmployee.availableWork || []).includes(fullRegionName);
                          return (
                            <button key={idx} type="button" onClick={() => handleRegionChange(fullRegionName)}
                              className={`py-1.5 px-2 rounded-md text-xs font-medium border transition-all ${
                                isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : `border-gray-200 ${theme.text.muted} hover:border-blue-300`
                              }`}>
                              {c.cityName.replace(`${activeProvince} `, "")}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className={`mt-3 flex flex-wrap gap-1.5 p-2 rounded-lg border border-dashed ${theme.divider} min-h-[36px]`}>
                  {(newEmployee.availableWork || []).length === 0 && <span className={`text-[10px] ${theme.text.muted} m-auto`}>선택된 지역이 없습니다.</span>}
                  {(newEmployee.availableWork || []).map((region) => {
                    let d = region.replace(" 전체", "").trim();
                    const p = d.split(" ");
                    if (p.length === 2 && p[0] === p[1]) d = p[0];
                    return (
                      <span key={region} className={`px-2 py-0.5 ${theme.badge.info} rounded text-[11px] font-medium flex items-center gap-1`}>
                        {d}
                        <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => handleRegionChange(region)} />
                      </span>
                    );
                  })}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 직원 상세 */}
      {selectedEmployee && (
        <div className={`fixed inset-0 ${theme.overlay} flex items-center justify-center p-4 z-[60]`}>
          <div className={`${theme.modal} p-6 w-full max-w-sm relative`}>
            <button onClick={() => setSelectedEmployee(null)} className={`absolute right-4 top-4 p-1 ${theme.btnSecondary} rounded-md`}>
              <X size={14} />
            </button>
            <div className="flex flex-col items-center mb-5">
              <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg font-semibold mb-3">
                {selectedEmployee.name?.charAt(0)}
              </div>
              <h3 className={`text-lg font-semibold ${theme.text.primary}`}>{selectedEmployee.name}</h3>
              <span className={`text-xs font-medium ${selectedEmployee.status === '활성' ? 'text-emerald-600' : 'text-rose-500'}`}>
                {selectedEmployee.status === '활성' ? t('common.status_active') : t('common.status_inactive')}
              </span>
            </div>
            <div className={`space-y-3 ${theme.card} p-4 text-sm`}>
              {[
                [t('detail.label_contact'), selectedEmployee.contact],
                [t('detail.label_resident'), selectedEmployee.residentNumber],
                [t('detail.label_account'), `${selectedEmployee.bankName} ${selectedEmployee.accountNumber}`],
              ].map(([label, val]) => (
                <div key={label} className={`flex justify-between items-center border-b ${theme.divider} pb-2`}>
                  <span className={`text-xs ${theme.text.muted}`}>{label}</span>
                  <span className={`font-medium ${theme.text.primary}`}>{val}</span>
                </div>
              ))}
              <div className="pt-1">
                <span className={`text-xs ${theme.text.muted} block mb-1.5`}>{t('detail.label_region')}</span>
                <div className="flex flex-wrap gap-1">
                  {selectedEmployee.availableWork?.map(r => (
                    <span key={r} className={`px-2 py-0.5 ${theme.badge.info} rounded text-[11px] font-medium`}>{r}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isBulkModalOpen && (
        <BulkEmployeeUpload employees={employees} onClose={() => setIsBulkModalOpen(false)} onRefresh={fetchEmployees} API_URL={API_URL} />
      )}
    </div>
  );
}

function App() {
  return <ThemeProvider><AppContent /></ThemeProvider>;
}

export default App;
