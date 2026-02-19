import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useTheme } from '../ThemeContext';
import { Users, ChevronDown, CheckCircle, XCircle, Clock, User, Phone, Mail, FileText, Calendar, MapPin, ChevronLeft } from 'lucide-react';

const JOB_FINDER_API = 'https://mcxonovikd.execute-api.us-east-2.amazonaws.com/dev';
const HR_API = process.env.REACT_APP_API_BASE_URL;

const statusConfig = {
  pending: { label: '대기중', color: 'bg-yellow-100 text-yellow-700', icon: <Clock size={13} /> },
  hired:   { label: '채용',   color: 'bg-green-100 text-green-700',  icon: <CheckCircle size={13} /> },
  rejected:{ label: '미채용', color: 'bg-red-100 text-red-700',      icon: <XCircle size={13} /> },
};

export default function ApplicationManager() {
  const { theme } = useTheme();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingApps, setLoadingApps] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  // 이벤트 목록 불러오기 (HR Management Events 테이블)
  const fetchEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      const res = await axios.get(`${JOB_FINDER_API}/api/events`);
      const sorted = (res.data || []).sort((a, b) => new Date(b.date) - new Date(a.date));
      setEvents(sorted);
    } catch (err) {
      console.error('이벤트 로드 실패', err);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  // 선택된 이벤트의 지원자 목록 불러오기
  const fetchApplications = useCallback(async (eventId) => {
    try {
      setLoadingApps(true);
      const res = await axios.get(`${JOB_FINDER_API}/api/admin/applications?eventId=${eventId}`);
      setApplications(res.data || []);
    } catch (err) {
      console.error('지원자 목록 로드 실패', err);
    } finally {
      setLoadingApps(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    if (selectedEvent) fetchApplications(selectedEvent.id);
  }, [selectedEvent, fetchApplications]);

  // 채용 상태 변경
  const updateStatus = async (applicationId, newStatus) => {
    try {
      setUpdatingId(applicationId);
      await axios.patch(
        `${JOB_FINDER_API}/api/admin/applications/${applicationId}/status`,
        { status: newStatus }
      );
      setApplications(prev =>
        prev.map(app => app.id === applicationId ? { ...app, status: newStatus } : app)
      );
    } catch (err) {
      alert('상태 변경에 실패했습니다.');
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredApps = filterStatus === 'all'
    ? applications
    : applications.filter(app => app.status === filterStatus);

  const counts = {
    all: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    hired: applications.filter(a => a.status === 'hired').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className={`text-base font-semibold ${theme.text.primary}`}>지원자 관리</h2>
        {selectedEvent && (
          <button
            onClick={() => { setSelectedEvent(null); setApplications([]); setFilterStatus('all'); }}
            className={`flex items-center gap-1.5 text-xs ${theme.text.secondary} hover:${theme.text.primary} transition-colors`}
          >
            <ChevronLeft size={14} /> 이벤트 목록
          </button>
        )}
      </div>

      {/* 이벤트 선택 화면 */}
      {!selectedEvent && (
        <div>
          {loadingEvents ? (
            <div className={`${theme.card} p-8 text-center`}>
              <p className={`text-sm ${theme.text.muted}`}>이벤트 불러오는 중...</p>
            </div>
          ) : events.length === 0 ? (
            <div className={`${theme.card} p-8 text-center`}>
              <Calendar size={32} className={`mx-auto mb-3 ${theme.text.muted}`} />
              <p className={`text-sm ${theme.text.muted}`}>등록된 이벤트가 없습니다</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {events.map(event => {
                const categoryLabel = { sports: '스포츠', concert: '공연', exhibition: '전시' }[event.category] || event.category;
                return (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`w-full text-left ${theme.card} p-4 hover:shadow-md transition-all border border-transparent hover:border-blue-200`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${theme.badge.info}`}>{categoryLabel}</span>
                        </div>
                        <p className={`text-sm font-medium ${theme.text.primary} line-clamp-1`}>{event.title}</p>
                        <div className={`flex items-center gap-3 mt-1.5 text-xs ${theme.text.muted}`}>
                          <span className="flex items-center gap-1">
                            <Calendar size={11} /> {event.date}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={11} /> {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Users size={14} className={theme.text.muted} />
                        <ChevronDown size={14} className={`${theme.text.muted} -rotate-90`} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 지원자 목록 화면 */}
      {selectedEvent && (
        <div className="space-y-4">
          {/* 이벤트 정보 헤더 */}
          <div className={`${theme.card} p-4`}>
            <p className={`text-xs ${theme.text.muted} mb-1`}>선택된 이벤트</p>
            <p className={`text-sm font-semibold ${theme.text.primary}`}>{selectedEvent.title}</p>
            <div className={`flex items-center gap-3 mt-1.5 text-xs ${theme.text.muted}`}>
              <span className="flex items-center gap-1"><Calendar size={11} /> {selectedEvent.date}</span>
              {selectedEvent.location && <span className="flex items-center gap-1"><MapPin size={11} /> {selectedEvent.location}</span>}
            </div>
          </div>

          {/* 필터 탭 */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: '전체' },
              { key: 'pending', label: '대기중' },
              { key: 'hired', label: '채용' },
              { key: 'rejected', label: '미채용' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterStatus === key ? theme.btnPrimary : `${theme.btnSecondary}`
                }`}
              >
                {label} ({counts[key]})
              </button>
            ))}
          </div>

          {/* 지원자 목록 */}
          {loadingApps ? (
            <div className={`${theme.card} p-8 text-center`}>
              <p className={`text-sm ${theme.text.muted}`}>지원자 목록 불러오는 중...</p>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className={`${theme.card} p-8 text-center`}>
              <Users size={32} className={`mx-auto mb-3 ${theme.text.muted}`} />
              <p className={`text-sm ${theme.text.muted}`}>
                {filterStatus === 'all' ? '지원자가 없습니다' : `${statusConfig[filterStatus]?.label} 상태의 지원자가 없습니다`}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredApps.map(app => {
                const profile = app.profile;
                const status = statusConfig[app.status] || statusConfig.pending;
                const isUpdating = updatingId === app.id;

                return (
                  <div key={app.id} className={`${theme.card} p-4`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      {/* 지원자 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-8 h-8 rounded-full ${theme.btnPrimary} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
                            {profile?.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${theme.text.primary}`}>
                              {profile?.name || '이름 없음'}
                            </p>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${status.color}`}>
                              {status.icon} {status.label}
                            </span>
                          </div>
                        </div>

                        <div className={`space-y-1 mt-2 text-xs ${theme.text.secondary}`}>
                          {profile?.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone size={11} className={theme.text.muted} />
                              {profile.phone}
                            </div>
                          )}
                          {profile?.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail size={11} className={theme.text.muted} />
                              {profile.email}
                            </div>
                          )}
                          {app.appliedAt && (
                            <div className="flex items-center gap-1.5">
                              <Calendar size={11} className={theme.text.muted} />
                              지원일: {new Date(app.appliedAt).toLocaleDateString('ko-KR')}
                            </div>
                          )}
                        </div>

                        {app.selfIntroduction && (
                          <div className={`mt-3 p-2.5 rounded-lg ${theme.main} border ${theme.divider}`}>
                            <p className={`text-[10px] font-medium ${theme.text.muted} mb-1 flex items-center gap-1`}>
                              <FileText size={10} /> 자기소개
                            </p>
                            <p className={`text-xs ${theme.text.secondary} line-clamp-3`}>
                              {app.selfIntroduction}
                            </p>
                          </div>
                        )}

                        {/* 서류 제출 여부 */}
                        {app.status === 'hired' && (
                          <div className={`mt-2 text-xs ${app.documentsSubmittedAt ? 'text-green-600' : theme.text.muted}`}>
                            {app.documentsSubmittedAt
                              ? `✓ 서류 제출 완료 (${new Date(app.documentsSubmittedAt).toLocaleDateString('ko-KR')})`
                              : '서류 미제출'}
                          </div>
                        )}
                      </div>

                      {/* 채용 액션 버튼 */}
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => updateStatus(app.id, 'hired')}
                          disabled={isUpdating || app.status === 'hired'}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            app.status === 'hired'
                              ? 'bg-green-100 text-green-700 cursor-default'
                              : 'bg-green-500 hover:bg-green-600 text-white disabled:opacity-50'
                          }`}
                        >
                          <CheckCircle size={12} />
                          {app.status === 'hired' ? '채용됨' : '채용'}
                        </button>
                        <button
                          onClick={() => updateStatus(app.id, 'rejected')}
                          disabled={isUpdating || app.status === 'rejected'}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            app.status === 'rejected'
                              ? 'bg-red-100 text-red-700 cursor-default'
                              : 'bg-red-500 hover:bg-red-600 text-white disabled:opacity-50'
                          }`}
                        >
                          <XCircle size={12} />
                          {app.status === 'rejected' ? '미채용' : '미채용'}
                        </button>
                        {app.status !== 'pending' && (
                          <button
                            onClick={() => updateStatus(app.id, 'pending')}
                            disabled={isUpdating}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${theme.btnSecondary} disabled:opacity-50`}
                          >
                            <Clock size={12} /> 대기
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
