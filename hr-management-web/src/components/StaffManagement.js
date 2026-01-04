import React, { useState,useMemo } from 'react';
import { Plus, Edit3, Trash2,ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function StaffManagement({ employees, setIsModalOpen, openEditModal, handleDelete, setSelectedEmployee,setIsBulkModalOpen,provinces = [],cities = [],onRefresh }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isProvinceOpen, setIsProvinceOpen] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState("모든 주");
  const [selectedCity, setSelectedCity] = useState("전체 보기"); 
  const [isCityOpen, setIsCityOpen] = useState(false);
  const { t } = useTranslation();

  const handleProvinceClick = (provinceName) => {
    setSelectedProvince(provinceName);
    setIsProvinceOpen(false); // 선택 후 목록 닫기
  };

  // StaffManagement 컴포넌트 안쪽 상단에 추가
  React.useEffect(() => {
    if (typeof onRefresh === 'function') {
      console.log("직원 관리 페이지 진입: 데이터 리프레시 실행");
      onRefresh(); 
    }
  }, []); // []는 컴포넌트가 처음 나타날 때 딱 한 번 실행됨

    const availableCities = useMemo(() => {
      if (selectedProvince === "모든 주") return [];
      return cities.filter(city => city.provinceName === selectedProvince);
    }, [selectedProvince, cities]);


  const filteredList = employees.filter(emp => {
    // 1. 검색어 필터 (이름, 연락처)
    const matchesSearch = 
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      emp.contact?.includes(searchTerm);

    // 2. 도(Province) 필터링
    const isAllProvince = selectedProvince === "모든 주" || !selectedProvince;
    const matchesProvince = isAllProvince || 
    emp.availableWork?.some(loc => {
      const locString = String(loc);
      // startsWith 대신 includes를 사용하면 중복 데이터에서도 검색이 잘 됩니다.
      return locString.includes(selectedProvince); 
    });

    // 3. 시(City) 필터링
    const isAllCity = !selectedCity || selectedCity === "전체 보기";
    const matchesCity = isAllCity || 
      emp.availableWork?.some(loc => {
        const locString = String(loc);
        // "경기도 안산시"에서 "안산시"가 포함되어 있는지 확인
        return locString.includes(selectedCity);
      });

    return matchesSearch && matchesProvince && matchesCity;
  });
  
  return (
    <div className="animate-in fade-in duration-500">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800">{t('staff_management.header_title')}</h2>
          <p className="text-slate-400 font-mediu<pm mt-1">{t('staff_management.header_subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsBulkModalOpen(true)} 
            className="bg-slate-800 text-white px-6 py-3.5 rounded-2xl flex items-center gap-2 font-bold shadow-xl shadow-slate-200 hover:bg-slate-700 transition-all active:scale-95"
          >
            <Plus size={18} /> 일괄 등록
          </button>

          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-blue-600 text-white px-6 py-3.5 rounded-2xl flex items-center gap-2 font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus size={18} /> {t('staff_management.btn_register')}
          </button>
        </div>
      </header>

      
      {/* 검색창과 지역 선택 리스트를 감싸는 컨테이너 */}
      <div className="space-y-4 mb-8">
        
        {/* 1. 검색창 (기존 유지) */}
        <div className="relative max-w-sm">
          <input 
            type="text" 
            placeholder="이름 또는 연락처 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-5 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>

       {/* 계층형 지역 선택 영역 */}
        <div className="flex gap-4 items-start"> 
          
          {/* [왼쪽] 주(Province) 드롭다운 */}
          <div className="w-64 relative">
            <p className="text-[11px] font-black text-slate-400 ml-2 mb-2 uppercase">지역 선택</p>
            <button 
              onClick={() => {
                setIsProvinceOpen(!isProvinceOpen);
                setIsCityOpen(false); // 다른 드롭다운 닫기
              }}
              className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black flex justify-between items-center shadow-lg"
            >
              {selectedProvince}
              <ChevronDown size={20} className={`transition-transform duration-300 ${isProvinceOpen ? 'rotate-180' : ''}`} />
            </button>

            {isProvinceOpen && (
              <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-30 overflow-hidden">
                <button
                  onClick={() => { setSelectedProvince("모든 주"); setSelectedCity("전체 보기"); setIsProvinceOpen(false); }}
                  className="w-full text-left px-5 py-3.5 text-sm font-bold hover:bg-slate-50 border-b border-slate-50 text-slate-600"
                >
                  모든 주
                </button>
                {provinces.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setSelectedProvince(p.provinceName); setSelectedCity("전체 보기"); setIsProvinceOpen(false); }}
                    className="w-full text-left px-5 py-3.5 text-sm font-bold hover:bg-slate-50 border-b border-slate-50 last:border-none text-slate-600"
                  >
                    {p.provinceName}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* [오른쪽] 시(City) 드롭다운 - 특정 주를 골랐을 때만 렌더링 */}
          {selectedProvince !== "모든 주" && (
            <div className="w-64 relative animate-in fade-in slide-in-from-left-2">
              <p className="text-[11px] font-black text-slate-400 ml-2 mb-2 uppercase">{selectedProvince} 세부 시</p>
              <button 
                onClick={() => {
                  setIsCityOpen(!isCityOpen);
                  setIsProvinceOpen(false); // 다른 드롭다운 닫기
                }}
                className="w-full bg-emerald-500 text-white p-4 rounded-2xl font-black flex justify-between items-center shadow-lg"
              >
                {selectedCity}
                <ChevronDown size={20} className={`transition-transform duration-300 ${isCityOpen ? 'rotate-180' : ''}`} />
              </button>

              {isCityOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-30 overflow-hidden">
                  <button
                    onClick={() => { setSelectedCity("전체 보기"); setIsCityOpen(false); }}
                    className="w-full text-left px-5 py-3.5 text-sm font-bold hover:bg-slate-50 border-b border-slate-50 text-slate-600"
                  >
                    전체 보기
                  </button>
                  {cities
                    .filter(c => 
                      c.provinceName === selectedProvince && 
                      c.cityName !== `${selectedProvince} 전체` // <-- "도이름 전체" 항목 숨기기
                    )
                    .map((c, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setSelectedCity(c.cityName); setIsCityOpen(false); }}
                        className="w-full text-left px-5 py-3.5 text-sm font-bold hover:bg-slate-50 border-b border-slate-50 last:border-none text-slate-600"
                      >
                        {/* 목록 표시할 때도 도 이름을 떼고 시 이름만 깔끔하게 표시 */}
                        {c.cityName.replace(`${selectedProvince} `, "")}
                      </button>
                    ))
                  }
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left table-fixed">
          {/* 테이블 헤더 */}
          <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em]">
            <tr>
              <th className="p-6 w-[35%]">{t('detail.label_contact')}</th>
              <th className="p-6 w-[15%] text-center">{t('modal.label_status')}</th>
              <th className="p-6 w-[40%] text-center">{t('detail.label_region')}</th>
              <th className="p-6 w-[10%] text-right">{t('staff_management.table_th_manage')}</th>
            </tr>
          </thead>

          {/* 테이블 바디 (실제 데이터가 그려지는 곳) */}
          <tbody className="divide-y divide-slate-50">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-20 text-center text-slate-400 font-bold">
                  {(searchTerm || selectedProvince !== "모든 주") 
                    ? "검색 결과가 없습니다." 
                    : t('staff_management.empty_message')}
                </td>
              </tr>
            ) : (
              filteredList.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      {/* 프로필 동그라미 (클릭 시 상세정보 표시) */}
                      <button 
                        onClick={() => setSelectedEmployee(emp)}
                        className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-black text-lg hover:ring-4 hover:ring-blue-50 transition-all shrink-0"
                      >
                        {emp.name?.charAt(0)}
                      </button>
                      <div>
                        <p className="font-extrabold text-lg leading-tight text-slate-800">{emp.name}</p>
                        <p className="text-xs text-slate-400 font-medium mt-1">{emp.contact}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[11px] font-black ${
                      emp.status === '활성' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {emp.status === '활성' ? t('common.status_active') : t('common.status_inactive')}
                    </span>
                  </td>
                  <td className="p-6 text-center">
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {emp.availableWork?.map((region) => {
                        // 1. " 전체" 라는 글자를 제거
                        let displayRegion = region.replace(" 전체", "").trim();

                        // 2. "서울특별시 서울특별시" 처럼 중복된 경우 하나만 표시하도록 처리
                        const parts = displayRegion.split(" ");
                        if (parts.length >= 2 && parts[0] === parts[1]) {
                          // 앞뒤 단어가 같으면 (예: 서울특별시 서울특별시) 뒤의 단어들만 합쳐서 출력
                          displayRegion = parts.slice(1).join(" ");
                        }

                        return (
                          <span 
                            key={region} 
                            className="px-3 py-1 bg-blue-50 text-blue-600 text-[11px] font-bold rounded-full border border-blue-100"
                          >
                            {displayRegion}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditModal(emp)} 
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(emp.id)} 
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StaffManagement;