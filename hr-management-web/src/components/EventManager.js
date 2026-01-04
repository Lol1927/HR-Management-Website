import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Plus, X, CalendarCheck } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
// 분리한 컴포넌트들 가져오기
import EventAddFullModal from './EventAddFullModal';
import EventViewModal from './EventViewModal';



const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function EventManager() {
  const { t, i18n } = useTranslation();
  const [events, setEvents] = useState([]);
  const [selectionInfo, setSelectionInfo] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEventForView, setSelectedEventForView] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [workplaceOptions, setWorkplaceOptions] = useState([]);
  const [provinces, setProvinces] = useState([]); // 주(Province) 데이터 상태 추가
  const [cities, setCities] = useState([]);

  const fetchLocationData = async () => {
    try {
      const [provRes, cityRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/province`), // API 엔드포인트는 실제 서버 설정에 맞게 조정하세요
        axios.get(`${API_BASE_URL}/city`)
      ]);
      setProvinces(provRes.data);
      setCities(cityRes.data);
    } catch (err) {
      console.error("지역 데이터 로드 실패:", err);
    }
  };

  const fetchWorkplaces = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/workplace`);
      // 이름만 추출하여 배열로 저장
      const names = res.data.map(item => item.placeName);
      setWorkplaceOptions(names);
    } catch (err) {
      console.error("근무지 로드 실패:", err);
    }
  };

  // 1. 이벤트 데이터 로드
  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/events`);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // 비교를 위해 시간 초기화

      const mappedEvents = response.data.map(ev => {
        const eventEndDate = new Date(ev.endDate);
        eventEndDate.setHours(0, 0, 0, 0);

        // 오늘 날짜보다 이벤트 종료일이 이전이면 회색, 아니면 파란색
        const isPast = eventEndDate < today;
        const eventColor = isPast ? '#94a3b8' : '#3b82f6'; // 회색(slate-400) : 파란색(blue-500)

        return {
          id: ev.id,
          title: ev.title,
          start: ev.startDate,
          // FullCalendar의 end는 Exclusive이므로 화면 표시를 위해 +1일
          end: new Date(new Date(ev.endDate).getTime() + 86400000).toISOString().split('T')[0],
          backgroundColor: eventColor,
          borderColor: eventColor,
          extendedProps: { ...ev, isPast } // 나중에 리스트에서도 사용하기 위해 추가
        };
      });
      setEvents(mappedEvents);
    } catch (err) {
      console.error("이벤트 로드 실패:", err);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchWorkplaces();
    fetchLocationData();
  }, []);

  // 2. 수정 모드로 전환하는 핸들러
  const handleEditClick = (eventData) => {
    setEditingEvent(eventData); // 수정할 데이터 저장
    setSelectedEventForView(null); // 상세보기 모달 닫기
    
    // 날짜 선택 정보를 수정할 이벤트의 날짜로 가상 생성하여 전달
    setSelectionInfo({
      startStr: eventData.startDate,
      endStr: new Date(new Date(eventData.endDate).getTime() + 86400000).toISOString().split('T')[0]
    });
    
    setIsAddModalOpen(true); // 등록/수정 모달 열기
  };

  return (
    <div className="p-6 min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="mb-8 font-black text-4xl tracking-tight">{t('events.header_title')}</header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* 메인 캘린더 영역 */}
        <div className="xl:col-span-2 bg-white p-8 rounded-[40px] shadow-2xl relative border border-white">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={i18n.language}
            selectable={true}
            events={events}
            select={(info) => setSelectionInfo(info)}
            eventClick={(info) => setSelectedEventForView(info.event.extendedProps)}
            height="680px"
          />
          
          {/* 날짜 선택 시 하단에 뜨는 플로팅 바 */}
          {selectionInfo && !isAddModalOpen && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[50] w-fit">
              <div className="bg-slate-900 text-white px-10 py-5 rounded-[30px] flex items-center gap-8 shadow-2xl border border-white/10 whitespace-nowrap">
                <span className="font-bold text-blue-400 text-xl tracking-tight">
                  {(() => {
                    const start = selectionInfo.startStr;
                    const endObj = new Date(selectionInfo.endStr);
                    endObj.setDate(endObj.getDate() - 1);
                    const end = endObj.toISOString().split('T')[0];
                    return start === end ? `${start} ${t('events.status_selected')}` : `${start} ~ ${end} ${t('events.status_selected')}`;
                  })()}
                </span>
                <div className="w-[1px] h-6 bg-slate-700"></div>
                <button 
                  onClick={() => setIsAddModalOpen(true)} 
                  className="bg-blue-600 px-8 py-3.5 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-500 hover:scale-105 transition-all"
                >
                  <Plus size={20}/> {t('events.btn_assign')}
                </button>
                <button onClick={() => setSelectionInfo(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400">
                  <X size={24}/>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 우측 확정 스케줄 리스트 */}
        <div className="bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl overflow-y-auto max-h-[800px]">
          <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
            <CalendarCheck className="text-blue-400" size={28} /> {t('events.confirmed_schedule')}
          </h3>
          <div className="space-y-5">
            {events.filter(ev => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const eventEndDate = new Date(ev.extendedProps.endDate);
            eventEndDate.setHours(0, 0, 0, 0);
            
            return eventEndDate >= today;
            }).map((ev, i) => (
              <div 
                key={i} 
                onClick={() => setSelectedEventForView(ev.extendedProps)} 
                className="p-6 bg-slate-800/50 rounded-3xl border border-slate-700/50 hover:bg-slate-800 cursor-pointer transition-all"
              >
                <p className="font-black text-xl mb-2">{ev.title}</p>
                <p className="text-blue-400 text-sm font-bold">{ev.extendedProps.startDate} ~ {ev.extendedProps.endDate}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 1. 인력 배정 모달 (등록/수정 공용) */}
      {isAddModalOpen && selectionInfo && (
        <EventAddFullModal 
          selectionInfo={selectionInfo} 
          initialData={editingEvent}
          workplaces={workplaceOptions}
          provinces={provinces}
          cities={cities}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingEvent(null);
            setSelectionInfo(null);
          }} 
          onSaveSuccess={() => {
            fetchEvents();
            setIsAddModalOpen(false);
            setEditingEvent(null);
            setSelectionInfo(null);
          }} 
        />
      )}

      {/* 2. 상세보기 모달 */}
      {selectedEventForView && (
        <EventViewModal 
          eventData={selectedEventForView} 
          onClose={() => setSelectedEventForView(null)} 
          onRefresh={fetchEvents}
          onEditClick={handleEditClick}
        />
      )}
    </div>
  );
}

export default EventManager;