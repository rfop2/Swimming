import type { Task } from "lib"

export function useTasks() {
  const user = useUser()
  // Global shared state (persists across all composable calls)
  const tasks = useState<Task[]>( "tasks", () => [] )
  const loaded = useState( "tasksLoaded", () => false )
  const loading = useState( "tasksLoading", () => false )

  const fetchTasks = async () => {
    // Prevent concurrent or redundant fetches
    if ( loading.value ) return
    loading.value = true

    try {
      tasks.value = await $fetch( "/api/tasks" )
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  // Auto-fetch if not loaded yet
  if ( import.meta.client && user.value && !loaded.value && !loading.value ) {
    // Runs only on client side to avoid duplicate SSR calls
    fetchTasks()
  }

  // Create a task
  const createTask = async ( task: Partial<Task> ) => {
    await $fetch( "/api/tasks/", {
      method: "POST",
      body: task,
    } )
    await fetchTasks() // reload list after update
  }

  // Create multiple tasks
  const createTasks = async ( tasks: Array<Partial<Task>> ) => {
    await $fetch( "/api/tasks/", {
      method: "POST",
      body: tasks,
    } )
    await fetchTasks() // reload list after update
  }

  // Update a task
  const updateTask = async ( task: Task ) => {
    await $fetch( `/api/tasks/${task.taskId}`, {
      method: "PUT",
      body: task,
    } )
    await fetchTasks() // reload list after update
  }

  // Delete a task
  const deleteTask = async ( taskId: number ) => {
    await $fetch( `/api/tasks/${taskId}`, { method: "DELETE" } )
    await fetchTasks() // reload list after delete
  }

  return {
    tasks,
    fetchTasks,
    createTask,
    createTasks,
    updateTask,
    deleteTask,
  }
}
