// modules/ui/workouts_view.js
// Workout routine screen: view/edit routine and mark daily completion.

import { getUser, setUser } from "../core/state.js";
import { saveUser } from "../core/storage.js";
import { navigateTo } from "../core/router.js";

let currentWorkoutDayId = null;

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultRoutine() {
  return {
    name: "5-Day Strength Split",
    days: [
      {
        id: "day1",
        label: "Day 1: Legs",
        exercises: [
          { name: "Squat", sets: 4, reps: 10 },
          { name: "Machine Hack Squat", sets: 3, reps: 12 },
          { name: "Stiff Legged Deadlift", sets: 4, reps: 10 },
          { name: "Leg Curl", sets: 3, reps: 12 },
          { name: "Dumbbell Lunge", sets: 3, reps: 8 },
          { name: "Leg Press Calf Raises", sets: 3, reps: 12 },
          { name: "Seated Calf Raises", sets: 3, reps: 12 }
        ]
      },
      {
        id: "day2",
        label: "Day 2: Chest & Biceps",
        exercises: [
          { name: "Bench Press", sets: 4, reps: 10 },
          { name: "Incline Bench Press", sets: 3, reps: 12 },
          { name: "Cable Crossover", sets: 3, reps: 12 },
          { name: "Hammer Strength Chest Press", sets: 3, reps: 8 },
          { name: "Barbell Bicep Curl", sets: 4, reps: 10 },
          { name: "Rope Cable Hammer Curl", sets: 3, reps: 12 },
          { name: "Preacher Curl", sets: 3, reps: 10 }
        ]
      },
      {
        id: "day3",
        label: "Day 3: Back",
        exercises: [
          { name: "Deadlift", sets: 4, reps: 10 },
          { name: "Barbell Row", sets: 3, reps: 12 },
          { name: "Lat Pulldown", sets: 5, reps: 8 },
          { name: "Cable Row", sets: 3, reps: 12 },
          { name: "Pull Up", sets: 3, reps: 10 },
          { name: "Hyperextension", sets: 3, reps: 12 }
        ]
      },
      {
        id: "day4",
        label: "Day 4: Shoulders & Triceps",
        exercises: [
          { name: "Seated Military Press", sets: 4, reps: 10 },
          { name: "Lateral Raise", sets: 3, reps: 12 },
          { name: "Front Raise", sets: 3, reps: 12 },
          { name: "Reverse Pec Deck", sets: 3, reps: 12 },
          { name: "Barbell Shrugs", sets: 4, reps: 12 },
          { name: "Dips", sets: 4, reps: 10 },
          { name: "Seated French Press", sets: 3, reps: 12 }
        ]
      },
      {
        id: "day5",
        label: "Day 5: Run & Abs",
        exercises: [
          { name: "Run (treadmill or outside) [min]", sets: 1, reps: 20 },
          { name: "Plank [sec]", sets: 3, reps: 60 },
          { name: "Hanging Leg Raise", sets: 3, reps: 12 },
          { name: "Cable Crunch", sets: 3, reps: 15 }
        ]
      }
    ]
  };
}

export function renderWorkoutsView() {
  const app = document.getElementById("app");
  const user = getUser();

  if (!user) {
    app.innerHTML = "<p>Error: missing user.</p>";
    return;
  }

  const routine = user.workout_routine || null;

  if (!routine) {
    // No routine yet – offer to create default
    app.innerHTML = `
      <div class="workouts-container">
        <h1>Workout Routine</h1>
        <p>No workout routine defined yet.</p>
        <p>This is your daily non-negotiable. Start by creating the default 5-day plan based on your split.</p>
        <button id="btn-workouts-create-default">Create default 5-day plan</button>

        <div class="workouts-footer">
          <button id="btn-workouts-back">Back to Dashboard</button>
        </div>
      </div>
    `;
    attachEmptyWorkoutHandlers();
    return;
  }

  const days = routine.days || [];
  if (!days.length) {
    app.innerHTML = `
      <div class="workouts-container">
        <h1>Workout Routine</h1>
        <p>This routine has no days configured.</p>
        <div class="workouts-footer">
          <button id="btn-workouts-back">Back to Dashboard</button>
        </div>
      </div>
    `;
    attachBasicWorkoutHandlers();
    return;
  }

  if (!currentWorkoutDayId) {
    currentWorkoutDayId = days[0].id;
  }
  let activeDay = days.find((d) => d.id === currentWorkoutDayId);
  if (!activeDay) {
    activeDay = days[0];
    currentWorkoutDayId = activeDay.id;
  }

  const today = getTodayIsoDate();
  const completedToday = !!(
    user.workout_completion_by_date &&
    user.workout_completion_by_date[today] &&
    user.workout_completion_by_date[today].completed
  );

  const rowsHtml = (activeDay.exercises || [])
    .map(
      (ex) => `
        <tr class="workout-ex-row">
          <td><input class="ex-name" type="text" value="${ex.name}"></td>
          <td><input class="ex-sets" type="number" min="0" value="${ex.sets}"></td>
          <td><input class="ex-reps" type="number" min="0" value="${ex.reps}"></td>
        </tr>
      `
    )
    .join("");

  const dayTabsHtml = days
    .map(
      (d) => `
    <button type="button"
            class="workout-day-tab ${d.id === activeDay.id ? "active" : ""}"
            data-day-id="${d.id}">
      ${d.label}
    </button>
  `
    )
    .join("");

  app.innerHTML = `
    <div class="workouts-container">
      <h1>Workout Routine</h1>

      <section class="workouts-meta">
        <label class="workout-name-label">
          Routine name:
          <input id="input-workout-name" type="text" value="${routine.name || ""}">
        </label>
        <p>Today's status:
          ${
            completedToday
              ? '<span class="workout-status ok">Completed</span>'
              : '<span class="workout-status pending">Not completed</span>'
          }
        </p>
        <button id="btn-workout-toggle-complete">
          ${completedToday ? "Undo completion for today" : "Mark today as done"}
        </button>
      </section>

      <section class="workouts-days">
        <h2>Days</h2>
        <div class="workout-day-tabs">
          ${dayTabsHtml}
        </div>
      </section>

      <section class="workouts-day-detail">
        <h3>${activeDay.label}</h3>
        <table id="workout-exercise-table" class="workout-table">
          <thead>
            <tr>
              <th>Exercise</th>
              <th>Sets</th>
              <th>Reps</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <button id="btn-workout-add-exercise">Add exercise row</button>
        <button id="btn-workout-save-day">Save day</button>
      </section>

      <section class="workouts-danger">
        <h2>Routine Management</h2>
        <button id="btn-workout-delete-routine">Delete routine</button>
      </section>

      <div class="workouts-footer">
        <button id="btn-workouts-back">Back to Dashboard</button>
      </div>
    </div>
  `;

  attachWorkoutHandlers();
}

function attachEmptyWorkoutHandlers() {
  const btnCreate = document.getElementById("btn-workouts-create-default");
  if (btnCreate) {
    btnCreate.addEventListener("click", () => {
      const user = getUser();
      const updated = {
        ...user,
        workout_routine: getDefaultRoutine(),
        workout_completion_by_date: user.workout_completion_by_date || {}
      };
      setUser(updated);
      saveUser(updated);
      currentWorkoutDayId = null;
      renderWorkoutsView();
    });
  }

  const backBtn = document.getElementById("btn-workouts-back");
  if (backBtn) {
    backBtn.addEventListener("click", () => navigateTo("dashboard"));
  }
}

function attachBasicWorkoutHandlers() {
  const backBtn = document.getElementById("btn-workouts-back");
  if (backBtn) {
    backBtn.addEventListener("click", () => navigateTo("dashboard"));
  }
}

function attachWorkoutHandlers() {
  const backBtn = document.getElementById("btn-workouts-back");
  if (backBtn) {
    backBtn.addEventListener("click", () => navigateTo("dashboard"));
  }

  // Day tabs
  document.querySelectorAll(".workout-day-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-day-id");
      currentWorkoutDayId = id;
      renderWorkoutsView();
    });
  });

  // Add exercise row (blank)
  const btnAdd = document.getElementById("btn-workout-add-exercise");
  if (btnAdd) {
    btnAdd.addEventListener("click", () => {
      const user = getUser();
      const routine = user.workout_routine;
      const days = routine.days || [];
      const day = days.find((d) => d.id === currentWorkoutDayId);
      if (!day) return;
      day.exercises = day.exercises || [];
      day.exercises.push({ name: "", sets: 3, reps: 10 });

      const updatedUser = {
        ...user,
        workout_routine: { ...routine, days: [...days] }
      };
      setUser(updatedUser);
      saveUser(updatedUser);
      renderWorkoutsView();
    });
  }

  // Save day + routine name
  const btnSave = document.getElementById("btn-workout-save-day");
  if (btnSave) {
    btnSave.addEventListener("click", () => {
      const user = getUser();
      const routine = user.workout_routine;
      const days = routine.days || [];
      const dayIndex = days.findIndex((d) => d.id === currentWorkoutDayId);
      if (dayIndex === -1) return;

      const tbody = document.querySelector("#workout-exercise-table tbody");
      const rows = tbody.querySelectorAll(".workout-ex-row");
      const newExercises = [];

      rows.forEach((row) => {
        const name = row.querySelector(".ex-name").value.trim();
        const sets = Number(row.querySelector(".ex-sets").value) || 0;
        const reps = Number(row.querySelector(".ex-reps").value) || 0;
        if (!name) return; // skip empty rows
        newExercises.push({ name, sets, reps });
      });

      const newName =
        document.getElementById("input-workout-name").value.trim() ||
        routine.name;

      const updatedRoutine = {
        ...routine,
        name: newName,
        days: days.map((d, idx) =>
          idx === dayIndex ? { ...d, exercises: newExercises } : d
        )
      };

      const updatedUser = { ...user, workout_routine: updatedRoutine };
      setUser(updatedUser);
      saveUser(updatedUser);
      renderWorkoutsView();
    });
  }

  // Toggle today's completion
  const btnToggle = document.getElementById("btn-workout-toggle-complete");
  if (btnToggle) {
    btnToggle.addEventListener("click", () => {
      const user = getUser();
      const today = getTodayIsoDate();
      const log = { ...(user.workout_completion_by_date || {}) };
      const prev = log[today] && log[today].completed;
      log[today] = { completed: !prev };
      const updatedUser = { ...user, workout_completion_by_date: log };
      setUser(updatedUser);
      saveUser(updatedUser);
      renderWorkoutsView();
    });
  }

  // Delete routine
  const btnDelete = document.getElementById("btn-workout-delete-routine");
  if (btnDelete) {
    btnDelete.addEventListener("click", () => {
      if (
        !confirm(
          "Delete workout routine? You can recreate the default later, but edits will be lost."
        )
      )
        return;
      const user = getUser();
      const updatedUser = { ...user, workout_routine: null };
      setUser(updatedUser);
      saveUser(updatedUser);
      currentWorkoutDayId = null;
      renderWorkoutsView();
    });
  }
}
