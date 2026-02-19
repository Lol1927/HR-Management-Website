import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Shield, CheckCircle, Star, MapPin, Clock, Users, Award,
  Briefcase, Phone, Mail, Menu, X, ArrowRight, ChevronRight,
  Building2, FileCheck, Banknote, UserCheck, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { API_BASE } from "@/lib/cognito";
import type { Event } from "@/types";

/* ─── 통계 ─────────────────────────────── */
const STATS = [
  { value: "5,000+", label: "완료된 행사", icon: Award },
  { value: "12,000+", label: "등록 스태프", icon: Users },
  { value: "4.8", label: "평균 만족도", icon: Star },
  { value: "99%", label: "급여 정시 지급", icon: Banknote },
];

/* ─── 진행 절차 ─────────────────────────── */
const STEPS = [
  {
    num: "01",
    icon: FileCheck,
    title: "회원가입 & 지원",
    desc: "간단한 프로필 작성 후 관심 행사에 지원합니다. 신분증 정보는 안전하게 암호화됩니다.",
  },
  {
    num: "02",
    icon: UserCheck,
    title: "신원 검증",
    desc: "안전한 근무 환경을 위해 기본 신원 확인을 진행합니다. 빠르고 간편합니다.",
  },
  {
    num: "03",
    icon: CheckCircle,
    title: "배정 확정",
    desc: "담당자 검토 후 채용 확정 알림을 받습니다. 근무 일정과 급여가 사전에 공지됩니다.",
  },
  {
    num: "04",
    icon: Banknote,
    title: "근무 & 급여 수령",
    desc: "행사 완료 후 등록 계좌로 약속된 날짜에 급여가 지급됩니다.",
  },
];

/* ─── 후기 ─────────────────────────────── */
const TESTIMONIALS = [
  {
    name: "김지수",
    role: "스포츠 행사 스태프 · 3년차",
    text: "처음 지원할 때 낯선 플랫폼이라 걱정이 많았는데, 담당자분이 꼼꼼하게 안내해 주셔서 안심했습니다. 급여도 정확하고 빠르게 입금되어 이제는 정기적으로 이용하고 있습니다.",
    rating: 5,
    initial: "김",
  },
  {
    name: "박현우",
    role: "공연 행사 스태프 · 2년차",
    text: "행사 정보가 투명하게 공개되고, 사전에 근무 조건과 급여가 명확하게 안내됩니다. 약속된 내용이 실제로도 그대로 지켜져서 신뢰가 생겼습니다.",
    rating: 5,
    initial: "박",
  },
  {
    name: "이소연",
    role: "전시 행사 스태프 · 1년차",
    text: "공식 등록된 업체 행사만 올라와 있어서 사기 걱정 없이 지원할 수 있어요. 신분증 정보 보호도 철저하게 이루어져 있어 개인정보 측면에서도 안심됩니다.",
    rating: 5,
    initial: "이",
  },
];

/* ─── 파트너사 (예시) ─────────────────── */
const PARTNERS = ["㈜이벤트코리아", "글로벌스태프", "프로이벤트", "행사매니지먼트", "스타크루"];

/* ─── 카테고리 라벨 ─────────────────────── */
const categoryLabels: Record<string, string> = {
  sports: "스포츠",
  concert: "공연",
  exhibition: "전시",
};
const categoryColors: Record<string, string> = {
  sports: "bg-emerald-50 text-emerald-700 border-emerald-200",
  concert: "bg-purple-50 text-purple-700 border-purple-200",
  exhibition: "bg-amber-50 text-amber-700 border-amber-200",
};

/* ══════════════════════════════════════════
   LANDING PAGE
══════════════════════════════════════════ */
export default function Landing() {
  const { login } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* 공개 이벤트 조회 (인증 불필요) */
  const { data: events } = useQuery<Event[]>({
    queryKey: ["public-events"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/events`);
      if (!res.ok) return [];
      return res.json();
    },
    retry: false,
  });

  const featuredEvents = (events || []).slice(0, 6);

  return (
    <div className="min-h-screen bg-white text-foreground">

      {/* ════════════════ NAVBAR ════════════════ */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-[0_1px_4px_hsl(220_40%_10%/.05)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* 로고 */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#1E3A8A] flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-white" />
              </div>
              <div className="leading-tight">
                <span className="font-bold text-[15px] text-[#1E3A8A] tracking-tight">알바톡</span>
                <span className="hidden sm:block text-[10px] text-slate-400 font-normal -mt-0.5">Event Staff Platform</span>
              </div>
            </div>

            {/* 데스크탑 메뉴 */}
            <nav className="hidden md:flex items-center gap-1">
              {[
                { label: "행사 소개", href: "#about" },
                { label: "채용 공고", href: "#jobs" },
                { label: "지원 방법", href: "#process" },
                { label: "FAQ", href: "#faq" },
                { label: "문의", href: "#contact" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="px-3.5 py-2 text-sm text-slate-600 hover:text-[#1E3A8A] hover:bg-slate-50 rounded-md font-medium transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            {/* 우측 버튼 */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={login}
                className="hidden md:inline-flex text-slate-600 hover:text-[#1E3A8A]"
              >
                로그인
              </Button>
              <Button
                size="sm"
                onClick={login}
                className="bg-[#1E3A8A] hover:bg-[#1e40af] text-white text-sm font-semibold px-4"
                data-testid="button-login-header"
              >
                지원하기
              </Button>
              {/* 모바일 햄버거 */}
              <button
                className="md:hidden p-2 rounded-md text-slate-500 hover:bg-slate-100"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* 모바일 메뉴 드롭다운 */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-slate-100 py-3 space-y-1">
              {["행사 소개", "채용 공고", "지원 방법", "FAQ", "문의"].map((label) => (
                <a
                  key={label}
                  href="#"
                  className="block px-3 py-2.5 text-sm text-slate-600 hover:text-[#1E3A8A] hover:bg-slate-50 rounded-md font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {label}
                </a>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ════════════════ HERO ════════════════ */}
      <section className="relative bg-[#0f2060] overflow-hidden">
        {/* 배경 패턴 */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f2060] via-[#1E3A8A] to-[#1e40af]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">

            {/* 텍스트 */}
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
                <Shield className="w-3.5 h-3.5" />
                공식 등록 이벤트 스태프 플랫폼
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-[1.15] tracking-tight mb-5">
                믿을 수 있는<br />
                이벤트 스태프<br />
                <span className="text-[#93c5fd]">채용 플랫폼</span>
              </h1>

              <p className="text-white/75 text-base md:text-lg leading-relaxed mb-8 max-w-md">
                검증된 행사, 투명한 급여, 체계적인 관리.<br />
                안심하고 지원하고 안전하게 일하세요.
              </p>

              {/* 신뢰 포인트 */}
              <ul className="space-y-2.5 mb-8">
                {[
                  "공식 등록 기업 행사만 게시",
                  "급여 사전 명시 및 정시 지급 보장",
                  "개인정보 암호화 안전 보관",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-white/85 text-sm">
                    <CheckCircle className="w-4 h-4 text-[#93c5fd] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  onClick={login}
                  className="bg-white text-[#1E3A8A] hover:bg-blue-50 font-bold text-sm px-7 shadow-lg"
                  data-testid="button-login-main"
                >
                  지금 지원하기
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => document.getElementById("jobs")?.scrollIntoView({ behavior: "smooth" })}
                  className="border-white/30 text-white hover:bg-white/10 text-sm px-7"
                >
                  채용 공고 보기
                </Button>
              </div>
            </div>

            {/* 우측 신뢰 카드 패널 */}
            <div className="hidden md:block">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 space-y-3">
                <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-4">실시간 현황</p>
                {[
                  { label: "오늘 등록된 행사", value: "24건", dot: "bg-emerald-400" },
                  { label: "이번 주 모집 중인 스태프", value: "186명", dot: "bg-sky-400" },
                  { label: "이번 달 급여 지급 완료", value: "₩ 2.4억", dot: "bg-amber-400" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${item.dot}`} />
                      <span className="text-white/75 text-sm">{item.label}</span>
                    </div>
                    <span className="text-white font-semibold text-sm">{item.value}</span>
                  </div>
                ))}
                <div className="pt-2">
                  <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2.5">
                    <Shield className="w-4 h-4 text-[#93c5fd]" />
                    <span className="text-white/80 text-xs">SSL 암호화 · 개인정보 보호정책 적용</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ STATS BAR ════════════════ */}
      <section className="bg-[#1E3A8A] border-b border-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-blue-800">
            {STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="flex flex-col items-center justify-center py-6 px-4 gap-1.5">
                  <Icon className="w-5 h-5 text-blue-300 mb-1" />
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-blue-300 text-xs font-medium">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════ PARTNERS ════════════════ */}
      <section className="border-b border-slate-100 bg-slate-50/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6">
            함께하는 파트너사
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {PARTNERS.map((name) => (
              <span key={name} className="text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-default">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ ABOUT ════════════════ */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <Badge className="bg-blue-50 text-[#1E3A8A] border-blue-100 font-medium mb-4 text-xs uppercase tracking-widest">
              왜 알바톡인가요
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
              신뢰와 전문성을 바탕으로 한<br />이벤트 스태프 플랫폼
            </h2>
            <p className="text-slate-500 text-base leading-relaxed">
              알바톡은 검증된 이벤트 운영사와 전문 스태프를 안전하게 연결합니다.<br />
              투명한 정보 공개와 체계적인 관리로 안심하고 이용하실 수 있습니다.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                color: "bg-blue-50 text-[#1E3A8A]",
                title: "검증된 안전성",
                desc: "모든 등록 행사는 사전 검토를 거칩니다. 공식 등록 법인 또는 사업자만 행사를 등록할 수 있어 허위 구인 걱정이 없습니다.",
              },
              {
                icon: Banknote,
                color: "bg-emerald-50 text-emerald-700",
                title: "투명한 급여 체계",
                desc: "지원 전 급여 조건, 지급 방식, 지급 일정을 명확히 확인할 수 있습니다. 약속된 급여는 반드시 정시에 지급됩니다.",
              },
              {
                icon: UserCheck,
                color: "bg-amber-50 text-amber-700",
                title: "체계적인 관리",
                desc: "배정 확정부터 근무 완료, 급여 정산까지 모든 과정을 플랫폼 내에서 투명하게 확인하고 관리할 수 있습니다.",
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                  <div className={`w-11 h-11 rounded-xl ${card.color} flex items-center justify-center mb-5`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2.5 text-base">{card.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{card.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════ JOB LISTINGS ════════════════ */}
      <section id="jobs" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <Badge className="bg-white text-[#1E3A8A] border-slate-200 font-medium mb-3 text-xs uppercase tracking-widest">
                채용 공고
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900">현재 모집 중인 행사</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={login}
              className="hidden md:inline-flex border-slate-300 text-slate-600 hover:border-[#1E3A8A] hover:text-[#1E3A8A]"
            >
              전체 보기 <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {featuredEvents.length === 0 ? (
            /* 샘플 카드 (이벤트 없을 때) */
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: "2025 K-POP 페스티벌 운영 스태프", cat: "concert", loc: "서울 올림픽공원", date: "2025.08.15", wage: "일급 120,000원", slots: 30 },
                { title: "프로야구 올스타전 현장 스태프", cat: "sports", loc: "인천 SSG랜더스필드", date: "2025.07.20", wage: "일급 100,000원", slots: 50 },
                { title: "국제 현대미술 전시회 안내 스태프", cat: "exhibition", loc: "서울 코엑스", date: "2025.09.01", wage: "일급 90,000원", slots: 15 },
                { title: "V리그 배구 시즌 운영 스태프", cat: "sports", loc: "수원 체육관", date: "2025.09.15", wage: "일급 95,000원", slots: 20 },
                { title: "락 페스티벌 안전 관리 스태프", cat: "concert", loc: "부산 벡스코", date: "2025.08.30", wage: "일급 110,000원", slots: 40 },
                { title: "디자인 박람회 전시 안내 스태프", cat: "exhibition", loc: "킨텍스 일산", date: "2025.10.05", wage: "일급 85,000원", slots: 12 },
              ].map((job) => (
                <SampleJobCard key={job.title} {...job} onApply={login} />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredEvents.map((ev) => (
                <EventJobCard key={ev.id} event={ev} onApply={login} />
              ))}
            </div>
          )}

          <div className="text-center mt-8 md:hidden">
            <Button onClick={login} variant="outline" className="border-slate-300 text-slate-600">
              전체 공고 보기 <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* ════════════════ PROCESS ════════════════ */}
      <section id="process" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <Badge className="bg-blue-50 text-[#1E3A8A] border-blue-100 font-medium mb-4 text-xs uppercase tracking-widest">
              지원 프로세스
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
              4단계로 완료되는 간편한 지원
            </h2>
            <p className="text-slate-500 text-sm">
              복잡한 서류 없이 빠르게 지원하고, 체계적인 프로세스로 안전하게 진행됩니다.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 relative">
            {/* 연결선 (데스크탑) */}
            <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-slate-200 z-0" />

            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={step.num} className="relative flex flex-col items-center text-center z-10">
                  <div className="w-[72px] h-[72px] rounded-2xl bg-[#1E3A8A] flex items-center justify-center mb-5 shadow-md shrink-0">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 tracking-widest mb-2">STEP {step.num}</span>
                  <h3 className="font-bold text-slate-900 mb-2 text-sm">{step.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════ TESTIMONIALS ════════════════ */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <Badge className="bg-white text-[#1E3A8A] border-slate-200 font-medium mb-4 text-xs uppercase tracking-widest">
              스태프 후기
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
              직접 경험한 스태프들의 이야기
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                {/* 별점 */}
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <div className="w-9 h-9 rounded-full bg-[#1E3A8A] flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {t.initial}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{t.name}</p>
                    <p className="text-slate-400 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ FAQ ════════════════ */}
      <section id="faq" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="bg-blue-50 text-[#1E3A8A] border-blue-100 font-medium mb-4 text-xs uppercase tracking-widest">
              자주 묻는 질문
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">FAQ</h2>
          </div>

          <div className="space-y-3">
            {[
              { q: "급여는 언제 지급되나요?", a: "행사 종료 후 사전에 안내된 지급일에 등록된 계좌로 자동 이체됩니다. 지급일은 행사별 공고에 명시되어 있습니다." },
              { q: "처음 지원하는데 어떻게 시작하나요?", a: "회원가입 후 프로필을 작성하고 원하는 행사에 지원하시면 됩니다. 담당자 검토 후 채용 여부가 안내됩니다." },
              { q: "개인정보는 안전하게 보호되나요?", a: "주민등록번호 등 민감 정보는 AES-256 암호화로 안전하게 보관되며, 급여 정산 목적 외에는 사용되지 않습니다." },
              { q: "행사 당일 취소되면 어떻게 되나요?", a: "운영사 사정으로 행사가 취소된 경우, 사전 약정에 따른 위약금 또는 보상이 제공됩니다. 자세한 내용은 공고별 안내를 참고해 주세요." },
            ].map((faq) => (
              <div key={faq.q} className="border border-slate-200 rounded-xl overflow-hidden">
                <details className="group">
                  <summary className="flex items-center justify-between p-5 cursor-pointer font-semibold text-slate-900 text-sm list-none hover:bg-slate-50 transition-colors">
                    {faq.q}
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="px-5 pb-5 text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
                    {faq.a}
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ CTA BANNER ════════════════ */}
      <section className="bg-[#1E3A8A] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-blue-200 text-base mb-8">
            무료 회원가입 후 검증된 이벤트 행사에 안전하게 지원하세요.
          </p>
          <Button
            size="lg"
            onClick={login}
            className="bg-white text-[#1E3A8A] hover:bg-blue-50 font-bold text-sm px-10 shadow-lg"
            data-testid="button-cta-final"
          >
            무료 시작하기 <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* ════════════════ FOOTER ════════════════ */}
      <footer id="contact" className="bg-slate-900 text-slate-400 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-10 mb-10">

            {/* 브랜드 */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-[#1E3A8A] flex items-center justify-center">
                  <Briefcase className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-bold text-white text-sm">알바톡</span>
              </div>
              <p className="text-xs leading-relaxed mb-4">
                신뢰할 수 있는 이벤트 스태프 채용 플랫폼. 안전하고 투명한 연결을 추구합니다.
              </p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>02-1234-5678</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>support@albatok.kr</span>
                </div>
              </div>
            </div>

            {/* 서비스 */}
            <div>
              <p className="text-white text-xs font-semibold uppercase tracking-wider mb-4">서비스</p>
              <ul className="space-y-2 text-xs">
                {["채용 공고", "행사 소개", "지원 방법", "급여 정보"].map((item) => (
                  <li key={item}><a href="#" className="hover:text-white transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>

            {/* 고객지원 */}
            <div>
              <p className="text-white text-xs font-semibold uppercase tracking-wider mb-4">고객지원</p>
              <ul className="space-y-2 text-xs">
                {["자주 묻는 질문", "공지사항", "1:1 문의", "신고센터"].map((item) => (
                  <li key={item}><a href="#" className="hover:text-white transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>

            {/* 법적 정보 */}
            <div>
              <p className="text-white text-xs font-semibold uppercase tracking-wider mb-4">법적 정보</p>
              <ul className="space-y-2 text-xs">
                {["개인정보처리방침", "이용약관", "사업자 정보"].map((item) => (
                  <li key={item}><a href="#" className="hover:text-white transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs">
              <div className="space-y-1">
                <p className="text-slate-500">㈜알바톡 · 대표이사 홍길동 · 사업자등록번호 123-45-67890</p>
                <p className="text-slate-500">서울특별시 강남구 테헤란로 123, 알바톡 빌딩 5층 · 통신판매업 신고번호 2025-서울강남-1234</p>
              </div>
              <p className="text-slate-600 shrink-0">© 2025 알바톡. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

/* ─── 서브 컴포넌트: 샘플 공고 카드 ─── */
function SampleJobCard({
  title, cat, loc, date, wage, slots, onApply,
}: {
  title: string; cat: string; loc: string; date: string;
  wage: string; slots: number; onApply: () => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2">{title}</h3>
        <span className={`pill border shrink-0 ${categoryColors[cat] || "bg-slate-50 text-slate-500 border-slate-200"}`}>
          {categoryLabels[cat] || cat}
        </span>
      </div>
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
          <MapPin className="w-3.5 h-3.5 shrink-0" />{loc}
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
          <Calendar className="w-3.5 h-3.5 shrink-0" />{date}
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
          <Users className="w-3.5 h-3.5 shrink-0" />모집 {slots}명
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <span className="text-[#1E3A8A] font-bold text-sm">{wage}</span>
        <Button size="sm" onClick={onApply}
          className="bg-[#1E3A8A] hover:bg-[#1e40af] text-white text-xs h-8 px-4">
          지원하기
        </Button>
      </div>
    </div>
  );
}

/* ─── 서브 컴포넌트: 실제 이벤트 카드 ─── */
function EventJobCard({ event, onApply }: { event: Event; onApply: () => void }) {
  const dateStr = event.date
    ? format(parseISO(event.date as string), "yyyy.MM.dd (EEE)", { locale: ko })
    : "-";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2">{event.title}</h3>
        <span className={`pill border shrink-0 ${categoryColors[event.category] || "bg-slate-50 text-slate-500 border-slate-200"}`}>
          {categoryLabels[event.category] || event.category}
        </span>
      </div>
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
          <MapPin className="w-3.5 h-3.5 shrink-0" />{event.location}
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
          <Calendar className="w-3.5 h-3.5 shrink-0" />{dateStr}
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
          <Clock className="w-3.5 h-3.5 shrink-0" />{event.startTime} – {event.endTime}
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <span className="text-[#1E3A8A] font-bold text-sm">
          {event.wage ? `일급 ${event.wage.toLocaleString()}원` : "급여 문의"}
        </span>
        <Button size="sm" onClick={onApply}
          className="bg-[#1E3A8A] hover:bg-[#1e40af] text-white text-xs h-8 px-4">
          지원하기
        </Button>
      </div>
    </div>
  );
}
