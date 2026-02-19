import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Phone, Mail, CreditCard, LogOut, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import type { Profile } from "@/types";

const profileSchema = z.object({
  name: z.string().min(2, "이름을 2자 이상 입력해주세요"),
  phone: z.string().regex(/^01[016789]-?\d{3,4}-?\d{4}$/, "올바른 전화번호를 입력해주세요"),
  residentNumber: z.string().regex(/^\d{6}-?\d{7}$/, "올바른 주민번호를 입력해주세요"),
  email: z.string().email("올바른 이메일을 입력해주세요"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const { data: profile, isLoading: profileLoading } = useQuery<Profile>({
    queryKey: ["/api/profile"],
    retry: false,
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      phone: "",
      residentNumber: "",
      email: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name,
        phone: profile.phone,
        residentNumber: profile.residentNumber,
        email: profile.email,
      });
    } else if (user?.email) {
      form.setValue("email", user.email);
    }
  }, [profile, user, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const method = profile ? "PATCH" : "POST";
      const res = await apiRequest(method, "/api/profile", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "저장 완료",
        description: "프로필이 저장되었습니다",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
    onError: () => {
      toast({
        title: "저장 실패",
        description: "다시 시도해주세요",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    saveMutation.mutate(data);
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Layout activePath="/profile">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 backdrop-blur-lg bg-background/95 border-b">
        <div className="flex items-center gap-3 p-4 md:px-6">
          <h1 className="font-semibold text-base">프로필 설정</h1>
        </div>
      </header>

      <main className="p-4 md:p-6 pb-8 space-y-6 md:max-w-2xl">
        {/* 사용자 정보 */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt="Profile"
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            </div>
            {profile && (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs">완료</span>
              </div>
            )}
          </div>
        </Card>

        {/* 프로필 폼 */}
        <Card className="p-4 md:p-6">
          <h2 className="font-medium mb-4">알바 지원 정보</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      이름
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="홍길동" {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      연락처
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="010-1234-5678" {...field} data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="residentNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      주민등록번호
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="123456-1234567"
                        {...field}
                        data-testid="input-resident-number"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-[11px] text-muted-foreground">
                      급여 지급을 위해 필요합니다. 안전하게 암호화됩니다.
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      연락 이메일
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="example@gmail.com" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="md:col-span-2">
                <Button
                  type="submit"
                  className="w-full md:w-auto"
                  disabled={saveMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {saveMutation.isPending ? "저장 중..." : profile ? "수정하기" : "저장하기"}
                </Button>
              </div>
            </form>
          </Form>
        </Card>

        {/* 로그아웃 */}
        <Button
          variant="outline"
          className="w-full md:w-auto"
          onClick={() => logout()}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          로그아웃
        </Button>
      </main>
    </Layout>
  );
}
