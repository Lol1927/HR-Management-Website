import React, { useState } from 'react';
import { MapPin, Tag, UserSquare } from 'lucide-react';
import WorkplaceManagement from './WorkplaceManagement';
import { useTheme } from '../ThemeContext';

function CategoryManager({ onRefresh }) {
  const [activeTab, setActiveTab] = useState('event_types');
  const MY_API_URL = process.env.REACT_APP_API_BASE_URL;
  const { theme } = useTheme();

  const tabs = [
    { id: 'event_types', label: '이벤트 종류', icon: <Tag size={14} /> },
    { id: 'workplaces', label: '근무지역', icon: <MapPin size={14} /> },
    { id: 'positions', label: '포지션', icon: <UserSquare size={14} /> },
  ];

  return (
    <div>
      <div className="mb-5">
        <h2 className={`text-lg font-semibold ${theme.text.primary}`}>카테고리 관리</h2>
        <p className={`text-xs ${theme.text.muted} mt-0.5`}>시스템에서 사용하는 기초 데이터를 관리합니다.</p>
      </div>

      <div className={`flex gap-1 mb-4 ${theme.tabContainer} w-fit`}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === tab.id ? theme.tabActive : theme.tabInactive
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className={`${theme.card} p-5`}>
        {activeTab === 'event_types' && (
          <div>
            <h3 className={`text-sm font-semibold mb-2 ${theme.text.primary}`}>이벤트 종류 관리</h3>
            <p className={`${theme.text.muted} text-xs`}>이벤트 종류(예: 전시회, 콘서트 등)를 추가하고 수정하는 기능이 들어갈 자리입니다.</p>
          </div>
        )}
        {activeTab === 'workplaces' && (
          <div>
            <h3 className={`text-sm font-semibold mb-2 ${theme.text.primary}`}>근무지역 관리</h3>
            <WorkplaceManagement API_URL={MY_API_URL}/>
          </div>
        )}
        {activeTab === 'positions' && (
          <div>
            <h3 className={`text-sm font-semibold mb-2 ${theme.text.primary}`}>포지션 관리</h3>
            <p className={`${theme.text.muted} text-xs`}>근무 포지션(예: 팀장, 일반 등)을 관리하는 기능이 들어갈 자리입니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CategoryManager;
