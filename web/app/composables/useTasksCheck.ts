import type { Task } from "lib"

export const useTasksCheck = () => {
  const user = useUser()
  const { tasks, fetchTasks } = useTasks()
  const { createNotification } = useNotifications()
  const lastTasks = ref<Task[]>( [] )
  let checkTimer: NodeJS.Timeout | null = null

  async function checkTasks() {
    if ( !user && checkTimer ) {
      clearInterval( checkTimer )
      return
    }
    try {
      await fetchTasks()
      for ( const lastTask of lastTasks.value ) {
        if ( lastTask.taskStatus === "pending" || lastTask.taskStatus === "progress" ) {
          const task = tasks.value.find( t => t.taskId === lastTask.taskId )
          if ( task ) {
            switch ( task.taskType ) {
              case "update" : {
                switch ( task.targetType ) {
                  case "swimmer" : {
                    if ( task.taskStatus === "error" ) {
                      // showAlert( `Task "${task.taskDescription}" failed`, "error" )
                      await createNotification( {
                        notificationType: "error",
                        notificationText: `Task "${task.taskDescription}" failed`,
                      } )
                    } else if ( task.taskStatus === "complete" ) {
                      // showAlert( `Task "${task.taskDescription}" is complete`, "success" )
                      await createNotification( {
                        notificationType: "success",
                        notificationText: `Task "${task.taskDescription}" is complete`,
                      } )
                    } else if ( lastTask.taskStatus === "pending" && task.taskStatus === "progress" ) {
                      // showAlert( `Task "${task.taskDescription}" has started`, "info" )
                      await createNotification( {
                        notificationType: "info",
                        notificationText: `Task "${task.taskDescription}" has started`,
                      } )
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
      checkTimer = setInterval( checkTasks, checkInterval * 1_000 ) // periodic checks
    } )
    watch( user, ( val ) => {
      if ( !val && checkTimer )
        clearInterval( checkTimer )
    } )
    onUnmounted( () => {
      if ( checkTimer )
        clearInterval( checkTimer )
    } )
  }

  return { tasks }
}
