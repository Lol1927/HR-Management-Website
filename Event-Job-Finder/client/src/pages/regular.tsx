import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Clock, FileText, CheckCircle2, User, Calendar, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { RegularApplication, Profile } from "@/types";

const DAYS = [
  { id: "mon", label: "월" },
  { id: "tue", label: "화" },
  { id: "wed", label: "수" },
  { id: "thu", label: "목" },
  { id: "fri", label: "금" },
  { id: "sat", label: "토" },
  { id: "sun", label: "일" },
];

const CATEGORIES = [
  { id: "sports", label: "스포츠" },
  { id: "concert", label: "공연" },
  { id: "exhibition", label: "전시" },
];

const regularSchema = z.object({
  availableDays: z.array(z.string()).min(1, "최소 1개 이상의 요일을 선택해주세요"),
  preferredCategories: z.array(z.string()).min(1, "최소 1개 이상의 카테고리를 선택해주세요"),
  availableStartTime: z.string().min(1, "시작 시간을 입력해주세요"),
  availableEndTime: z.string().min(1, "종료 시간을 입력해주세요"),
  note: z.string().optional(),
  isActive: z.boolean().default(true),
});

type RegularFormData = z.infer<typeof regularSchema>;

export default function RegularPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: profile } = useQuery<Profile>({
    queryKey: ["/api/profile"],
    retry: false,
  });

  const { data: regularApp, isLoading: regularLoading } = useQuery<RegularApplication>({
    queryKey: ["/api/regular-application"],
    retry: false,
  });

  const form = useForm<RegularFormData>({
    resolver: zodResolver(regularSchema),
    defaultValues: {
      availableDays: [],
      preferredCategories: [],
      availableStartTime: "09:00",
      availableEndTime: "18:00",
      note: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (regularApp) {
      form.reset({
        availableDays: regularApp.availableDays as string[],
        preferredCategories: regularApp.preferredCategories as string[],
        availableStartTime: regularApp.availableStartTime,
        availableEndTime: regularApp.availableEndTime,
        note: regularApp.note || "",
        isActive: regularApp.isActive ?? true,
      });
    }
  }, [regularApp, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: RegularFormData) => {
      const method = regularApp ? "PATCH" : "POST";
      const res = await apiRequest(method, "/api/regular-application", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "저장 완료",
        description: "상시 알바 등록이 완료되었습니다",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/regular-application"] });
    },
    onError: () => {
      toast({
        title: "저장 실패",
        description: "다시 시도해주세요",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegularFormData) => {
    if (!profile) {
      toast({
        title: "프로필 필요",
        description: "먼저 프로필을 작성해주세요",
        variant: "destructive",
      });
      navigate("/profile");
      return;
    }
    saveMutation.mutate(data);
  };

  if (authLoading || regularLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Layout activePath="/regular">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 backdrop-blur-lg bg-background/95 border-b">
        <div className="flex items-center gap-3 p-4 md:px-6">
          <h1 className="font-semibold text-base">상시 알바 등록</h1>
          {regularApp && (
            <div className="ml-auto flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs">등록됨</span>
            </div>
          )}
        </div>
      </header>

      <main className="p-4 md:p-6 space-y-6 md:max-w-2xl">
        {/* Info Banner */}
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">상시 알바란?</p>
              <p className="text-xs text-muted-foreground mt-1">
                등록해두시면 구인 담당자가 필요시 연락드립니다. 
                원하는 요일과 시간대를 설정해주세요.
              </p>
            </div>
          </div>
        </Card>

        {/* Profile Required Warning */}
        {!profile && (
          <Card 
            className="p-4 bg-destructive/5 border-destructive/20 cursor-pointer"
            onClick={() => navigate("/profile")}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="font-medium text-sm">프로필을 먼저 작성해주세요</p>
                <p className="text-xs text-muted-foreground">터치하여 프로필 페이지로 이동</p>
              </div>
            </div>
          </Card>
        )}

        {/* Form */}
        <Card className="p-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Available Days */}
              <FormField
                control={form.control}
                name="availableDays"
                render={() => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      가능한 요일
                    </FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map((day) => (
                        <FormField
                          key={day.id}
                          control={form.control}
                          name="availableDays"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = field.value || [];
                                    if (current.includes(day.id)) {
                                      field.onChange(current.filter((d) => d !== day.id));
                                    } else {
                                      field.onChange([...current, day.id]);
                                    }
                                  }}
                                  className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                                    (field.value || []).includes(day.id)
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                                  }`}
                                  data-testid={`button-day-${day.id}`}
                                >
                                  {day.label}
                                </button>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Preferred Categories */}
              <FormField
                control={form.control}
                name="preferredCategories"
                render={() => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      선호 카테고리
                    </FormLabel>
                    <div className="space-y-2">
                      {CATEGORIES.map((category) => (
                        <FormField
                          key={category.id}
                          control={form.control}
                          name="preferredCategories"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-3">
                              <FormControl>
                                <Checkbox
                                  checked={(field.value || []).includes(category.id)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current, category.id]);
                                    } else {
                                      field.onChange(current.filter((c) => c !== category.id));
                                    }
                                  }}
                                  data-testid={`checkbox-category-${category.id}`}
                                />
                              </FormControl>
                              <span className="text-sm">{category.label}</span>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="availableStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        시작 시간
                      </FormLabel>
                      <FormControl>
                        <Input type="time" {...field} data-testid="input-start-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="availableEndTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>종료 시간</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} data-testid="input-end-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Note */}
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>추가 메모 (선택)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="특이사항이나 경력 등을 입력해주세요"
                        className="resize-none"
                        rows={3}
                        {...field}
                        data-testid="input-note"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Active Toggle */}
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel className="text-sm font-medium">연락 받기 활성화</FormLabel>
                      <p className="text-xs text-muted-foreground">비활성화하면 연락이 오지 않습니다</p>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={saveMutation.isPending || !profile}
                data-testid="button-save-regular"
              >
                {saveMutation.isPending ? "저장 중..." : regularApp ? "수정하기" : "등록하기"}
              </Button>
            </form>
          </Form>
        </Card>
      </main>
    </Layout>
  );
}
