import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Trash2, Check, X, Loader2 } from 'lucide-react';
import axios from 'axios';

function WorkplaceManagement({ API_URL }) {
  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 상태 관리
  const [isAdding, setIsAdding] = useState(false);
  const [newProvinceName, setNewProvinceName] = useState("");
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [newCityName, setNewCityName] = useState("");
  const [targetProvinceName, setTargetProvinceName] = useState("");

  // 1. 데이터 불러오기 (GET)
  const fetchData = async () => {
    if (!API_URL) {
        console.error("API_URL이 정의되지 않았습니다.");
        return;
    }
    setLoading(true);
    try {
      // 도(Province)와 시(City) 데이터를 동시에 가져옵니다.
      const [provRes, cityRes] = await Promise.all([
        axios.get(`${API_URL}/province`),
        axios.get(`${API_URL}/city`)
      ]);

      const provData = provRes.data; // [{provinceName: "강원도"}, ...]
      const cityData = cityRes.data; // [{cityName: "강릉시", provinceName: "강원도"}, ...]

      // 도 데이터에 속한 시 데이터를 매칭시켜서 저장
      const combined = provData.map(p => ({
        ...p,
        cities: cityData.filter(c => c.provinceName === p.provinceName)
      }));

      setProvinces(combined);
    } catch (err) {
      console.error("데이터 로딩 실패:", err);
      alert("데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [API_URL]);

  // 2. 도(Province) 추가 (POST)
  const addProvince = async () => {
    if (!newProvinceName.trim()) return;
    try {
      const res = await axios.post(`${API_URL}/province`, { provinceName: newProvinceName });
      if (res.data.error) {
        alert(res.data.error);
      } else {
        await fetchData(); // 목록 갱신
        setNewProvinceName("");
        setIsAdding(false);
      }
    } catch (err) {
      alert("도 등록 중 오류가 발생했습니다.");
    }
  };

  // 3. 도(Province) 삭제 (DELETE)
  const deleteProvince = async (name) => {
    if (!window.confirm(`'${name}'를 삭제하시겠습니까? 관련 도시 데이터는 따로 삭제해야 합니다.`)) return;
    try {
      await axios.delete(`${API_URL}/province/${encodeURIComponent(name)}`);
      await fetchData();
    } catch (err) {
      alert("삭제 실패");
    }
  };

  // 4. 시(City) 추가 (POST)
  const handleCitySubmit = async () => {
    if (!newCityName.trim()) return;
    try {
      const res = await axios.post(`${API_URL}/city`, { 
        cityName: newCityName,
        provinceName: targetProvinceName 
      });
      if (res.data.error) {
        alert(res.data.error);
      } else {
        await fetchData();
        setNewCityName("");
        setIsCityModalOpen(false);
      }
    } catch (err) {
      alert("시 등록 중 오류 발생");
    }
  };

  // 5. 시(City) 삭제 (DELETE)
  const deleteCity = async (cityName) => {
    if (!window.confirm(`'${cityName}'을(를) 삭제하시겠습니까?`)) return;
    try {
      await axios.delete(`${API_URL}/city/${encodeURIComponent(cityName)}`);
      await fetchData();
    } catch (err) {
      alert("시 삭제 실패");
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <Loader2 className="animate-spin mb-2" size={40} />
      <p className="font-bold">데이터를 동기화 중입니다...</p>
    </div>
  );

  return (
    <div className="p-6 relative">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <MapPin className="text-blue-500" /> 근무지역 목록
        </h3>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-2xl font-black hover:bg-slate-800 transition-all shadow-lg"
        >
          <Plus size={20} /> 도 추가
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isAdding && (
          <div className="bg-white border-2 border-dashed border-blue-400 rounded-[32px] p-6 shadow-xl animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-4 border-b pb-3">
              <input 
                autoFocus
                type="text"
                placeholder="도 이름 입력"
                className="text-lg font-black text-slate-800 outline-none w-full bg-transparent"
                value={newProvinceName}
                onChange={(e) => setNewProvinceName(e.target.value)}
              />
              {newProvinceName.trim() && (
                <button onClick={addProvince} className="text-blue-600 bg-blue-50 p-1 rounded-lg">
                  <Check size={20} />
                </button>
              )}
              <button onClick={() => setIsAdding(false)} className="text-slate-400"><X size={20} /></button>
            </div>
          </div>
        )}

        {provinces.map((province) => (
          <div key={province.provinceName} className="bg-white border border-slate-100 rounded-[32px] shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-b border-slate-100">
              <span className="font-black text-slate-700 text-lg">{province.provinceName}</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setTargetProvinceName(province.provinceName); setIsCityModalOpen(true); }}
                  className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                >
                  <Plus size={18} />
                </button>
                <button onClick={() => deleteProvince(province.provinceName)} className="text-slate-300 hover:text-rose-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="p-6 flex flex-wrap gap-2">
              {province.cities?.map(city => (
                <span key={city.cityName} className="group relative bg-white border border-slate-200 text-slate-600 pl-4 pr-10 py-2 rounded-xl text-sm font-bold shadow-sm">
                  {city.cityName}
                  <button 
                    onClick={() => deleteCity(city.cityName)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 시 추가 커스텀 모달 */}
      {isCityModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-8 text-center">
              <h4 className="text-xl font-black text-slate-800 mb-2">[{targetProvinceName}] 시 추가</h4>
              <input 
                autoFocus
                type="text"
                placeholder="시 이름 입력 (예: 수원시)"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-blue-500 font-bold"
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCitySubmit()}
              />
            </div>
            <div className="flex border-t border-slate-100">
              <button onClick={() => setIsCityModalOpen(false)} className="flex-1 py-5 text-slate-400 font-bold">취소</button>
              <button onClick={handleCitySubmit} className="flex-1 py-5 text-blue-600 font-black">추가하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkplaceManagement;