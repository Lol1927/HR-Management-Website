import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Plus, X, CalendarCheck } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import EventAddFullModal from './EventAddFullModal';
import EventViewModal from './EventViewModal';
import { useTheme } from '../ThemeContext';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function EventManager() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const [events, setEvents] = useState([]);
  const [selectionInfo, setSelectionInfo] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEventForView, setSelectedEventForView] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [workplaceOptions, setWorkplaceOptions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);

  const fetchLocationData = async () => {
    try {
      const [provRes, cityRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/province`), axios.get(`${API_BASE_URL}/city`)
      ]);
      setProvinces(provRes.data);
      setCities(cityRes.data);
    } catch (err) { console.error("지역 데이터 로드 실패:", err); }
  };

  const fetchWorkplaces = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/workplace`);
      setWorkplaceOptions(res.data.map(item => item.placeName));
    } catch (err) { console.error("근무지 로드 실패:", err); }
  };

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/events`);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const mappedEvents = response.data
        .map(ev => {
          // 알바톡 형식(date/workDates) → HR 형식(startDate/endDate) 변환
          let startDate = ev.startDate;
          let endDate = ev.endDate;
          if (!startDate && ev.date) {
            startDate = ev.date;
            endDate = ev.workDates?.length > 0
              ? ev.workDates[ev.workDates.length - 1]
              : ev.date;
          }
          if (!startDate || !endDate) return null;

          const eventEndDate = new Date(endDate); eventEndDate.setHours(0, 0, 0, 0);
          const isPast = eventEndDate < today;
          const eventColor = isPast ? '#94a3b8' : '#3b82f6';
          return {
            id: ev.id, title: ev.title, start: startDate,
            end: new Date(new Date(endDate).getTime() + 86400000).toISOString().split('T')[0],
            backgroundColor: eventColor, borderColor: eventColor,
            extendedProps: { ...ev, startDate, endDate, isPast }
          };
        })
        .filter(Boolean);
      setEvents(mappedEvents);
    } catch (err) { console.error("이벤트 로드 실패:", err); }
  };

  useEffect(() => { fetchEvents(); fetchWorkplaces(); fetchLocationData(); }, []);

  const handleEditClick = (eventData) => {
    setEditingEvent(eventData);
    setSelectedEventForView(null);
    setSelectionInfo({
      startStr: eventData.startDate,
      endStr: new Date(new Date(eventData.endDate).getTime() + 86400000).toISOString().split('T')[0]
    });
    setIsAddModalOpen(true);
  };

  const upcomingEvents = events.filter(ev => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const eventEndDate = new Date(ev.extendedProps.endDate); eventEndDate.setHours(0, 0, 0, 0);
    return eventEndDate >= today;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className={`text-sm font-semibold ${theme.text.primary}`}>{t('events.header_title')}</h2>
          <p className={`text-[11px] ${theme.text.muted} mt-0.5`}>캘린더에서 날짜를 드래그하여 행사를 등록하세요</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* 캘린더 */}
        <div className={`xl:col-span-2 ${theme.card} p-4 relative`}>
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={i18n.language}
            selectable={true}
            events={events}
            select={(info) => setSelectionInfo(info)}
            eventClick={(info) => setSelectedEventForView(info.event.extendedProps)}
            height="520px"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
            dayMaxEvents={3}
          />
          {selectionInfo && !isAddModalOpen && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[50] w-fit">
              <div className="bg-slate-900 text-white pl-4 pr-2 py-2 rounded-lg flex items-center gap-3 shadow-xl">
                <span className="font-medium text-blue-300 text-xs">
                  {(() => {
                    const start = selectionInfo.startStr;
                    const endObj = new Date(selectionInfo.endStr);
                    endObj.setDate(endObj.getDate() - 1);
                    const end = endObj.toISOString().split('T')[0];
                    return start === end ? `${start} ${t('events.status_selected')}` : `${start} ~ ${end} ${t('events.status_selected')}`;
                  })()}
                </span>
                <div className="w-px h-3.5 bg-slate-700" />
                <button onClick={() => setIsAddModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors">
                  <Plus size={12}/> {t('events.btn_assign')}
                </button>
                <button onClick={() => setSelectionInfo(null)} className="p-0.5 hover:bg-slate-800 rounded text-slate-500">
                  <X size={14}/>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 스케줄 리스트 */}
        <div className="bg-slate-900 rounded-xl p-4 text-white overflow-y-auto max-h-[580px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold flex items-center gap-1.5 text-slate-300">
              <CalendarCheck className="text-blue-400" size={13} /> {t('events.confirmed_schedule')}
            </h3>
            <span className="text-[10px] text-slate-500 font-medium">{upcomingEvents.length}건</span>
          </div>
          <div className="space-y-1.5">
            {upcomingEvents.length > 0 ? upcomingEvents.map((ev, i) => (
              <div key={i} onClick={() => setSelectedEventForView(ev.extendedProps)}
                className="px-3 py-2.5 bg-white/[0.04] rounded-lg border border-white/[0.06] hover:bg-white/[0.08] cursor-pointer transition-all group">
                <p className="font-medium text-[13px] text-slate-100 mb-0.5 group-hover:text-white">{ev.title}</p>
                <p className="text-blue-400/80 text-[11px]">{ev.extendedProps.startDate} ~ {ev.extendedProps.endDate}</p>
                {ev.extendedProps.assignedStaff?.length > 0 && (
                  <p className="text-slate-500 text-[10px] mt-1">배정 {ev.extendedProps.assignedStaff.length}명</p>
                )}
              </div>
            )) : (
              <div className="text-center py-8 text-slate-600 text-xs">예정된 행사가 없습니다</div>
            )}
          </div>
        </div>
      </div>

      {isAddModalOpen && selectionInfo && (
        <EventAddFullModal selectionInfo={selectionInfo} initialData={editingEvent}
          workplaces={workplaceOptions} provinces={provinces} cities={cities}
          onClose={() => { setIsAddModalOpen(false); setEditingEvent(null); setSelectionInfo(null); }}
          onSaveSuccess={() => { fetchEvents(); setIsAddModalOpen(false); setEditingEvent(null); setSelectionInfo(null); }} />
      )}
      {selectedEventForView && (
        <EventViewModal eventData={selectedEventForView} onClose={() => setSelectedEventForView(null)}
          onRefresh={fetchEvents} onEditClick={handleEditClick} />
      )}
    </div>
  );
}

export default EventManager;
