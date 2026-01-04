import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Trash2, Check, X, Loader2 } from 'lucide-react';
import axios from 'axios';

function WorkplaceManagement({ API_URL ,onRefresh}) {
  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 상태 관리
  const [isAdding, setIsAdding] = useState(false);
  const [newProvinceName, setNewProvinceName] = useState("");
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [newCityName, setNewCityName] = useState("");
  const [targetProvinceName, setTargetProvinceName] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

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
  // 2. 도(Province) 추가 (POST)
const addProvince = async () => {
  if (!newProvinceName.trim()) return;
  
  try {
    // [Step 1] 도 등록
    const res = await axios.post(`${API_URL}/province`, { 
      provinceName: newProvinceName 
    });

    if (res.data.error) {
      alert(res.data.error);
      return;
    }
   await axios.post(`${API_URL}/city`, { 
      // 핵심: cityName을 중복되지 않게 '도 이름 + 전체'로 조합
      cityName: `${newProvinceName} 전체`, 
      provinceName: newProvinceName 
    });

    // 모든 작업이 끝나면 목록 갱신 및 입력창 닫기
    await fetchData(); 
    if (onRefresh) await onRefresh()
    setNewProvinceName("");
    setIsAdding(false);
    
    console.log(`${newProvinceName} 및 기본 '전체' 지역 생성 완료`);

  } catch (err) {
    console.error("등록 중 오류:", err);
    alert("도 등록 또는 기본 지역 생성 중 오류가 발생했습니다.");
  }
};

 // 3. 도(Province) 삭제 (DELETE)
  const deleteProvince = async (name) => {
  const targetProvince = provinces.find(p => p.provinceName === name);
  const citiesToDelete = targetProvince?.cities || [];
  
  // 바로 삭제하지 않고 모달 정보를 세팅한 뒤 모달을 엽니다.
  setDeleteTarget({ name, count: citiesToDelete.length, cities: citiesToDelete });
  setIsDeleteModalOpen(true);
};

// 실제 삭제를 수행할 별도의 함수
const confirmDelete = async () => {
  if (!deleteTarget) return;
  
  const { name, cities } = deleteTarget;
  
  try {
    setLoading(true);
    setIsDeleteModalOpen(false); // 모달 닫기

    // [Step 1] 시 삭제
    const deleteCityPromises = cities.map(city => 
      axios.delete(`${API_URL}/city/${encodeURIComponent(city.cityName)}`)
    );
    await Promise.all(deleteCityPromises);

    // [Step 2] 도 삭제
    await axios.delete(`${API_URL}/province/${encodeURIComponent(name)}`);

    await fetchData();
    if (onRefresh) await onRefresh()
    setDeleteTarget(null);
  } catch (err) {
    console.error("삭제 실패:", err);
    alert("삭제 중 오류가 발생했습니다.");
  } finally {
    setLoading(false);
  }
};
  // 4. 시(City) 추가 (POST)
  // 4. 시(City) 추가 (POST) 수정본
const handleCitySubmit = async () => {
    if (!newCityName.trim()) return;

    // 핵심: 사용자가 입력한 이름 앞에 도 이름을 붙여서 '고유한 이름'을 만듭니다.
    // 예: "수원시" -> "경기도 수원시"
    const combinedCityName = `${targetProvinceName} ${newCityName.trim()}`;

    try {
      const res = await axios.post(`${API_URL}/city`, { 
        cityName: combinedCityName, // 조합된 이름을 ID/이름으로 사용
        provinceName: targetProvinceName 
      });

      if (res.data.error) {
        alert(res.data.error);
      } else {
        await fetchData();
        if (onRefresh) await onRefresh();
        setNewCityName("");
        setIsCityModalOpen(false);
      }
    } catch (err) {
      // 백엔드에서 중복 체크를 할 경우에 대한 대응
      console.error("시 등록 중 오류:", err);
      alert("이미 등록된 지역이거나 등록 중 오류가 발생했습니다.");
    }
  };

  // 5. 시(City) 삭제 (DELETE)
  const deleteCity = async (cityName) => {
    if (!window.confirm(`'${cityName}'을(를) 삭제하시겠습니까?`)) return;
    try {
      await axios.delete(`${API_URL}/city/${encodeURIComponent(cityName)}`);
      await fetchData();
      if (onRefresh) await onRefresh()
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
              {province.cities?.map(city => {
                // 1. "도이름 전체" 형식인지 확인하는 조건 생성
                const isDefaultAll = city.cityName === `${province.provinceName} 전체`;

                // 2. 만약 "전체" 항목이라면 아예 렌더링하지 않음 (null 반환)
                if (isDefaultAll) return null;

                return (
                  <span 
                    key={city.cityName} 
                    className="group relative bg-white border border-slate-200 text-slate-600 pl-4 pr-10 py-2 rounded-xl text-sm font-bold shadow-sm"
                  >
                    {/* 기존 로직: 도 이름 제거 후 표시 */}
                    {city.cityName.replace(province.provinceName + " ", "")}
                    
                    <button 
                      onClick={() => deleteCity(city.cityName)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X size={14} />
                    </button>
                  </span>
                );
              })}
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
      {/* 삭제 확인 커스텀 모달 */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h4 className="text-xl font-black text-slate-800 mb-3">정말 삭제하시겠습니까?</h4>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">
                <span className="text-rose-600 font-bold">[{deleteTarget?.name}]</span>를 삭제하면<br />
                소속된 모든 지역 <span className="font-bold">({deleteTarget?.count}개)</span>도 함께 삭제됩니다.
              </p>
            </div>
            <div className="flex border-t border-slate-100">
              <button 
                onClick={() => setIsDeleteModalOpen(false)} 
                className="flex-1 py-5 text-slate-400 font-bold hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button 
                onClick={confirmDelete} 
                className="flex-1 py-5 bg-rose-500 text-white font-black hover:bg-rose-600 transition-colors"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}

export default WorkplaceManagement;