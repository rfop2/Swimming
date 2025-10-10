import type { Task } from "lib"

export function useTasks() {
  // Initial load, works SSR + CSR
  const { data: tasks, refresh: refreshTasks } = useAsyncData( "tasks", () =>
    $fetch( "/api/tasks" )
  )

  // Create a task
  async function createTask( task: Partial<Task> ) {
    await $fetch( "/api/tasks/", {
      method: "POST",
      body: task,
    } )
    await refreshTasks() // reload list after update
  }

  // Create multiple tasks
  async function createTasks( tasks: Array<Partial<Task>> ) {
    await $fetch( "/api/tasks/", {
      method: "POST",
      body: tasks,
    } )
    await refreshTasks() // reload list after update
  }

  // Update a task
  async function updateTask( task: Task ) {
    await $fetch( `/api/tasks/${task.taskId}`, {
      method: "PUT",
      body: task,
    } )
    await refreshTasks() // reload list after update
  }

  // Delete a task
  async function deleteTask( taskId: number ) {
    await $fetch( `/api/tasks/${taskId}`, { method: "DELETE" } )
    await refreshTasks() // reload list after delete
  }

  return {
    tasks,
    refreshTasks,
    createTask,
    createTasks,
    updateTask,
    deleteTask,
  }
}
