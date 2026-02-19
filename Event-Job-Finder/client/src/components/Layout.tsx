import { useLocation } from "wouter";
import { Briefcase, Calendar, FileText, User, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface NavLink {
  icon: React.ReactNode;
  label: string;
  desc: string;
  path: string;
}

const NAV_LINKS: NavLink[] = [
  { icon: <Briefcase className="w-4 h-4" />, label: "행사 알바", desc: "공고 목록", path: "/" },
  { icon: <Calendar className="w-4 h-4" />, label: "지원현황", desc: "내 지원 내역", path: "/my-applications" },
  { icon: <FileText className="w-4 h-4" />, label: "상시 알바", desc: "상시 등록", path: "/regular" },
  { icon: <User className="w-4 h-4" />, label: "프로필", desc: "내 정보 관리", path: "/profile" },
];

export default function Layout({
  children,
  activePath,
}: {
  children: React.ReactNode;
  activePath?: string;
}) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const current = activePath || location;

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* ── 데스크탑 사이드바 ── */}
      <aside className="hidden md:flex w-[230px] flex-col shrink-0 fixed top-0 left-0 h-full bg-white border-r border-slate-200 z-40">

        {/* 로고 영역 */}
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-[#1E3A8A] flex items-center justify-center shrink-0">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-[#1E3A8A] text-sm leading-tight tracking-tight">알바톡</p>
            <p className="text-[10px] text-slate-400">Event Staff Platform</p>
          </div>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-3">메뉴</p>
          {NAV_LINKS.map((link) => {
            const isActive = current === link.path;
            return (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
                  isActive
                    ? "bg-[#1E3A8A] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className={`shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`}>
                  {link.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-medium leading-none mb-0.5 ${isActive ? "text-white" : ""}`}>
                    {link.label}
                  </p>
                  <p className={`text-[10px] leading-none ${isActive ? "text-blue-200" : "text-slate-400"}`}>
                    {link.desc}
                  </p>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-200 shrink-0" />}
              </button>
            );
          })}
        </nav>

        {/* 사용자 정보 */}
        {user && (
          <div className="p-3 border-t border-slate-200">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 mb-2">
              {user.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="프로필" className="w-8 h-8 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#1E3A8A] flex items-center justify-center shrink-0 text-white text-xs font-bold">
                  {user.firstName?.charAt(0) || "U"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-slate-800 truncate">{user.firstName || "사용자"}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
            >
              로그아웃
            </button>
          </div>
        )}
      </aside>

      {/* ── 메인 콘텐츠 ── */}
      <main className="flex-1 md:ml-[230px] min-h-screen pb-16 md:pb-0">
        {children}
      </main>

      {/* ── 모바일 하단 네비게이션 ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-1px_8px_hsl(220_40%_10%/.06)]">
        <div className="flex items-center justify-around py-1">
          {NAV_LINKS.map((link) => {
            const isActive = current === link.path;
            return (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`flex flex-col items-center gap-1 flex-1 py-2.5 transition-colors ${
                  isActive ? "text-[#1E3A8A]" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <span className={`transition-transform ${isActive ? "scale-110" : ""}`}>
                  {link.icon}
                </span>
                <span className={`text-[10px] font-medium ${isActive ? "font-semibold" : ""}`}>
                  {link.label}
                </span>
                {isActive && <div className="w-1 h-1 rounded-full bg-[#1E3A8A]" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
