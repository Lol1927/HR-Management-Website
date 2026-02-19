import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO, getDay } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowLeft, MapPin, Clock, Users, Calendar, Wallet, CheckCircle2, AlertCircle, Briefcase, Navigation, CreditCard, FileText, Save } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, useParams } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Event, Application, Profile } from "@/types";

const categoryColors: Record<string, string> = {
  sports: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  concert: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  exhibition: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

const categoryLabels: Record<string, string> = {
  sports: "스포츠",
  concert: "공연",
  exhibition: "전시",
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "심사중", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  hired: { label: "채용", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { label: "미채용", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const wageTypeLabels: Record<string, string> = {
  hourly: "시급",
  daily: "일급",
  per_event: "행사당",
};

const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isLoading: authLoading } = useAuth();
  
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [selfIntroduction, setSelfIntroduction] = useState("");
  const [saveIntroduction, setSaveIntroduction] = useState(false);

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ["/api/events", id],
    enabled: !!id,
  });

  const { data: profile } = useQuery<Profile>({
    queryKey: ["/api/profile"],
    retry: false,
  });

  const { data: application, isLoading: applicationLoading } = useQuery<Application>({
    queryKey: ["/api/applications/by-event", id],
    enabled: !!id,
    retry: false,
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/applications", { 
        eventId: id,
        selfIntroduction,
        saveIntroduction
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "지원 완료",
        description: "알바 지원이 접수되었습니다",
      });
      setShowApplyDialog(false);
      setSelfIntroduction("");
      queryClient.invalidateQueries({ queryKey: ["/api/applications/by-event", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-applications"] });
      if (saveIntroduction) {
        queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      }
    },
    onError: () => {
      toast({
        title: "지원 실패",
        description: "다시 시도해주세요",
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/applications/${application?.id}`);
      return res;
    },
    onSuccess: () => {
      toast({
        title: "취소 완료",
        description: "지원이 취소되었습니다",
      });
      // Clear application cache directly to update UI immediately
      queryClient.setQueryData(["/api/applications/by-event", id], null);
      queryClient.invalidateQueries({ queryKey: ["/api/my-applications"] });
    },
    onError: () => {
      toast({
        title: "취소 실패",
        description: "다시 시도해주세요",
        variant: "destructive",
      });
    },
  });

  const handleOpenApplyDialog = () => {
    if (!profile) {
      toast({
        title: "프로필 필요",
        description: "먼저 프로필을 작성해주세요",
        variant: "destructive",
      });
      navigate("/profile");
      return;
    }
    // Pre-fill with saved introduction if available
    if (profile.selfIntroduction) {
      setSelfIntroduction(profile.selfIntroduction);
    }
    setShowApplyDialog(true);
  };

  const handleSubmitApplication = () => {
    if (!selfIntroduction.trim()) {
      toast({
        title: "자기소개 필요",
        description: "자기소개를 입력해주세요",
        variant: "destructive",
      });
      return;
    }
    applyMutation.mutate();
  };

  const handleLoadSavedIntro = () => {
    if (profile?.selfIntroduction) {
      setSelfIntroduction(profile.selfIntroduction);
      toast({
        title: "불러오기 완료",
        description: "저장된 자기소개를 불러왔습니다",
      });
    }
  };

  if (authLoading || eventLoading) {
    return (
      <Layout>
        <header className="sticky top-0 z-30 backdrop-blur-lg bg-background/95 border-b">
          <div className="flex items-center gap-3 p-4 md:px-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <div className="p-4 md:p-6 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
          <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">행사를 찾을 수 없습니다</p>
          <Button variant="outline" onClick={() => navigate("/")} className="mt-4">
            홈으로 돌아가기
          </Button>
        </div>
      </Layout>
    );
  }

  const eventDate = parseISO(event.date as string);
  const workDates = (event.workDates || [event.date]) as string[];
  const hasWeekendHours = event.weekendStartTime && event.weekendEndTime;

  // Categorize work dates by weekday/weekend
  const categorizedDates = workDates.map(dateStr => {
    const date = parseISO(dateStr);
    const dayOfWeek = getDay(date);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    return { date, dateStr, dayOfWeek, isWeekend };
  });

  return (
    <Layout>
      {/* 헤더 */}
      <header className="sticky top-0 z-30 backdrop-blur-lg bg-background/95 border-b">
        <div className="flex items-center gap-3 p-4 md:px-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold truncate flex-1">행사 상세</h1>
        </div>
      </header>

      <main className="p-4 md:p-6 space-y-4 md:max-w-3xl pb-24 md:pb-8">
        {/* Event Header */}
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 className="font-semibold text-lg leading-tight" data-testid="text-event-title">{event.title}</h2>
            <Badge className={categoryColors[event.category] || ""} data-testid="badge-category">
              {categoryLabels[event.category] || event.category}
            </Badge>
          </div>

          {/* Application Status */}
          {application && (
            <div className="mb-4 p-3 rounded-lg bg-muted flex items-center gap-3" data-testid="status-application">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">지원 완료</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(application.appliedAt!), "M월 d일 HH:mm", { locale: ko })} 지원
                </p>
              </div>
              <Badge className={statusLabels[application.status]?.color || ""}>
                {statusLabels[application.status]?.label || application.status}
              </Badge>
            </div>
          )}

          <div className="space-y-3">
            {/* Job Type */}
            {event.jobType && (
              <InfoRow
                icon={<Briefcase className="w-4 h-4 text-muted-foreground" />}
                label="업무"
                value={event.jobType}
                testId="text-job-type"
              />
            )}
            
            {/* Location */}
            <InfoRow
              icon={<MapPin className="w-4 h-4 text-muted-foreground" />}
              label="근무지"
              value={event.location}
              testId="text-location"
            />
            
            {/* Address */}
            {event.address && (
              <div className="flex items-start gap-3 pl-7">
                <span className="text-xs text-muted-foreground">({event.address})</span>
              </div>
            )}
          </div>
        </Card>

        {/* Work Hours */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">근무시간</h3>
          </div>
          <div className="space-y-2 text-sm" data-testid="section-work-hours">
            {hasWeekendHours ? (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">평일</Badge>
                  <span>월-금 {event.startTime} ~ {event.endTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">주말</Badge>
                  <span>토-일 {event.weekendStartTime} ~ {event.weekendEndTime}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span>{event.startTime} ~ {event.endTime}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Payment Info */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">보수지급</h3>
          </div>
          <div className="space-y-2" data-testid="section-payment">
            <p className="text-lg font-semibold text-primary" data-testid="text-wage">
              {wageTypeLabels[event.wageType || "hourly"]} {event.wage?.toLocaleString()}원
            </p>
            {event.wageNote && (
              <p className="text-sm text-muted-foreground" data-testid="text-wage-note">
                ({event.wageNote})
              </p>
            )}
          </div>
        </Card>

        {/* Work Dates */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">근무일</h3>
            <Badge variant="secondary" className="text-xs ml-auto">{workDates.length}일</Badge>
          </div>
          <div className="space-y-1 text-sm" data-testid="section-work-dates">
            {categorizedDates.map(({ date, dayOfWeek, isWeekend }, index) => (
              <div key={index} className="flex items-center gap-3 py-1">
                <span className="w-20">{format(date, "M월 d일", { locale: ko })}</span>
                <span className={`w-6 ${dayOfWeek === 0 ? "text-red-500" : dayOfWeek === 6 ? "text-blue-500" : ""}`}>
                  {dayLabels[dayOfWeek]}
                </span>
                <Badge 
                  variant={isWeekend ? "default" : "secondary"} 
                  className="text-xs"
                >
                  {isWeekend ? "주말" : "평일"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Additional Info */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">모집 정보</h3>
          </div>
          <p className="text-sm" data-testid="text-positions">
            모집 인원: <span className="font-semibold">{event.positionsAvailable}명</span>
          </p>
        </Card>

        {/* Description */}
        {event.description && (
          <Card className="p-4">
            <h3 className="font-medium mb-2">상세 설명</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-description">
              {event.description}
            </p>
          </Card>
        )}

        {/* Profile Warning */}
        {!profile && (
          <Card 
            className="p-4 bg-destructive/5 border-destructive/20 cursor-pointer hover-elevate"
            onClick={() => navigate("/profile")}
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <div>
                <p className="font-medium text-sm">프로필을 먼저 작성해주세요</p>
                <p className="text-xs text-muted-foreground">지원을 위해 프로필 정보가 필요합니다</p>
              </div>
            </div>
          </Card>
        )}

        {/* 데스크탑 지원 버튼 */}
        <div className="hidden md:block">
          {application ? (
            application.status === "pending" ? (
              <Button
                variant="outline"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                data-testid="button-cancel-application-desktop"
              >
                {cancelMutation.isPending ? "취소 중..." : "지원 취소하기"}
              </Button>
            ) : (
              <Button disabled>
                {statusLabels[application.status]?.label || application.status}
              </Button>
            )
          ) : (
            <Button
              onClick={handleOpenApplyDialog}
              disabled={applyMutation.isPending || !profile}
              data-testid="button-apply-desktop"
            >
              {applyMutation.isPending ? "지원 중..." : "알바 지원하기"}
            </Button>
          )}
        </div>
      </main>

      {/* Apply Button - 모바일 fixed */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden p-4 bg-background border-t">
        <div className="max-w-lg mx-auto">
          {application ? (
            application.status === "pending" ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                data-testid="button-cancel-application"
              >
                {cancelMutation.isPending ? "취소 중..." : "지원 취소하기"}
              </Button>
            ) : (
              <Button className="w-full" disabled>
                {statusLabels[application.status]?.label || application.status}
              </Button>
            )
          ) : (
            <Button
              className="w-full"
              onClick={handleOpenApplyDialog}
              disabled={applyMutation.isPending || !profile}
              data-testid="button-apply"
            >
              {applyMutation.isPending ? "지원 중..." : "알바 지원하기"}
            </Button>
          )}
        </div>
      </div>

      {/* Application Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              알바 지원하기
            </DialogTitle>
            <DialogDescription>
              자기소개를 작성하여 어필해보세요
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="self-introduction">자기소개/어필</Label>
                {profile?.selfIntroduction && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={handleLoadSavedIntro}
                    data-testid="button-load-saved-intro"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    저장된 내용 불러오기
                  </Button>
                )}
              </div>
              <Textarea
                id="self-introduction"
                placeholder="나를 어필할 수 있는 내용을 작성해주세요. 예: 관련 경험, 성실함, 지원 동기 등"
                value={selfIntroduction}
                onChange={(e) => setSelfIntroduction(e.target.value)}
                className="min-h-[150px]"
                data-testid="textarea-self-introduction"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="save-introduction"
                checked={saveIntroduction}
                onCheckedChange={(checked) => setSaveIntroduction(checked as boolean)}
                data-testid="checkbox-save-introduction"
              />
              <Label 
                htmlFor="save-introduction" 
                className="text-sm text-muted-foreground cursor-pointer"
              >
                이 자기소개를 저장하여 다음 지원에 사용하기
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowApplyDialog(false)}
              data-testid="button-cancel-dialog"
            >
              취소
            </Button>
            <Button 
              onClick={handleSubmitApplication}
              disabled={applyMutation.isPending || !selfIntroduction.trim()}
              data-testid="button-submit-application"
            >
              {applyMutation.isPending ? "지원 중..." : "지원하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function InfoRow({ 
  icon, 
  label, 
  value, 
  highlight,
  testId
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string;
  highlight?: boolean;
  testId?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <span className="text-sm text-muted-foreground w-16">{label}</span>
      <span 
        className={`text-sm flex-1 ${highlight ? "font-semibold text-primary" : ""}`}
        data-testid={testId}
      >
        {value}
      </span>
    </div>
  );
}
