import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import {
  ArrowLeft, CheckCircle, Calendar, Clock, MapPin,
  CreditCard, FileText, Camera, IdCard, Shirt, AlertCircle,
  X, RotateCcw, Upload, SwitchCamera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import type { Application, Event, Profile } from "@/types";

type CaptureType = "photo" | "id-card";

interface ApplicationWithEvent extends Application {
  event: Event;
}

const banks = [
  "국민은행", "신한은행", "우리은행", "하나은행", "농협은행",
  "기업은행", "카카오뱅크", "토스뱅크", "SC제일은행", "씨티은행",
];

const wageTypeLabels: Record<string, string> = {
  hourly: "시급",
  daily: "일급",
  per_event: "행사당",
};

// ── 이미지 압축 (파일 → base64) ────────────────────────────────────────────
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const maxDim = 800;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("이미지 로드 실패"));
    };
    img.src = objectUrl;
  });
}

// ── 얼굴 위치 가이드 오버레이 ──────────────────────────────────────────────
function FaceGuide() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 177"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <mask id="face-hole">
          <rect width="100" height="177" fill="white" />
          <ellipse cx="50" cy="74" rx="26" ry="33" fill="black" />
        </mask>
      </defs>
      {/* 어두운 오버레이 (타원 구멍 뚫림) */}
      <rect width="100" height="177" fill="rgba(0,0,0,0.58)" mask="url(#face-hole)" />
      {/* 타원 테두리 - 초록 점선 */}
      <ellipse
        cx="50" cy="74" rx="26" ry="33"
        fill="none" stroke="#4ade80" strokeWidth="0.7" strokeDasharray="2.5 1.5"
      />
      {/* 상단 중앙 포인터 */}
      <line x1="50" y1="38" x2="50" y2="33" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
      <circle cx="50" cy="32" r="0.8" fill="rgba(255,255,255,0.5)" />
      {/* 하단 중앙 포인터 */}
      <line x1="50" y1="110" x2="50" y2="115" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
      <circle cx="50" cy="116" r="0.8" fill="rgba(255,255,255,0.5)" />
      {/* 좌우 포인터 */}
      <line x1="21" y1="74" x2="16" y2="74" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
      <circle cx="15" cy="74" r="0.8" fill="rgba(255,255,255,0.5)" />
      <line x1="79" y1="74" x2="84" y2="74" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
      <circle cx="85" cy="74" r="0.8" fill="rgba(255,255,255,0.5)" />
      {/* 십자 중심 */}
      <line x1="47" y1="74" x2="53" y2="74" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" />
      <line x1="50" y1="71" x2="50" y2="77" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" />
    </svg>
  );
}

// ── 신분증 위치 가이드 오버레이 ────────────────────────────────────────────
function IdCardGuide() {
  // 신분증 비율 85.6:54 ≈ 1.585:1 → viewBox 100x177 기준
  const x = 11, y = 64, w = 78, h = 49;
  const cLen = 7;
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 177"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <mask id="card-hole">
          <rect width="100" height="177" fill="white" />
          <rect x={x} y={y} width={w} height={h} rx="2" fill="black" />
        </mask>
      </defs>
      {/* 어두운 오버레이 (사각형 구멍 뚫림) */}
      <rect width="100" height="177" fill="rgba(0,0,0,0.58)" mask="url(#card-hole)" />
      {/* 모서리 마커 - 왼쪽 위 */}
      <polyline
        points={`${x},${y + cLen} ${x},${y} ${x + cLen},${y}`}
        fill="none" stroke="#4ade80" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* 모서리 마커 - 오른쪽 위 */}
      <polyline
        points={`${x + w - cLen},${y} ${x + w},${y} ${x + w},${y + cLen}`}
        fill="none" stroke="#4ade80" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* 모서리 마커 - 왼쪽 아래 */}
      <polyline
        points={`${x},${y + h - cLen} ${x},${y + h} ${x + cLen},${y + h}`}
        fill="none" stroke="#4ade80" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* 모서리 마커 - 오른쪽 아래 */}
      <polyline
        points={`${x + w - cLen},${y + h} ${x + w},${y + h} ${x + w},${y + h - cLen}`}
        fill="none" stroke="#4ade80" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* 중앙 가로 보조선 */}
      <line
        x1={x + 2} y1={y + h / 2} x2={x + 8} y2={y + h / 2}
        stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"
      />
      <line
        x1={x + w - 8} y1={y + h / 2} x2={x + w - 2} y2={y + h / 2}
        stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"
      />
    </svg>
  );
}

// ── 카메라 모달 ────────────────────────────────────────────────────────────
interface CameraModalProps {
  open: boolean;
  type: CaptureType;
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

function CameraModal({ open, type, onCapture, onClose }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    type === "photo" ? "user" : "environment"
  );
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async (mode: "user" | "environment") => {
    stopCamera();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError("카메라를 사용할 수 없습니다.\n카메라 권한을 허용해주세요.");
    }
  }, [stopCamera]);

  // 모달 열릴 때 초기화 + 카메라 시작
  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }
    setCaptured(null);
    setCameraError(null);
    startCamera(facingMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 바디 스크롤 잠금
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // 언마운트 시 정리
  useEffect(() => () => stopCamera(), [stopCamera]);

  const flipCamera = () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    startCamera(next);
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const maxDim = 800;
    const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCaptured(canvas.toDataURL("image/jpeg", 0.78));
    stopCamera();
  };

  const handleConfirm = () => {
    if (captured) {
      onCapture(captured);
      setCaptured(null);
      onClose();
    }
  };

  const handleRetake = () => {
    setCaptured(null);
    startCamera(facingMode);
  };

  const handleClose = () => {
    stopCamera();
    setCaptured(null);
    onClose();
  };

  if (!open) return null;

  return (
    /* 백드롭: 모바일=풀블랙, 데스크탑=반투명 + 중앙 정렬 */
    <div
      className="fixed inset-0 z-[100] select-none bg-black md:bg-black/75 md:flex md:items-center md:justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      {/* 팝업 컨테이너: 모바일=풀스크린, 데스크탑=고정 크기 팝업 */}
      <div className="bg-black flex flex-col w-full h-full md:w-[390px] md:h-[640px] md:rounded-2xl md:overflow-hidden md:shadow-2xl">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 text-white shrink-0 bg-black/30">
          <button
            onClick={handleClose}
            className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold tracking-wide">
            {type === "photo" ? "본인 사진 촬영" : "신분증 촬영"}
          </h2>
          {!captured ? (
            <button
              onClick={flipCamera}
              className="p-2 -mr-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="카메라 전환"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-9" />
          )}
        </div>

        {/* 카메라 뷰포트 */}
        <div className="flex-1 relative overflow-hidden bg-black">
          {!captured ? (
            <>
              {cameraError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8 text-center gap-4">
                  <Camera className="w-14 h-14 opacity-30" />
                  <p className="text-sm opacity-60 whitespace-pre-line leading-relaxed">
                    {cameraError}
                  </p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* 위치 가이드 오버레이 */}
                  {type === "photo" ? <FaceGuide /> : <IdCardGuide />}
                </>
              )}
            </>
          ) : (
            // 촬영된 사진 미리보기
            <img
              src={captured}
              alt="촬영된 사진"
              className="absolute inset-0 w-full h-full object-contain"
            />
          )}
        </div>

        {/* 안내 문구 */}
        {!captured && !cameraError && (
          <div className="py-2.5 text-center shrink-0 bg-black/20">
            <p className="text-white/65 text-xs tracking-wide">
              {type === "photo"
                ? "얼굴을 타원 안에 맞추고 촬영하세요"
                : "신분증을 테두리 안에 맞추고 촬영하세요"}
            </p>
          </div>
        )}

        {/* 하단 컨트롤 */}
        <div className="py-6 flex items-center justify-center gap-10 shrink-0 bg-black/10">
          {!captured ? (
            /* 셔터 버튼 */
            <button
              onClick={handleCapture}
              disabled={!!cameraError}
              aria-label="촬영"
              className="w-16 h-16 rounded-full border-4 border-white/80 flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform"
            >
              <div className="w-11 h-11 rounded-full bg-white" />
            </button>
          ) : (
            /* 다시찍기 / 사용하기 */
            <>
              <button onClick={handleRetake} className="flex flex-col items-center gap-2 text-white">
                <div className="w-12 h-12 rounded-full border-2 border-white/50 flex items-center justify-center hover:border-white/80 transition-colors">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <span className="text-xs opacity-60">다시 찍기</span>
              </button>
              <button onClick={handleConfirm} className="flex flex-col items-center gap-2 text-white">
                <div className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-400 flex items-center justify-center transition-colors">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <span className="text-xs opacity-60">사용하기</span>
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

// ── 이미지 업로드 필드 (파일 선택 + 사진 찍기) ────────────────────────────
interface ImageUploadFieldProps {
  label: string;
  type: CaptureType;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}

function ImageUploadField({ label, type, hint, value, onChange }: ImageUploadFieldProps) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const compressed = await compressImage(file);
      onChange(compressed);
    } catch {
      // 압축 실패 시 무시
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>

      {/* 이미지 미리보기 */}
      {value && (
        <div className="relative rounded-xl overflow-hidden border bg-muted/50">
          <img
            src={value}
            alt={label}
            className="w-full max-h-52 object-contain"
          />
          {/* 삭제 버튼 */}
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
            aria-label="이미지 삭제"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          {/* 완료 배지 */}
          <div className="absolute bottom-2 left-2 bg-black/60 rounded-full px-2 py-0.5 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-400" />
            <span className="text-white text-[10px]">업로드 완료</span>
          </div>
        </div>
      )}

      {/* 파일 선택 / 사진 찍기 버튼 */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors text-sm text-muted-foreground hover:text-primary disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload className="w-4 h-4 shrink-0" />
          )}
          <span className="truncate">파일 선택</span>
        </button>
        <button
          type="button"
          onClick={() => setCameraOpen(true)}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors text-sm text-muted-foreground hover:text-primary disabled:opacity-50"
        >
          <Camera className="w-4 h-4 shrink-0" />
          <span className="truncate">사진 찍기</span>
        </button>
      </div>

      {!value && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <CameraModal
        open={cameraOpen}
        type={type}
        onCapture={onChange}
        onClose={() => setCameraOpen(false)}
      />
    </div>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────
export default function HiringDocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: application, isLoading } = useQuery<ApplicationWithEvent>({
    queryKey: ["/api/applications/detail", id],
    enabled: !!id,
  });

  const { data: profile } = useQuery<Profile>({
    queryKey: ["/api/profile"],
    retry: false,
  });

  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [idCardUrl, setIdCardUrl] = useState("");
  const [confirmedDressCode, setConfirmedDressCode] = useState(false);
  const [confirmedRules, setConfirmedRules] = useState(false);

  // 기존 제출 데이터 채우기
  useEffect(() => {
    if (application) {
      setBankName(application.bankName || "");
      setBankAccount(application.bankAccount || "");
      setPhotoUrl(application.photoUrl || "");
      setIdCardUrl(application.idCardUrl || "");
      setConfirmedDressCode(application.confirmedDressCode || false);
      setConfirmedRules(application.confirmedRules || false);
    }
  }, [application]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/applications/${id}`, {
        bankName,
        bankAccount,
        photoUrl,
        idCardUrl,
        confirmedDressCode,
        confirmedRules,
        documentsSubmittedAt: new Date().toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "서류 제출 완료", description: "정산 서류가 제출되었습니다" });
      queryClient.invalidateQueries({ queryKey: ["/api/my-applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/detail", id] });
      navigate("/my-applications");
    },
    onError: () => {
      toast({ title: "제출 실패", description: "다시 시도해주세요", variant: "destructive" });
    },
  });

  const canSubmit =
    !!bankName &&
    !!bankAccount &&
    !(application?.event?.dressCode && !confirmedDressCode) &&
    !(application?.event?.rules && !confirmedRules);

  if (isLoading) {
    return (
      <Layout activePath="/my-applications">
        <header className="sticky top-0 z-30 backdrop-blur-lg bg-background/95 border-b">
          <div className="flex items-center gap-3 p-4 md:px-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/my-applications")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Skeleton className="h-6 w-40" />
          </div>
        </header>
        <div className="p-4 md:p-6 space-y-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </Layout>
    );
  }

  if (!application) {
    return (
      <Layout activePath="/my-applications">
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
          <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">지원 정보를 찾을 수 없습니다</p>
          <Button variant="outline" onClick={() => navigate("/my-applications")} className="mt-4">
            돌아가기
          </Button>
        </div>
      </Layout>
    );
  }

  const event = application.event;
  const eventDate = parseISO(event.date as string);

  return (
    <Layout activePath="/my-applications">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 backdrop-blur-lg bg-background/95 border-b">
        <div className="flex items-center gap-3 p-4 md:px-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/my-applications")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-sm">채용 서류 제출</h1>
            <p className="text-xs text-muted-foreground line-clamp-1">{event.title}</p>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6 space-y-4 md:max-w-2xl pb-32 md:pb-8">

        {/* 채용 확정 정보 */}
        <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <h3 className="font-medium text-green-700 dark:text-green-400 flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4" />
            채용 확정
          </h3>
          <p className="text-sm font-semibold mb-2">{event.title}</p>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              {format(eventDate, "M월 d일 (EEE)", { locale: ko })}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              {event.startTime} - {event.endTime}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              {event.location}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
            <p className="text-base font-semibold text-primary">
              {wageTypeLabels[event.wageType || "daily"]} {event.wage?.toLocaleString()}원
            </p>
            {event.wageNote && (
              <p className="text-xs text-muted-foreground mt-0.5">{event.wageNote}</p>
            )}
          </div>
        </Card>

        {/* 복장 규정 확인 */}
        {event.dressCode && (
          <Card className="p-4 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
            <h3 className="font-medium text-sm mb-3 flex items-center gap-2 text-purple-700 dark:text-purple-400">
              <Shirt className="w-4 h-4" />
              복장 규정
            </h3>
            <p className="text-sm whitespace-pre-line mb-4">{event.dressCode}</p>
            <div className="flex items-start gap-3 p-3 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
              <Checkbox
                id="confirm-dress-code"
                checked={confirmedDressCode}
                onCheckedChange={(v) => setConfirmedDressCode(v as boolean)}
              />
              <label htmlFor="confirm-dress-code" className="text-sm font-medium cursor-pointer">
                복장 규정을 확인했습니다
              </label>
            </div>
          </Card>
        )}

        {/* 규칙 안내 확인 */}
        {event.rules && (
          <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <h3 className="font-medium text-sm mb-3 flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              규칙 안내
            </h3>
            <p className="text-sm whitespace-pre-line mb-4">{event.rules}</p>
            <div className="flex items-start gap-3 p-3 bg-red-100 dark:bg-red-900/40 rounded-lg">
              <Checkbox
                id="confirm-rules"
                checked={confirmedRules}
                onCheckedChange={(v) => setConfirmedRules(v as boolean)}
              />
              <label htmlFor="confirm-rules" className="text-sm font-medium cursor-pointer">
                규칙 안내를 확인했습니다
              </label>
            </div>
          </Card>
        )}

        {/* 정산 안내 */}
        <Card className="p-4 bg-muted/50">
          <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            정산 안내
          </h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>- 신분증 사본 (주민등록번호 전체 포함)</li>
            <li>- 통장/계좌 정보 (사진 또는 캡처)</li>
            <li>- 담당자 연락처로 전달 바랍니다.</li>
          </ul>
        </Card>

        {/* 주민등록번호 (프로필) */}
        {profile?.residentNumber && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <IdCard className="w-4 h-4" />
              주민등록번호
            </Label>
            <Input
              value={profile.residentNumber.replace(/(\d{6})(\d{7})/, "$1-*******")}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">프로필에 저장된 정보입니다</p>
          </div>
        )}

        {/* 은행 정보 */}
        <Card className="p-4 space-y-4">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            계좌 정보
          </h3>
          <div className="space-y-2">
            <Label>은행</Label>
            <Select value={bankName} onValueChange={setBankName}>
              <SelectTrigger>
                <SelectValue placeholder="은행을 선택해주세요" />
              </SelectTrigger>
              <SelectContent>
                {banks.map(bank => (
                  <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>계좌번호</Label>
            <Input
              placeholder="계좌번호를 입력해주세요"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
            />
          </div>
        </Card>

        {/* 서류 업로드 - 파일선택 + 카메라 촬영 */}
        <Card className="p-4 space-y-5">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <Camera className="w-4 h-4" />
            서류 업로드
          </h3>

          {/* 본인 사진 */}
          <ImageUploadField
            label="본인 사진"
            type="photo"
            hint="증명사진을 업로드하거나 직접 촬영해주세요 (얼굴이 잘 보이도록)"
            value={photoUrl}
            onChange={setPhotoUrl}
          />

          <div className="border-t" />

          {/* 신분증 사본 */}
          <ImageUploadField
            label="신분증 사본"
            type="id-card"
            hint="주민등록번호가 모두 보이는 신분증 사본을 업로드해주세요"
            value={idCardUrl}
            onChange={setIdCardUrl}
          />
        </Card>

        {/* 제출 완료 안내 */}
        {application.documentsSubmittedAt && (
          <Card className="p-4 bg-green-50 dark:bg-green-900/20">
            <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              서류 제출 완료: {format(new Date(application.documentsSubmittedAt), "M월 d일 HH:mm", { locale: ko })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">수정 후 다시 제출할 수 있습니다</p>
          </Card>
        )}

        {/* 데스크탑 제출 버튼 */}
        <div className="hidden md:flex gap-3">
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || !canSubmit}
          >
            {submitMutation.isPending
              ? "제출 중..."
              : application.documentsSubmittedAt
              ? "서류 재제출하기"
              : "서류 제출하기"}
          </Button>
          <Button variant="outline" onClick={() => navigate("/my-applications")}>
            돌아가기
          </Button>
        </div>
      </main>

      {/* 모바일 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden p-4 bg-background border-t">
        <div className="space-y-2">
          <Button
            className="w-full"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || !canSubmit}
          >
            {submitMutation.isPending
              ? "제출 중..."
              : application.documentsSubmittedAt
              ? "서류 재제출하기"
              : "서류 제출하기"}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate("/my-applications")}>
            돌아가기
          </Button>
        </div>
      </div>
    </Layout>
  );
}
