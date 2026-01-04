import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { X, Download, FileUp, Save, Trash2 ,Loader2} from 'lucide-react';

function BulkEmployeeUpload({ onClose, onRefresh, API_URL,employees }) {
  const [data, setData] = useState([]); // 엑셀에서 추출한 데이터\
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    duplicates: 0,
    final: 0
  });

  // 1. 엑셀 형식 다운로드 (사용자가 올린 양식 기준)
  // 1. 엑셀 형식 다운로드 수정
  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 
        "이름": "홍길동", 
        "연락처": "010-1234-5678", 
        "은행": "신한은행", 
        "계좌번호": "110-123-456789", 
        "주민등록번호": "900101-1234567", 
        // 🔥 도움말처럼 샘플을 넣어줍니다.
        "주": "경기도",
        "시": "수원시" 
      }
    ]);
    
    // 열 너비 조절 (사용자 편의성)
    ws['!cols'] = [
      { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 30 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "양식");
    XLSX.writeFile(wb, "직원_등록_양식.xlsx");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    

    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

      if (!json || json.length === 0) {
        alert("엑셀 파일에 데이터가 없거나 형식이 잘못되었습니다.");
        e.target.value = "";
        return;
      }

      const dbList = employees || [];
      const seenInFile = new Set();

      const formatted = json.map((row, idx) => {
        const excelResRaw = String(row["주민등록번호"] || "").trim();
        const cleanExcelRes = excelResRaw.replace(/[^0-9]/g, "");

        let duplicateFound = false;
        const isDuplicateInDB = dbList.some((emp) => {
          const dbResRaw = String(emp.residentNumber || "").trim();
          const cleanDBRes = dbResRaw.replace(/[^0-9]/g, "");
          return cleanExcelRes !== "" && cleanExcelRes === cleanDBRes;
        });
        const isDuplicateInFile = seenInFile.has(cleanExcelRes);
        if (isDuplicateInDB || isDuplicateInFile) duplicateFound = true;
        if (cleanExcelRes !== "") seenInFile.add(cleanExcelRes);

        // ✅ [핵심 수정] 객체가 아닌 "문자열"로 변환
        const province = String(row["주"] || "").trim();
        const city = String(row["시"] || "전체").trim(); // 시가 비어있으면 "전체"

        // "경기도 수원시" 또는 "서울 전체" 형태의 문자열 생성
        const locationString = province ? `${province} ${city}` : "";

        return {
          tempId: idx,
          name: row["이름"] || "이름없음",
          contact: String(row["연락처"] || "").trim(),
          bankName: String(row["은행"] || "").trim(),
          accountNumber: String(row["계좌번호"] || "").trim(),
          residentNumber: excelResRaw,
          // 🔹 백엔드 사양에 맞춰 문자열 배열로 저장
          availableWork: locationString ? [locationString] : [], 
          isDuplicate: duplicateFound
        };
      });

      const filteredData = formatted.filter(item => !item.isDuplicate);
      
      setStats({
        total: json.length,
        duplicates: json.length - filteredData.length,
        final: filteredData.length
      });

      if (filteredData.length === 0) {
        alert("추가할 인력이 없습니다. (중복 데이터)");
        setData([]);
        e.target.value = "";
      } else {
        setData(filteredData);
      }
    };
    reader.readAsBinaryString(file);
  };

  // 3. 임시 데이터 수정 로직
  const handleEdit = (index, field, value) => {
    const newData = [...data];
    newData[index][field] = value;
    setData(newData);
  };

 const handleSaveAll = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    // 1. 전송 데이터 정제 (isDuplicate 등 불필요한 필드 제거)
    const newPeople = data.map(({ tempId, isDuplicate, ...rest }) => ({
      ...rest,
      status: "활성" // 기본 상태값 부여
    }));

    try {
      // 2. 지역 데이터 추출 및 중복 제거 (Map 활용)
      const regionMap = new Map();
      newPeople.forEach(emp => {
        emp.availableWork.forEach(loc => {
          const parts = loc.split(" ");
          const p = parts[0];
          const c = parts.slice(1).join(" ") || "전체"; 
          if (p) {
            if (!regionMap.has(p)) regionMap.set(p, new Set());
            regionMap.get(p).add(c);
          }
        });
      });

      // 3. 지역(주/시) 순차 등록
      // 에러가 나더라도(이미 존재함 등) 중단되지 않도록 각각 try-catch 처리
      for (const [provinceName, cities] of regionMap.entries()) {
        try {
          await axios.post(`${API_URL}/province`, { provinceName });
        } catch (e) { /* 이미 있는 주일 경우 스킵 */ }

        for (const cityName of cities) {
          try {
            // DB 저장 형식인 "경기도 수원시" 형태로 전송
            const fullCityName = cityName === "전체" ? `${provinceName} 전체` : `${provinceName} ${cityName}`;
            await axios.post(`${API_URL}/city`, { provinceName, cityName: fullCityName });
          } catch (e) { /* 이미 있는 시일 경우 스킵 */ }
        }
      }

      // 4. 직원 정보 순차 등록 (서버 부하 방지)
      let successCount = 0;
      for (const emp of newPeople) {
        try {
          await axios.post(`${API_URL}/employees`, emp);
          successCount++;
        } catch (err) {
          console.error(`${emp.name} 등록 실패:`, err);
        }
      }

      alert(`${successCount}명의 직원이 성공적으로 등록되었습니다.`);
      if (typeof onRefresh === 'function') onRefresh(); 
      onClose();   

    } catch (err) {
      console.error("일괄 등록 중 치명적 에러:", err);
      alert("데이터 처리 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-[100]">
      <div className="bg-white rounded-[40px] p-8 w-full max-w-6xl shadow-2xl max-h-[95vh] flex flex-col">
        {/* 1. 헤더 영역 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800">인력 일괄 등록</h2>
            <p className="text-slate-400 font-bold text-sm">엑셀로 인력들을 일관 등록할 수 있습니다.</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={downloadTemplate} className="flex items-center gap-2 text-blue-600 font-black hover:bg-blue-50 px-4 py-2 rounded-xl transition-all">
              <Download size={20} /> 엑셀 형식 다운로드
            </button>
            <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><X size={24} /></button>
          </div>
        </div>

        {data.length === 0 ? (
          /* 파일 업로드 전 */
          <div className="flex-1 border-4 border-dashed border-slate-100 rounded-[32px] flex flex-col items-center justify-center gap-4 bg-slate-50/50">
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shadow-inner">
              <FileUp size={40} />
            </div>
            <label className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black cursor-pointer shadow-lg shadow-blue-200 hover:scale-105 transition-transform">
              엑셀 파일 등록
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
            </label>
          </div>
        ) : (
          /* 파일 업로드 후: 데이터 검토 영역 */
          <>
            {/* 2. 요약 통계 바 (수백 명 등록 시 가시성 핵심) */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-[24px]">
                <p className="text-[11px] font-black text-blue-400 uppercase tracking-wider mb-1">총 등록 예정</p>
                <p className="text-2xl font-black text-blue-900">{data.length}<span className="text-sm ml-1">명</span></p>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-[24px]">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">정상 데이터</p>
                <p className="text-2xl font-black text-slate-700">{data.length}<span className="text-sm ml-1">건</span></p>
              </div>
              <div className="bg-amber-50 border border-amber-100 p-5 rounded-[24px]">
                <p className="text-[11px] font-black text-amber-500 uppercase tracking-wider mb-1">검토 필요</p>
                <p className="text-2xl font-black text-amber-700">0<span className="text-sm ml-1">건</span></p>
              </div>
            </div>

            {/* 3. 데이터 테이블 영역 (고정 헤더 및 스크롤) */}
            <div className="flex-1 overflow-auto bg-slate-50/50 rounded-[32px] border border-slate-100 relative">
              <table className="w-full text-left border-separate border-spacing-y-2 px-4">
                <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-20 shadow-sm">
                  <tr className="text-slate-400 text-[11px] font-black uppercase tracking-wider">
                    <th className="px-6 py-4">이름</th>
                    <th className="px-6 py-4">연락처</th>
                    <th className="px-6 py-4">은행/계좌</th>
                    <th className="px-6 py-4">주민등록번호</th>
                    <th className="px-6 py-4">근무지역</th> {/* 도/시 결합 출력 */}
                    <th className="px-6 py-4 text-center">관리</th>
                  </tr>
                </thead>
                <tbody className="before:content-[''] before:block before:h-2">
                  {data.map((item, idx) => (
                    <tr key={item.tempId || idx} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all group">
                      <td className="px-6 py-4 font-bold text-slate-700 border-l-4 border-transparent group-hover:border-blue-500 rounded-l-2xl">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium text-sm">{item.contact}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-blue-600 font-black text-[11px]">{item.bankName}</span>
                          <span className="text-slate-400 font-mono text-xs">{item.accountNumber}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500 text-xs tracking-tighter">
                        {item.residentNumber}
                      </td>
                      {/* 🔥 근무지역 출력 로직 수정 */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(item.availableWork) && item.availableWork.length > 0 ? (
                            item.availableWork.slice(0, 3).map((loc, i) => (
                              <span key={i} className="bg-blue-50 text-blue-600 text-[11px] px-2 py-1 rounded-md font-bold border border-blue-100">
                                {/* ✅ loc 자체가 문자열이므로 .province 같은 속성 없이 바로 출력합니다 */}
                                {loc}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-300 text-xs">-</span>
                          )}
                          {item.availableWork?.length > 3 && (
                            <span className="text-[10px] text-slate-400 font-bold self-center ml-1">
                              +{item.availableWork.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center rounded-r-2xl">
                        <button 
                          onClick={() => setData(data.filter((_, i) => i !== idx))}
                          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* 4. 하단 액션 바 */}
        {data.length > 0 && (
          <div className="mt-6 flex gap-4 items-center p-4 bg-slate-900 rounded-[28px] shadow-2xl shadow-slate-200">
             <button 
               onClick={handleSaveAll} 
               disabled={isSubmitting} // 제출 중일 때 클릭 금지
               className={`flex-1 p-4 rounded-xl font-black text-white transition-all flex items-center justify-center gap-3 ${
                 isSubmitting ? 'bg-slate-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 shadow-lg'
               }`}
             >
               {isSubmitting ? (
                 <>
                   <Loader2 size={20} className="animate-spin" /> 
                   직원 등록 중입니다...
                 </>
               ) : (
                 <>
                   <Save size={20} /> {data.length}명의 직원 등록 완료하기
                 </>
               )}
             </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default BulkEmployeeUpload;