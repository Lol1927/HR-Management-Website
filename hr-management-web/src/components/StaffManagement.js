import React, { useState, useMemo } from 'react';
import { Plus, Edit3, Trash2, ChevronDown, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../ThemeContext';

function StaffManagement({ employees, setIsModalOpen, openEditModal, handleDelete, setSelectedEmployee, setIsBulkModalOpen, provinces = [], cities = [], onRefresh }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isProvinceOpen, setIsProvinceOpen] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState("모든 지역");
  const [selectedCity, setSelectedCity] = useState("전체 보기");
  const [isCityOpen, setIsCityOpen] = useState(false);
  const { t } = useTranslation();
  const { theme } = useTheme();

  React.useEffect(() => {
    if (typeof onRefresh === 'function') onRefresh();
  }, []);

  const filteredList = employees.filter(emp => {
    const matchesSearch = emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) || emp.contact?.includes(searchTerm);
    const isAllProvince = selectedProvince === "모든 지역" || !selectedProvince;
    const matchesProvince = isAllProvince || emp.availableWork?.some(loc => String(loc).includes(selectedProvince));
    const isAllCity = !selectedCity || selectedCity === "전체 보기";
    const matchesCity = isAllCity || emp.availableWork?.some(loc => String(loc).includes(selectedCity));
    return matchesSearch && matchesProvince && matchesCity;
  });

  return (
    <div>
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className={`text-lg font-semibold ${theme.text.primary}`}>{t('staff_management.header_title')}</h2>
          <p className={`text-xs ${theme.text.muted} mt-0.5`}>{t('staff_management.header_subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsBulkModalOpen(true)}
            className={`${theme.btnSecondary} px-3 py-2 text-xs font-medium flex items-center gap-1.5`}>
            <Plus size={14} /> 일괄 등록
          </button>
          <button onClick={() => setIsModalOpen(true)}
            className={`${theme.btnPrimary} px-3 py-2 text-xs font-medium flex items-center gap-1.5`}>
            <Plus size={14} /> {t('staff_management.btn_register')}
          </button>
        </div>
      </div>

      {/* 필터 영역 */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative">
          <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme.text.muted}`} />
          <input type="text" placeholder="이름 또는 연락처 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-56 pl-8 pr-3 py-2 text-xs ${theme.input}`} />
        </div>

        {/* Province 드롭다운 */}
        <div className="relative">
          <button onClick={() => { setIsProvinceOpen(!isProvinceOpen); setIsCityOpen(false); }}
            className={`${theme.btnSecondary} pl-3 pr-2 py-2 text-xs font-medium flex items-center gap-2 min-w-[120px]`}>
            {selectedProvince}
            <ChevronDown size={13} className={`transition-transform ${isProvinceOpen ? 'rotate-180' : ''}`} />
          </button>
          {isProvinceOpen && (
            <div className={`absolute top-full left-0 mt-1 w-48 ${theme.dropdownBg} rounded-lg z-30 overflow-hidden py-1`}>
              <button onClick={() => { setSelectedProvince("모든 지역"); setSelectedCity("전체 보기"); setIsProvinceOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 ${theme.text.secondary}`}>모든 지역</button>
              {provinces.map((p, idx) => (
                <button key={idx} onClick={() => { setSelectedProvince(p.provinceName); setSelectedCity("전체 보기"); setIsProvinceOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 ${theme.text.secondary}`}>{p.provinceName}</button>
              ))}
            </div>
          )}
        </div>

        {/* City 드롭다운 */}
        {selectedProvince !== "모든 지역" && (
          <div className="relative">
            <button onClick={() => { setIsCityOpen(!isCityOpen); setIsProvinceOpen(false); }}
              className={`${theme.btnSecondary} pl-3 pr-2 py-2 text-xs font-medium flex items-center gap-2 min-w-[120px]`}>
              {selectedCity}
              <ChevronDown size={13} className={`transition-transform ${isCityOpen ? 'rotate-180' : ''}`} />
            </button>
            {isCityOpen && (
              <div className={`absolute top-full left-0 mt-1 w-48 ${theme.dropdownBg} rounded-lg z-30 overflow-hidden py-1`}>
                <button onClick={() => { setSelectedCity("전체 보기"); setIsCityOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 ${theme.text.secondary}`}>전체 보기</button>
                {cities.filter(c => c.provinceName === selectedProvince && c.cityName !== `${selectedProvince} 전체`).map((c, idx) => (
                  <button key={idx} onClick={() => { setSelectedCity(c.cityName); setIsCityOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 ${theme.text.secondary}`}>
                    {c.cityName.replace(`${selectedProvince} `, "")}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 테이블 */}
      <div className={theme.table}>
        <table className="w-full text-left">
          <thead className={`${theme.tableHeader} text-[11px] font-medium uppercase tracking-wider`}>
            <tr>
              <th className="px-4 py-3">{t('detail.label_contact')}</th>
              <th className="px-4 py-3 text-center w-24">{t('modal.label_status')}</th>
              <th className="px-4 py-3 text-center">{t('detail.label_region')}</th>
              <th className="px-4 py-3 text-right w-20">{t('staff_management.table_th_manage')}</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${theme.divider}`}>
            {filteredList.length === 0 ? (
              <tr><td colSpan="4" className={`py-16 text-center text-sm ${theme.text.muted}`}>
                {(searchTerm || selectedProvince !== "모든 지역") ? "검색 결과가 없습니다." : t('staff_management.empty_message')}
              </td></tr>
            ) : (
              filteredList.map((emp) => (
                <tr key={emp.id} className={`${theme.tableRow} group`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSelectedEmployee(emp)}
                        className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-xs hover:ring-2 hover:ring-blue-100 transition-all shrink-0">
                        {emp.name?.charAt(0)}
                      </button>
                      <div>
                        <p className={`text-sm font-medium ${theme.text.primary}`}>{emp.name}</p>
                        <p className={`text-[11px] ${theme.text.muted}`}>{emp.contact}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${emp.status === '활성' ? theme.badge.active : theme.badge.inactive}`}>
                      {emp.status === '활성' ? t('common.status_active') : t('common.status_inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {emp.availableWork?.map((region) => {
                        let d = region.replace(" 전체", "").trim();
                        const parts = d.split(" ");
                        if (parts.length >= 2 && parts[0] === parts[1]) d = parts.slice(1).join(" ");
                        return <span key={region} className={`px-2 py-0.5 ${theme.badge.info} text-[10px] font-medium rounded`}>{d}</span>;
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(emp)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"><Edit3 size={14} /></button>
                      <button onClick={() => handleDelete(emp.id)} className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"><Trash2 size={14} /></button>
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
