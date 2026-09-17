"use client";

import { useQuery } from "@tanstack/react-query";
import { mobileApi } from "@/lib/mobile-api";

export type ApiAttendanceEntry = {
  id: string;
  type: "CHECK_IN" | "CHECK_OUT";
  workDate: string;
  timestamp: string;
  isLate: boolean;
  lateMinutes: number;
  isWithinRadius: boolean | null;
  workMode: string;
  approvedMode: string | null;
};

export type ApiDailyAttendance = {
  workDate: string;
  checkIn: ApiAttendanceEntry | null;
  checkOut: ApiAttendanceEntry | null;
};

export function useAttendanceHistoryQuery(range?: {
  from: string;
  to: string;
}) {
  return useQuery({
    queryKey: ["mobile", "attendance", range?.from, range?.to],
    queryFn: () => {
      const params = range ? `?from=${range.from}&to=${range.to}` : "";
      return mobileApi<{ days: ApiDailyAttendance[] }>(
        `/api/attendance${params}`,
      );
    },
  });
}

export type ApiLeaveRequest = {
  id: string;
  type: "IZIN" | "SAKIT" | "CUTI";
  startDate: string;
  endDate: string;
  detail: string;
  reasonCategory: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export function useLeaveRequestsQuery() {
  return useQuery({
    queryKey: ["mobile", "leave"],
    queryFn: () => mobileApi<{ items: ApiLeaveRequest[] }>("/api/leave"),
  });
}

export type ApiOvertime = {
  id: string;
  startAt: string;
  endAt: string | null;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export function useOvertimeHistoryQuery() {
  return useQuery({
    queryKey: ["mobile", "overtime"],
    queryFn: () => mobileApi<{ items: ApiOvertime[] }>("/api/overtime"),
  });
}

export type ApiMe = {
  id: string;
  name: string;
  email: string;
  role: "EMPLOYEE" | "ADMIN" | "SUPERVISOR" | "MANAGER";
  phone: string | null;
  position: string | null;
  profileImageUrl: string | null;
  isActive: boolean;
  createdAt: string;
};

export function useMeQuery() {
  return useQuery({
    queryKey: ["mobile", "me"],
    queryFn: () => mobileApi<ApiMe>("/api/me"),
  });
}

export type ApiFaceStatus = {
  enrolled: boolean;
  totalPhotos: number;
  minRequired: number;
  recommendedPhotos: number;
  maxPhotos: number;
};

export function useFaceStatusQuery() {
  return useQuery({
    queryKey: ["mobile", "face"],
    queryFn: () => mobileApi<ApiFaceStatus>("/api/face"),
  });
}

export type ApiFieldAssignment = {
  id: string;
  startDate: string;
  endDate: string;
  activityDetail: string;
  destinationCity: string | null;
  transportation: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  employees: { id: string; name: string }[];
};

export function useFieldAssignmentsQuery() {
  return useQuery({
    queryKey: ["mobile", "field-assignment"],
    queryFn: () =>
      mobileApi<{ items: ApiFieldAssignment[] }>("/api/field-assignment"),
  });
}

export type ApiEmployee = { id: string; name: string; position: string | null };

export function useEmployeesQuery() {
  return useQuery({
    queryKey: ["mobile", "users"],
    queryFn: () => mobileApi<{ items: ApiEmployee[] }>("/api/users"),
  });
}

export type ApiPendingLeaveRequest = ApiLeaveRequest & {
  user: { name: string };
};

export function usePendingLeaveApprovalsQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["mobile", "leave", "pending"],
    queryFn: () =>
      mobileApi<{ items: ApiPendingLeaveRequest[] }>("/api/leave/pending"),
    enabled,
  });
}

export type ApiPendingOvertimeRequest = ApiOvertime & {
  user: { name: string };
};

export function usePendingOvertimeApprovalsQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["mobile", "overtime", "pending"],
    queryFn: () =>
      mobileApi<{ items: ApiPendingOvertimeRequest[] }>(
        "/api/overtime/pending",
      ),
    enabled,
  });
}

export type ApiPendingFieldAssignment = ApiFieldAssignment & {
  createdBy: { name: string };
};

export function usePendingFieldAssignmentApprovalsQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["mobile", "field-assignment", "pending"],
    queryFn: () =>
      mobileApi<{ items: ApiPendingFieldAssignment[] }>(
        "/api/field-assignment/pending",
      ),
    enabled,
  });
}

export type ApprovalLogEntry = {
  id: string;
  type: "LEAVE" | "OVERTIME" | "FIELD_ASSIGNMENT";
  status: "PENDING" | "APPROVED" | "REJECTED";
  note: string | null;
  requesterName: string;
  summary: string;
  reviewedAt: string;
};

export function useReviewHistoryQuery(type?: ApprovalLogEntry["type"]) {
  return useQuery({
    queryKey: ["mobile", "review-history", type],
    queryFn: () =>
      mobileApi<{ items: ApprovalLogEntry[] }>(
        `/api/review/history${type ? `?type=${type}` : ""}`,
      ),
  });
}

export type ApiPersonalIdentity = {
  nik: string;
  placeOfBirth: string;
  dateOfBirth: string;
  gender: "LAKI_LAKI" | "PEREMPUAN";
  religion: string;
  maritalStatus: string;
  nationality: string;
  ktpPhotoUrl: string | null;
};

export type ApiContact = {
  domicileAddress: string;
  ktpAddress: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
};

export type ApiEmploymentData = {
  employeeNumber: string;
  workLocation: string;
  employmentStatus: "PKWT" | "PKWTT";
  startDate: string;
  contractEndDate: string | null;
};

export type ApiWorkHistory = {
  id: string;
  previousCompany: string | null;
  previousPosition: string | null;
  previousDuration: string | null;
};

export type ApiAdministrativeDocument = {
  ktpUrl: string | null;
  npwpUrl: string | null;
  kkUrl: string | null;
  ijazahUrl: string | null;
  transkripUrl: string | null;
  sertifikatUrl: string | null;
  bankBookUrl: string | null;
  pasFotoUrl: string | null;
  cvUrl: string | null;
};

export type ApiPayroll = {
  baseSalary: number;
  allowance: number | null;
  bonus: number | null;
  bankAccountNumber: string;
  bankAccountName: string;
  bpjsKesehatanNumber: string | null;
  bpjsKetenagakerjaanNumber: string | null;
};

export type ApiTraining = {
  id: string;
  name: string;
  organizer: string | null;
  period: string | null;
};

export type ApiProfileData = {
  personalIdentity: ApiPersonalIdentity | null;
  contact: ApiContact | null;
  employmentData: ApiEmploymentData | null;
  workHistory: ApiWorkHistory[];
  administrativeDocument: ApiAdministrativeDocument | null;
  payroll: ApiPayroll | null;
  training: ApiTraining[];
};

export function useProfileDataQuery() {
  return useQuery({
    queryKey: ["mobile", "profile"],
    queryFn: () => mobileApi<ApiProfileData>("/api/profile"),
  });
}
