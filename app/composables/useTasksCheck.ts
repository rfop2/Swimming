import type { Task } from "lib"

export const useTasksCheck = () => {
  const { tasks, fetchTasks } = useTasks()
  const lastTasks = ref<Task[]>( [] )

  async function checkTasks() {
    try {
      await fetchTasks()
      console.log( "LT", lastTasks.value, tasks.value )
      for ( const lastTask of lastTasks.value ) {
        if ( lastTask.taskStatus === "pending" || lastTask.taskStatus === "progress" ) {
          const task = tasks.value.find( t => t.taskId === lastTask.taskId )
          console.log( "lt", lastTask, task )
          if ( task ) {
            switch ( task.taskType ) {
              case "update" : {
                switch ( task.targetType ) {
                  case "swimmer" : {
                    console.log( "t", task.taskStatus )
                    if ( task.taskStatus === "error" ) {
                      showAlert( `Updating swimmer '${task.targetId}' failed`, "error" )
                    } else if ( task.taskStatus === "complete" ) {
                      showAlert( `Updating swimmer '${task.targetId}' is complete`, "success" )
                    } else if ( lastTask.taskStatus === "pending" && task.taskStatus === "progress" ) {
                      showAlert( `Update for swimmer '${task.targetId}' has started`, "info" )
                    }
                    break
                  }
                }
                break
              }
            }
          }
        }
      }
    } catch ( err ) {
      console.error( "Tasks check failed:", err )
    }
    lastTasks.value = JSON.parse( JSON.stringify( tasks.value ) )
  }

  const checkInterval = Number( process.env.TASK_CHECK_INTERVAL ?? 180 )

  // initial + periodic checks
  if ( import.meta.client ) {
    onMounted( () => {
      checkTasks()
      setInterval( checkTasks, checkInterval * 1_000 ) // periodic checks
    } )
  }

  return { tasks }
}
