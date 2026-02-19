import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { X, Download, FileUp, Save, Trash2, Loader2 } from 'lucide-react';
import { useTheme } from '../ThemeContext';

function BulkEmployeeUpload({ onClose, onRefresh, API_URL, employees }) {
  const [data, setData] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stats, setStats] = useState({ total: 0, duplicates: 0, needReview: 0, final: 0 });
  const { theme } = useTheme();

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      "이름": "홍길동", "연락처": "010-1234-5678", "은행": "신한은행",
      "계좌번호": "110-123-456789", "주민등록번호": "900101-1234567", "주": "경기도", "시": "수원시"
    }]);
    ws['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "양식");
    XLSX.writeFile(wb, "직원_등록_양식.xlsx");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' });
      const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      if (!json || json.length === 0) { alert("데이터가 없습니다."); return; }
      const dbList = employees || [];
      const seenInFile = new Set();
      let duplicateCount = 0, reviewCount = 0;
      const processed = json.map((row, idx) => {
        const name = String(row["이름"] || "").trim();
        const contact = String(row["연락처"] || "").trim();
        const resNumRaw = String(row["주민등록번호"] || "").trim();
        const cleanResNum = resNumRaw.replace(/[^0-9]/g, "");
        const isDuplicate = cleanResNum !== "" && (dbList.some(emp => emp.residentNumber?.replace(/[^0-9]/g, "") === cleanResNum) || seenInFile.has(cleanResNum));
        if (cleanResNum !== "") seenInFile.add(cleanResNum);
        return { ...row, name, contact, residentNumber: resNumRaw, isDuplicate, isInvalid: !name || !contact || cleanResNum.length < 13, tempId: idx };
      });
      const filteredData = processed.filter(item => { if (item.isDuplicate) { duplicateCount++; return false; } if (item.isInvalid) reviewCount++; return true; });
      setStats({ total: json.length, duplicates: duplicateCount, needReview: reviewCount, final: filteredData.length });
      setData(filteredData);
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveAll = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const newPeople = data.map(({ tempId, isDuplicate, ...rest }) => ({ ...rest, status: "활성" }));
    try {
      const regionMap = new Map();
      newPeople.forEach(emp => { emp.availableWork.forEach(loc => { const parts = loc.split(" "); const p = parts[0]; const c = parts.slice(1).join(" ") || "전체"; if (p) { if (!regionMap.has(p)) regionMap.set(p, new Set()); regionMap.get(p).add(c); } }); });
      for (const [provinceName, cities] of regionMap.entries()) {
        try { await axios.post(`${API_URL}/province`, { provinceName }); } catch (e) {}
        for (const cityName of cities) { try { const fullCityName = cityName === "전체" ? `${provinceName} 전체` : `${provinceName} ${cityName}`; await axios.post(`${API_URL}/city`, { provinceName, cityName: fullCityName }); } catch (e) {} }
      }
      let successCount = 0;
      for (const emp of newPeople) { try { await axios.post(`${API_URL}/employees`, emp); successCount++; } catch (err) { console.error(`${emp.name} 등록 실패:`, err); } }
      alert(`${successCount}명의 직원이 성공적으로 등록되었습니다.`);
      if (typeof onRefresh === 'function') onRefresh(); onClose();
    } catch (err) { alert("데이터 처리 중 오류가 발생했습니다."); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className={`fixed inset-0 ${theme.overlay} flex items-center justify-center p-4 z-[100]`}>
      <div className={`${theme.modal} p-5 w-full max-w-5xl max-h-[90vh] flex flex-col`}>
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className={`text-base font-semibold ${theme.text.primary}`}>인력 일괄 등록</h2>
            <p className={`${theme.text.muted} text-xs`}>엑셀로 인력들을 일괄 등록할 수 있습니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-blue-600 text-xs font-medium hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all">
              <Download size={14} /> 양식 다운로드
            </button>
            <button onClick={onClose} className={`p-1.5 ${theme.btnSecondary} rounded-md`}><X size={16} /></button>
          </div>
        </div>

        {data.length === 0 ? (
          <div className={`flex-1 border-2 border-dashed ${theme.divider} rounded-xl flex flex-col items-center justify-center gap-3`}>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <FileUp size={24} />
            </div>
            <label className={`${theme.btnPrimary} px-5 py-2 text-xs font-medium cursor-pointer`}>
              엑셀 파일 등록
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
            </label>
          </div>
        ) : (
          <>
            {/* 통계 */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className={`${theme.statCard('blue')} p-3 rounded-lg`}>
                <p className="text-[10px] font-medium text-blue-500 uppercase mb-0.5">등록 예정</p>
                <p className="text-lg font-semibold text-blue-900">{data.length}<span className="text-xs ml-0.5">명</span></p>
              </div>
              <div className={`${theme.statCard('gray')} p-3 rounded-lg`}>
                <p className={`text-[10px] font-medium ${theme.text.muted} uppercase mb-0.5`}>정상</p>
                <p className={`text-lg font-semibold ${theme.text.primary}`}>{data.length}<span className="text-xs ml-0.5">건</span></p>
              </div>
              <div className={`${theme.statCard('amber')} p-3 rounded-lg`}>
                <p className="text-[10px] font-medium text-amber-500 uppercase mb-0.5">검토 필요</p>
                <p className="text-lg font-semibold text-amber-700">0<span className="text-xs ml-0.5">건</span></p>
              </div>
            </div>

            {/* 테이블 */}
            <div className={`flex-1 overflow-auto ${theme.table}`}>
              <table className="w-full text-left">
                <thead className={`sticky top-0 ${theme.tableHeader} z-10`}>
                  <tr className="text-[11px] font-medium uppercase tracking-wider">
                    <th className="px-3 py-2.5">이름</th>
                    <th className="px-3 py-2.5">연락처</th>
                    <th className="px-3 py-2.5">은행/계좌</th>
                    <th className="px-3 py-2.5">주민등록번호</th>
                    <th className="px-3 py-2.5">근무지역</th>
                    <th className="px-3 py-2.5 text-center w-14">관리</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme.divider}`}>
                  {data.map((item, idx) => (
                    <tr key={item.tempId || idx} className={`${theme.tableRow} group`}>
                      <td className={`px-3 py-2.5 text-sm font-medium ${theme.text.primary}`}>{item.name}</td>
                      <td className={`px-3 py-2.5 text-xs ${theme.text.secondary}`}>{item.contact}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-blue-600 text-[11px] font-medium">{item.bankName}</span>
                        <span className={`${theme.text.muted} text-[11px] ml-1`}>{item.accountNumber}</span>
                      </td>
                      <td className={`px-3 py-2.5 font-mono ${theme.text.secondary} text-xs`}>{item.residentNumber}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(item.availableWork) && item.availableWork.length > 0 ? (
                            item.availableWork.slice(0, 2).map((loc, i) => (
                              <span key={i} className={`${theme.badge.info} text-[10px] px-1.5 py-0.5 rounded font-medium`}>{loc}</span>
                            ))
                          ) : <span className={`${theme.text.muted} text-xs`}>-</span>}
                          {item.availableWork?.length > 2 && <span className={`text-[10px] ${theme.text.muted}`}>+{item.availableWork.length - 2}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button onClick={() => setData(data.filter((_, i) => i !== idx))}
                          className="p-1 text-gray-300 hover:text-rose-500 rounded transition-all"><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {data.length > 0 && (
          <div className="mt-4">
            <button onClick={handleSaveAll} disabled={isSubmitting}
              className={`w-full py-2.5 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 ${
                isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}>
              {isSubmitting ? (<><Loader2 size={16} className="animate-spin" /> 등록 중...</>) : (<><Save size={16} /> {data.length}명 등록 완료</>)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default BulkEmployeeUpload;
