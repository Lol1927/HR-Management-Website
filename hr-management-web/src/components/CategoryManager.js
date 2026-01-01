// src/components/CategoryManager.js
import React, { useState } from 'react';
import { MapPin, Tag, UserSquare } from 'lucide-react';
import WorkplaceManagement from './WorkplaceManagement';

function CategoryManager({ onRefresh }) {
  // 현재 어떤 카테고리 탭을 보고 있는지 관리
  const [activeTab, setActiveTab] = useState('event_types');
  const MY_API_URL = process.env.REACT_APP_API_BASE_URL;

  const tabs = [
    { id: 'event_types', label: '이벤트 종류 관리', icon: <Tag size={18} /> },
    { id: 'workplaces', label: '근무지역 관리', icon: <MapPin size={18} /> },
    { id: 'positions', label: '포지션 관리', icon: <UserSquare size={18} /> },
  ];

  return (
    <div className="animate-in fade-in duration-500">
      <header className="mb-10">
        <h2 className="text-3xl font-black tracking-tight text-slate-800">카테고리 관리</h2>
        <p className="text-slate-400 font-medium mt-1">시스템에서 사용하는 기초 데이터를 관리합니다.</p>
      </header>

      {/* 탭 메뉴 */}
      <div className="flex gap-2 mb-8 bg-slate-100 p-1.5 rounded-[22px] w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-[18px] font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 영역 */}
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
        {activeTab === 'event_types' && (
          <div>
            <h3 className="text-xl font-bold mb-4">이벤트 종류 관리</h3>
            <p className="text-slate-500 italic">이벤트 종류(예: 전시회, 콘서트 등)를 추가하고 수정하는 기능이 들어갈 자리입니다.</p>
          </div>
        )}

        {activeTab === 'workplaces' && (
          <div>
            <h3 className="text-xl font-bold mb-4">근무지역 관리</h3>
            <WorkplaceManagement API_URL={MY_API_URL}/>
          </div>
        )}

        {activeTab === 'positions' && (
          <div>
            <h3 className="text-xl font-bold mb-4">포지션 관리</h3>
            <p className="text-slate-500 italic">근무 포지션(예: 팀장, 일반 등)을 관리하는 기능이 들어갈 자리입니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CategoryManager;