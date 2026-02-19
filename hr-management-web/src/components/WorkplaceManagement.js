import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Trash2, Check, X, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../ThemeContext';

function WorkplaceManagement({ API_URL, onRefresh }) {
  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newProvinceName, setNewProvinceName] = useState("");
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [newCityName, setNewCityName] = useState("");
  const [targetProvinceName, setTargetProvinceName] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { theme } = useTheme();

  const fetchData = async () => {
    if (!API_URL) return;
    setLoading(true);
    try {
      const [provRes, cityRes] = await Promise.all([axios.get(`${API_URL}/province`), axios.get(`${API_URL}/city`)]);
      setProvinces(provRes.data.map(p => ({ ...p, cities: cityRes.data.filter(c => c.provinceName === p.provinceName) })));
    } catch (err) { console.error("데이터 로딩 실패:", err); alert("데이터를 불러오는데 실패했습니다."); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [API_URL]);

  const addProvince = async () => {
    if (!newProvinceName.trim()) return;
    try {
      const res = await axios.post(`${API_URL}/province`, { provinceName: newProvinceName });
      if (res.data.error) { alert(res.data.error); return; }
      await axios.post(`${API_URL}/city`, { cityName: `${newProvinceName} 전체`, provinceName: newProvinceName });
      await fetchData(); if (onRefresh) await onRefresh();
      setNewProvinceName(""); setIsAdding(false);
    } catch (err) { alert("도 등록 중 오류가 발생했습니다."); }
  };

  const deleteProvince = async (name) => {
    const target = provinces.find(p => p.provinceName === name);
    setDeleteTarget({ name, count: target?.cities?.length || 0, cities: target?.cities || [] });
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setLoading(true); setIsDeleteModalOpen(false);
      await Promise.all(deleteTarget.cities.map(c => axios.delete(`${API_URL}/city/delete/${encodeURIComponent(c.provinceName)}/${encodeURIComponent(c.cityName)}`)));
      await axios.delete(`${API_URL}/province/${encodeURIComponent(deleteTarget.name)}`);
      await fetchData(); if (onRefresh) await onRefresh(); setDeleteTarget(null);
    } catch (err) { alert("삭제 중 오류가 발생했습니다."); }
    finally { setLoading(false); }
  };

  const handleCitySubmit = async () => {
    if (!newCityName.trim()) return;
    try {
      const res = await axios.post(`${API_URL}/city`, { cityName: newCityName.trim(), provinceName: targetProvinceName });
      if (res.data.error) { alert(res.data.error); }
      else { await fetchData(); if (onRefresh) await onRefresh(); setNewCityName(""); setIsCityModalOpen(false); }
    } catch (err) { alert("이미 등록된 지역이거나 등록 중 오류가 발생했습니다."); }
  };

  const deleteCity = async (city) => {
    if (!window.confirm(`'${city.cityName}'을(를) 삭제하시겠습니까?`)) return;
    try {
      await axios.delete(`${API_URL}/city/delete/${encodeURIComponent(city.provinceName)}/${encodeURIComponent(city.cityName)}`);
      await fetchData(); if (onRefresh) await onRefresh();
    } catch (err) { alert("시 삭제 실패"); }
  };

  if (loading) return (
    <div className={`flex flex-col items-center justify-center py-12 ${theme.text.muted}`}>
      <Loader2 className="animate-spin mb-2" size={24} />
      <p className="text-xs font-medium">데이터를 동기화 중입니다...</p>
    </div>
  );

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-sm font-semibold ${theme.text.primary} flex items-center gap-1.5`}>
          <MapPin size={14} className="text-blue-500" /> 근무지역 목록
        </h3>
        <button onClick={() => setIsAdding(true)}
          className={`flex items-center gap-1.5 ${theme.btnPrimary} px-3 py-1.5 text-xs font-medium`}>
          <Plus size={14} /> 도 추가
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {isAdding && (
          <div className={`${theme.card} border-2 border-dashed border-blue-300 p-4`}>
            <div className={`flex items-center justify-between gap-2 border-b ${theme.divider} pb-2 mb-2`}>
              <input autoFocus type="text" placeholder="도 이름 입력"
                className={`text-sm font-medium ${theme.text.primary} outline-none w-full bg-transparent`}
                value={newProvinceName} onChange={(e) => setNewProvinceName(e.target.value)} />
              {newProvinceName.trim() && (
                <button onClick={addProvince} className="text-blue-600 bg-blue-50 p-1 rounded"><Check size={14} /></button>
              )}
              <button onClick={() => setIsAdding(false)} className={theme.text.muted}><X size={14} /></button>
            </div>
          </div>
        )}

        {provinces.map((province) => (
          <div key={province.provinceName} className={`${theme.regionCard} rounded-xl overflow-hidden`}>
            <div className={`${theme.regionCardHeader} px-4 py-2.5 flex justify-between items-center`}>
              <span className={`font-semibold ${theme.text.primary} text-sm`}>{province.provinceName}</span>
              <div className="flex gap-1.5">
                <button onClick={() => { setTargetProvinceName(province.provinceName); setIsCityModalOpen(true); }}
                  className="w-6 h-6 bg-blue-600 text-white rounded-md flex items-center justify-center hover:bg-blue-700 transition-colors">
                  <Plus size={13} />
                </button>
                <button onClick={() => deleteProvince(province.provinceName)}
                  className="text-gray-300 hover:text-rose-500 transition-colors p-0.5">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <div className="px-4 py-3 flex flex-wrap gap-1.5">
              {province.cities?.map(city => {
                if (city.cityName === `${province.provinceName} 전체`) return null;
                return (
                  <span key={city.cityName}
                    className={`group relative ${theme.badge.info} pl-2.5 pr-7 py-1 rounded-md text-xs font-medium`}>
                    {city.cityName.replace(province.provinceName + " ", "")}
                    <button onClick={() => deleteCity(city)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                      <X size={11} />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 시 추가 모달 */}
      {isCityModalOpen && (
        <div className={`fixed inset-0 ${theme.overlay} z-50 flex items-center justify-center p-4`}>
          <div className={`${theme.modal} w-full max-w-xs overflow-hidden`}>
            <div className="p-5">
              <h4 className={`text-sm font-semibold ${theme.text.primary} mb-3`}>[{targetProvinceName}] 시 추가</h4>
              <input autoFocus type="text" placeholder="시 이름 입력 (예: 수원시)"
                className={`w-full ${theme.input} px-3 py-2 text-sm`}
                value={newCityName} onChange={(e) => setNewCityName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCitySubmit()} />
            </div>
            <div className={`flex border-t ${theme.divider}`}>
              <button onClick={() => setIsCityModalOpen(false)} className={`flex-1 py-2.5 text-xs ${theme.text.muted} font-medium`}>취소</button>
              <button onClick={handleCitySubmit} className="flex-1 py-2.5 text-xs text-blue-600 font-semibold">추가</button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {isDeleteModalOpen && (
        <div className={`fixed inset-0 ${theme.overlay} z-[100] flex items-center justify-center p-4`}>
          <div className={`${theme.modal} w-full max-w-xs overflow-hidden`}>
            <div className="p-5 text-center">
              <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 size={18} />
              </div>
              <h4 className={`text-sm font-semibold ${theme.text.primary} mb-2`}>정말 삭제하시겠습니까?</h4>
              <p className={`${theme.text.secondary} text-xs leading-relaxed`}>
                <span className="text-rose-600 font-semibold">[{deleteTarget?.name}]</span>를 삭제하면
                소속된 모든 지역 <span className="font-semibold">({deleteTarget?.count}개)</span>도 함께 삭제됩니다.
              </p>
            </div>
            <div className={`flex border-t ${theme.divider}`}>
              <button onClick={() => setIsDeleteModalOpen(false)}
                className={`flex-1 py-2.5 text-xs ${theme.text.muted} font-medium hover:bg-gray-50 transition-colors`}>취소</button>
              <button onClick={confirmDelete}
                className="flex-1 py-2.5 text-xs bg-rose-500 text-white font-semibold hover:bg-rose-600 transition-colors">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkplaceManagement;
