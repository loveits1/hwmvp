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
  taskSavingIds: new Set(),
  expandedHomeworkIds: new Set(),
  homework: [],
  formDirty: false,
  editingId: null,
  formTasks: [],
  deleteTargetId: null
};

export function studentDatabaseId() {
	return state.currentUser?.role === "student" ? state.currentUser.databaseId : state.currentUser?.selectedStudentId;
}

export function studentName() {
	if (state.currentUser?.role === "student") return state.currentUser.name;
	return state.currentUser?.students.find(student => student.id === state.currentUser.selectedStudentId)?.name;
}
