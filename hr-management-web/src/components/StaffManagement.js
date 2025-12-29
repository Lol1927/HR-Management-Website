import React from 'react';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function StaffManagement({ employees, setIsModalOpen, openEditModal, handleDelete, setSelectedEmployee }) {
  const { t } = useTranslation();
  
  return (
    <div className="animate-in fade-in duration-500">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800">{t('staff_management.header_title')}</h2>
          <p className="text-slate-400 font-medium mt-1">{t('staff_management.header_subtitle')}</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="bg-blue-600 text-white px-6 py-3.5 rounded-2xl flex items-center gap-2 font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={18} /> {t('staff_management.btn_register')}
        </button>
      </header>

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
            {employees.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-20 text-center text-slate-400 font-bold">
                  {t('staff_management.empty_message')}
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
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
                      {emp.availableWork?.map((region) => (
                        <span key={region} className="px-3 py-1 bg-blue-50 text-blue-600 text-[11px] font-bold rounded-full border border-blue-100">
                          {region}
                        </span>
                      ))}
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