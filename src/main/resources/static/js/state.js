import { startOfDay, startOfWeek } from "./utils.js";

export const today = startOfDay(new Date());

export const state = {
  currentUser: null,
  selectedDate: today,
  weekStart: startOfWeek(today),
  statusFilter: "all",
  subjectFilter: "all",
  selectedSubject: "",
  subjects: [],
  subjectsLoading: false,
  homeworkLoading: false,
  homeworkError: false,
  progressSavingId: null,
  expandedHomeworkIds: new Set(),
  homework: [],
  formDirty: false,
  editingId: null,
  deleteTargetId: null
};

export function studentDatabaseId() {
  return state.currentUser?.role === "student" ? state.currentUser.databaseId : state.currentUser?.studentDatabaseId;
}

export function studentName() {
  return state.currentUser?.role === "student" ? state.currentUser.name : state.currentUser?.studentName;
}
