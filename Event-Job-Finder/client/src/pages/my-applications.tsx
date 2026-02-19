import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isPast, isToday } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar, MapPin, Clock, Briefcase, FileText, CheckCircle, XCircle, Clock3, History, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import type { Application, Event } from "@/types";

interface ApplicationWithEvent extends Application {
  event: Event;
}

const statusLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "대기중",
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: <Clock3 className="w-3 h-3" />,
  },
  hired: {
    label: "채용",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: <CheckCircle className="w-3 h-3" />,
  },
  rejected: {
    label: "미채용",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: <XCircle className="w-3 h-3" />,
  },
};

const categoryLabels: Record<string, string> = {
  sports: "스포츠",
  concert: "공연",
  exhibition: "전시",
};

const wageTypeLabels: Record<string, string> = {
  hourly: "시급",
  daily: "일급",
  per_event: "행사당",
};

export default function MyApplications() {
  const [, navigate] = useLocation();

  const { data: applications, isLoading } = useQuery<ApplicationWithEvent[]>({
    queryKey: ["/api/my-applications"],
  });

  const validApplications = applications?.filter(app => app.event) || [];

  // 채용된 모든 지원 (날짜 무관) - 서류 제출을 위해 항상 채용 탭에 표시
  const hiredApps = validApplications.filter(app => app.status === "hired");

  const pendingApps = validApplications.filter(app => app.status === "pending");

  // 이력: 날짜 지난 완료 근무 + 미채용
  const pastWork = validApplications.filter(app => {
    const eventDate = parseISO(app.event.date as string);
    return app.status === "hired" && isPast(eventDate) && !isToday(eventDate);
  });

  const rejectedApps = validApplications.filter(app => app.status === "rejected");

  return (
    <Layout activePath="/my-applications">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 backdrop-blur-lg bg-background/95 border-b">
        <div className="flex items-center gap-3 p-4 md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
          <h1 className="font-semibold text-base">지원현황</h1>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="pb-24 md:pb-6 md:px-6">
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="w-full justify-start px-4 md:px-0 pt-4 bg-transparent gap-2">
            <TabsTrigger value="pending" className="flex items-center gap-1">
              <Clock3 className="w-3.5 h-3.5" />
              대기 ({pendingApps.length})
            </TabsTrigger>
            <TabsTrigger value="hired" className="flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              채용 ({hiredApps.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1">
              <History className="w-3.5 h-3.5" />
              이력 ({pastWork.length + rejectedApps.length})
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="p-4 md:p-0 md:pt-4 space-y-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-3" />
                  <Skeleton className="h-4 w-2/3" />
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* 대기 탭 */}
              <TabsContent value="pending" className="p-4 md:p-0 md:pt-4">
                {pendingApps.length === 0 ? (
                  <EmptyState
                    icon={<Clock3 className="w-8 h-8 text-muted-foreground" />}
                    message="대기중인 지원이 없습니다"
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {pendingApps.map(app => (
                      <ApplicationCard
                        key={app.id}
                        application={app}
                        onClick={() => navigate(`/event/${app.eventId}`)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* 채용 탭 */}
              <TabsContent value="hired" className="p-4 md:p-0 md:pt-4">
                {hiredApps.length === 0 ? (
                  <EmptyState
                    icon={<CheckCircle className="w-8 h-8 text-muted-foreground" />}
                    message="채용된 알바가 없습니다"
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {hiredApps.map(app => (
                      <HiredApplicationCard
                        key={app.id}
                        application={app}
                        onViewEvent={() => navigate(`/event/${app.eventId}`)}
                        onOpenDocuments={() => navigate(`/hiring-documents/${app.id}`)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* 이력 탭 */}
              <TabsContent value="history" className="p-4 md:p-0 md:pt-4">
                {pastWork.length === 0 && rejectedApps.length === 0 ? (
                  <EmptyState
                    icon={<History className="w-8 h-8 text-muted-foreground" />}
                    message="지원 이력이 없습니다"
                  />
                ) : (
                  <>
                    {pastWork.length > 0 && (
                      <>
                        <div className="pb-2">
                          <h3 className="text-sm font-medium text-muted-foreground">완료된 근무</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-4">
                          {pastWork.map(app => (
                            <ApplicationCard
                              key={app.id}
                              application={app}
                              onClick={() => navigate(`/event/${app.eventId}`)}
                              isPast
                            />
                          ))}
                        </div>
                      </>
                    )}
                    {rejectedApps.length > 0 && (
                      <>
                        <div className="pt-4 pb-2">
                          <h3 className="text-sm font-medium text-muted-foreground">미채용 내역</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {rejectedApps.map(app => (
                            <ApplicationCard
                              key={app.id}
                              application={app}
                              onClick={() => navigate(`/event/${app.eventId}`)}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </Layout>
  );
}

function ApplicationCard({
  application,
  onClick,
  isPast = false,
}: {
  application: ApplicationWithEvent;
  onClick: () => void;
  isPast?: boolean;
}) {
  const { event, status } = application;
  const statusInfo = statusLabels[status] || statusLabels.pending;
  const eventDate = parseISO(event.date as string);

  return (
    <Card className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${isPast ? "opacity-70" : ""}`} onClick={onClick}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm line-clamp-1">{event.title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {categoryLabels[event.category] || event.category}
          </p>
        </div>
        <Badge className={`shrink-0 flex items-center gap-1 ${statusInfo.color}`}>
          {statusInfo.icon}
          {statusInfo.label}
        </Badge>
      </div>
      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" />
          <span>{format(eventDate, "M월 d일 (EEE)", { locale: ko })}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          <span>{event.startTime} - {event.endTime}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5" />
          <span className="line-clamp-1">{event.location}</span>
        </div>
      </div>
      {isPast && (
        <div className="mt-3 pt-3 border-t flex items-center justify-between">
          <span className="text-xs text-muted-foreground">근무 완료</span>
          <span className="text-sm font-medium">
            {wageTypeLabels[event.wageType || "daily"]} {event.wage?.toLocaleString()}원
          </span>
        </div>
      )}
    </Card>
  );
}

function HiredApplicationCard({
  application,
  onViewEvent,
  onOpenDocuments,
}: {
  application: ApplicationWithEvent;
  onViewEvent: () => void;
  onOpenDocuments: () => void;
}) {
  const { event } = application;
  const eventDate = parseISO(event.date as string);
  const hasSubmittedDocs = !!application.documentsSubmittedAt;

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm line-clamp-1">{event.title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {categoryLabels[event.category] || event.category}
            </p>
          </div>
          <Badge className="shrink-0 flex items-center gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="w-3 h-3" />
            채용
          </Badge>
        </div>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>{format(eventDate, "M월 d일 (EEE)", { locale: ko })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            <span>{event.startTime} - {event.endTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" />
            <span className="line-clamp-1">{event.location}</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t flex items-center justify-between">
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">채용 확정</span>
          <span className="text-sm font-semibold text-primary">
            {wageTypeLabels[event.wageType || "daily"]} {event.wage?.toLocaleString()}원
          </span>
        </div>
      </div>

      <div className="border-t flex">
        <button
          onClick={onViewEvent}
          className="flex-1 py-3 text-xs font-medium text-muted-foreground hover:bg-muted/50 flex items-center justify-center gap-1 transition-colors"
        >
          상세보기
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <div className="w-px bg-border" />
        <button
          onClick={onOpenDocuments}
          className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
            hasSubmittedDocs
              ? "text-green-600 dark:text-green-400 hover:bg-muted/50"
              : "text-primary hover:bg-muted/50"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          {hasSubmittedDocs ? "서류 제출 완료 ✓" : "서류 제출하기"}
        </button>
      </div>
    </Card>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
        {icon}
      </div>
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}

