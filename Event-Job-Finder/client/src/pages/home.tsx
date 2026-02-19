import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, parseISO, getDay } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, MapPin, Clock, Users, Briefcase, User, Calendar, List, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import type { Event, Profile } from "@/types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const categoryColors: Record<string, string> = {
  sports:     "bg-emerald-50 text-emerald-700 border border-emerald-200",
  concert:    "bg-purple-50 text-purple-700 border border-purple-200",
  exhibition: "bg-amber-50 text-amber-700 border border-amber-200",
};

const categoryLabels: Record<string, string> = {
  sports: "스포츠",
  concert: "공연",
  exhibition: "전시",
};

const CATEGORIES = [
  { id: "sports", label: "스포츠" },
  { id: "concert", label: "공연" },
  { id: "exhibition", label: "전시" },
];

const DAY_FILTERS = [
  { id: 0, label: "일" },
  { id: 1, label: "월" },
  { id: 2, label: "화" },
  { id: 3, label: "수" },
  { id: 4, label: "목" },
  { id: 5, label: "금" },
  { id: 6, label: "토" },
];

const REGIONS = [
  { id: "서울", label: "서울" },
  { id: "경기", label: "경기" },
  { id: "인천", label: "인천" },
  { id: "부산", label: "부산" },
  { id: "대구", label: "대구" },
  { id: "대전", label: "대전" },
  { id: "광주", label: "광주" },
  { id: "울산", label: "울산" },
  { id: "전북", label: "전북" },
  { id: "전남", label: "전남" },
  { id: "경북", label: "경북" },
  { id: "경남", label: "경남" },
  { id: "충북", label: "충북" },
  { id: "충남", label: "충남" },
  { id: "강원", label: "강원" },
  { id: "제주", label: "제주" },
];

type ViewMode = "list" | "calendar";

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);

  const { data: profile } = useQuery<Profile>({
    queryKey: ["/api/profile"],
    retry: false,
  });

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days: Date[] = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    return events.filter((event) => {
      if (!event.date) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(event.category)) return false;
      if (selectedDays.length > 0) {
        const eventDate = parseISO(event.date as string);
        const eventDayOfWeek = getDay(eventDate);
        if (!selectedDays.includes(eventDayOfWeek)) return false;
      }
      if (selectedRegions.length > 0) {
        const matchesRegion = selectedRegions.some(region => event.location.includes(region));
        if (!matchesRegion) return false;
      }
      return true;
    });
  }, [events, selectedCategories, selectedDays, selectedRegions]);

  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      return parseISO(a.date as string).getTime() - parseISO(b.date as string).getTime();
    });
  }, [filteredEvents]);

  const eventsForSelectedDate = useMemo(() => {
    return filteredEvents.filter((event) => isSameDay(parseISO(event.date as string), selectedDate));
  }, [filteredEvents, selectedDate]);

  const getEventCountForDate = (date: Date) => {
    return filteredEvents.filter((event) => isSameDay(parseISO(event.date as string), date)).length;
  };

  const toggleCategory = (id: string) => setSelectedCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  const toggleDay = (id: number) => setSelectedDays(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  const toggleRegion = (id: string) => setSelectedRegions(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  const clearFilters = () => { setSelectedCategories([]); setSelectedDays([]); setSelectedRegions([]); };

  const activeFilterCount = selectedCategories.length + selectedDays.length + selectedRegions.length;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 필터 패널 (데스크탑: 항상 보임 / 모바일: 토글)
  const FilterPanel = () => (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">카테고리</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <Badge
              key={cat.id}
              variant={selectedCategories.includes(cat.id) ? "default" : "secondary"}
              className={`cursor-pointer ${selectedCategories.includes(cat.id) ? categoryColors[cat.id] : ""}`}
              onClick={() => toggleCategory(cat.id)}
            >
              {cat.label}
            </Badge>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">요일</p>
        <div className="flex flex-wrap gap-1">
          {DAY_FILTERS.map((day) => (
            <Button
              key={day.id}
              size="icon"
              variant={selectedDays.includes(day.id) ? "default" : "secondary"}
              onClick={() => toggleDay(day.id)}
              className={`rounded-full w-8 h-8 text-xs ${
                !selectedDays.includes(day.id) && day.id === 0 ? "text-red-500" :
                !selectedDays.includes(day.id) && day.id === 6 ? "text-blue-500" : ""
              }`}
            >
              {day.label}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">지역</p>
        <div className="flex flex-wrap gap-1.5">
          {REGIONS.map((region) => (
            <Badge
              key={region.id}
              variant={selectedRegions.includes(region.id) ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => toggleRegion(region.id)}
            >
              {region.label}
            </Badge>
          ))}
        </div>
      </div>
      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground w-full">
          <X className="w-4 h-4 mr-1" /> 필터 초기화
        </Button>
      )}
    </div>
  );

  return (
    <Layout activePath="/">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-[0_1px_4px_hsl(220_40%_10%/.05)]">
        <div className="flex items-center justify-between px-4 md:px-6 h-14">
          {/* 모바일: 로고 */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-7 h-7 rounded-lg bg-[#1E3A8A] flex items-center justify-center">
              <Briefcase className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-[#1E3A8A] text-sm tracking-tight">알바톡</span>
          </div>
          {/* 데스크탑: 페이지 제목 */}
          <h1 className="hidden md:block text-base font-bold text-slate-900">행사 알바 공고</h1>
          {/* 모바일: 아바타 */}
          <div className="md:hidden">
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="Profile" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                <User className="w-4 h-4 text-slate-400" />
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="md:flex md:gap-0 md:h-[calc(100vh-65px)]">

        {/* 데스크탑 필터 사이드바 */}
        <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r p-4 overflow-y-auto">
          <h2 className="font-semibold text-sm mb-4">필터</h2>
          <FilterPanel />
        </aside>

        {/* 메인 콘텐츠 영역 */}
        <div className="flex-1 overflow-y-auto">

          {/* 프로필 미완성 배너 */}
          {!profile && (
            <div
              className="mx-4 mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/15 transition-colors"
              onClick={() => navigate("/profile")}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">프로필을 완성해주세요</p>
                  <p className="text-xs text-muted-foreground">알바 신청을 위해 프로필 정보가 필요합니다</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </div>
            </div>
          )}

          {/* 뷰 모드 탭 */}
          <div className="px-4 pt-4 md:px-6">
            <div className="flex bg-muted rounded-lg p-1 w-full md:w-64">
              <button
                onClick={() => setViewMode("list")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
                data-testid="tab-list-view"
              >
                <List className="w-4 h-4" /> 목록
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "calendar" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
                data-testid="tab-calendar-view"
              >
                <Calendar className="w-4 h-4" /> 캘린더
              </button>
            </div>
          </div>

          {/* 모바일 필터 토글 */}
          <div className="px-4 pt-3 md:hidden">
            <div className="flex items-center gap-2">
              <Button
                variant={showFilters || activeFilterCount > 0 ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
                data-testid="button-toggle-filters"
              >
                <Filter className="w-4 h-4" />
                필터
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground" data-testid="button-clear-filters">
                  <X className="w-4 h-4 mr-1" /> 초기화
                </Button>
              )}
            </div>
            {showFilters && (
              <div className="mt-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                <FilterPanel />
              </div>
            )}
          </div>

          {/* 캘린더 뷰 */}
          {viewMode === "calendar" ? (
            <div className="md:flex md:gap-4 md:p-6">
              {/* 캘린더 그리드 */}
              <section className="p-4 md:p-0 md:w-80 md:shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">
                    {format(currentMonth, "yyyy년 M월", { locale: ko })}
                  </h2>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(prev => subMonths(prev, 1))} data-testid="button-prev-month">
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))} data-testid="button-next-month">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {WEEKDAYS.map((day, idx) => (
                    <div key={day} className={`text-center text-xs font-medium py-2 ${idx === 0 ? "text-red-500" : idx === 6 ? "text-blue-500" : "text-muted-foreground"}`}>
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((date) => {
                    const isSelected = isSameDay(date, selectedDate);
                    const isCurrentDay = isSameDay(date, new Date());
                    const isCurrentMonth = isSameMonth(date, currentMonth);
                    const eventCount = getEventCountForDate(date);
                    const dayOfWeek = date.getDay();
                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => setSelectedDate(date)}
                        className={`relative flex flex-col items-center justify-center py-2 rounded-lg transition-colors ${
                          isSelected ? "bg-primary text-primary-foreground" :
                          isCurrentDay ? "bg-primary/10" : "hover:bg-muted"
                        } ${!isCurrentMonth ? "opacity-30" : ""}`}
                        data-testid={`button-date-${format(date, "yyyy-MM-dd")}`}
                      >
                        <span className={`text-sm font-medium ${
                          isSelected ? "text-primary-foreground" :
                          dayOfWeek === 0 ? "text-red-500" :
                          dayOfWeek === 6 ? "text-blue-500" : ""
                        }`}>
                          {format(date, "d")}
                        </span>
                        {eventCount > 0 && (
                          <div className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? "bg-primary-foreground" : "bg-primary"}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* 선택된 날짜의 행사 목록 */}
              <section className="flex-1 px-4 pb-4 md:p-0" data-testid="section-calendar-events">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold" data-testid="text-selected-date-header">
                    {format(selectedDate, "M월 d일 (EEE)", { locale: ko })} 행사
                  </h3>
                  <Badge variant="secondary" className="text-xs" data-testid="badge-date-event-count">
                    {eventsForSelectedDate.length}개
                  </Badge>
                </div>
                {eventsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="p-4">
                        <Skeleton className="h-5 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2 mb-3" />
                        <Skeleton className="h-4 w-2/3" />
                      </Card>
                    ))}
                  </div>
                ) : eventsForSelectedDate.length === 0 ? (
                  <div className="text-center py-12" data-testid="empty-state-calendar">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                      <Briefcase className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-sm" data-testid="text-calendar-empty">이 날짜에 등록된 행사가 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
                    {eventsForSelectedDate.map((event) => (
                      <EventCard key={event.id} event={event} onClick={() => navigate(`/event/${event.id}`)} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : (
            /* 리스트 뷰 */
            <section className="flex-1 px-4 pt-4 pb-24 md:px-6 md:pb-6" data-testid="section-list-view">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold" data-testid="text-list-header">전체 행사</h3>
                <Badge variant="secondary" className="text-xs" data-testid="badge-event-count">
                  {sortedEvents.length}개
                </Badge>
              </div>
              {eventsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="p-4">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-3" />
                      <Skeleton className="h-4 w-2/3" />
                    </Card>
                  ))}
                </div>
              ) : sortedEvents.length === 0 ? (
                <div className="text-center py-12" data-testid="empty-state-list">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                    <Briefcase className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm" data-testid="text-empty-message">
                    {activeFilterCount > 0 ? "필터 조건에 맞는 행사가 없습니다" : "등록된 행사가 없습니다"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {sortedEvents.map((event) => (
                    <EventCard key={event.id} event={event} onClick={() => navigate(`/event/${event.id}`)} showDate />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </Layout>
  );
}

function EventCard({
  event,
  onClick,
  showDate = false,
}: {
  event: Event;
  onClick: () => void;
  showDate?: boolean;
}) {
  const eventDate = parseISO(event.date as string);
  const catColor = categoryColors[event.category] || "bg-slate-50 text-slate-500 border border-slate-200";
  const catLabel = categoryLabels[event.category] || event.category;

  return (
    <div
      className="bg-white border border-slate-200 rounded-xl p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
      onClick={onClick}
      data-testid={`card-event-${event.id}`}
    >
      {/* 제목 + 카테고리 */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-[#1E3A8A] transition-colors">
          {event.title}
        </h4>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${catColor}`}>
          {catLabel}
        </span>
      </div>

      {/* 메타 정보 */}
      <div className="space-y-1.5 mb-4">
        {showDate && (
          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
            <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            {format(eventDate, "M월 d일 (EEE)", { locale: ko })}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
          <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          {event.startTime} – {event.endTime}
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span className="line-clamp-1">{event.location}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
          <Users className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          {event.positionsAvailable}명 모집
        </div>
      </div>

      {/* 급여 + 버튼 */}
      <div className="flex items-center justify-between pt-3.5 border-t border-slate-100">
        <span className="text-[#1E3A8A] font-bold text-sm">
          {event.wage ? `일급 ${event.wage.toLocaleString()}원` : "급여 문의"}
        </span>
        <button
          className="text-xs font-semibold text-[#1E3A8A] bg-blue-50 hover:bg-[#1E3A8A] hover:text-white px-3 py-1.5 rounded-lg transition-colors"
          data-testid={`button-apply-${event.id}`}
        >
          상세보기
        </button>
      </div>
    </div>
  );
}

