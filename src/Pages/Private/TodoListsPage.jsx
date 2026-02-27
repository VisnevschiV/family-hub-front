import { useEffect, useState } from "react";
import ListNameModal from "../../Components/ListNameModal.jsx";
import TodoList from "../../Components/TodoList.jsx";
import {
    createTask,
    createTaskList,
    deleteTask,
    deleteTaskList,
    getTaskLists,
    updateTask,
    updateTaskListName,
} from "../../api/tasks.js";
import "./TodoListsPage.css";

export default function TodoListsPage() {
    const [lists, setLists] = useState([]);
    const [listNameModal, setListNameModal] = useState({
        isOpen: false,
        mode: "add",
        listId: null,
        value: "",
    });

    function openAddListModal() {
        setListNameModal({
            isOpen: true,
            mode: "add",
            listId: null,
            value: "",
        });
    }

    function openRenameListModal(listId) {
        const targetList = lists.find((list) => list.id === listId);
        if (!targetList) return;

        setListNameModal({
            isOpen: true,
            mode: "rename",
            listId,
            value: targetList.title,
        });
    }

    function closeListNameModal() {
        setListNameModal((prev) => ({ ...prev, isOpen: false }));
    }

    function resolveBackendListId(list) {
        return (
            list.id ||
            list.ID ||
            list.getId ||
            list.getID ||
            list.uuid ||
            list.listId ||
            list.listID ||
            list.listUuid ||
            list.listUUID ||
            list.taskListId ||
            list.taskListID ||
            list.taskListUuid ||
            list.taskListUUID ||
            list?.taskList?.id ||
            list?.taskList?.ID ||
            list?.taskList?.getId ||
            list?.taskList?.getID ||
            list?.taskList?.uuid
        );
    }

    function resolveBackendTaskId(task) {
        return (
            task.id ||
            task.ID ||
            task.taskid ||
            task.task_id ||
            task.taskID ||
            task.taskId ||
            task.todoid ||
            task.todo_id ||
            task.todoID ||
            task.todoId ||
            task.getId ||
            task.getID ||
            task.uuid ||
            task.taskUuid ||
            task.taskUUID ||
            task.taskUUID ||
            task.todoUuid ||
            task.todoUUID ||
            task?.task?.id ||
            task?.task?.ID ||
            task?.task?.taskId ||
            task?.task?.taskID ||
            task?.task?.uuid ||
            task?.todo?.id ||
            task?.todo?.ID ||
            task?.todo?.taskId ||
            task?.todo?.taskID ||
            task?.todo?.uuid ||
            task?.taskItem?.id ||
            task?.taskItem?.ID ||
            task?.taskItem?.taskId ||
            task?.taskItem?.taskID ||
            task?.taskItem?.uuid
        );
    }

    function resolveBackendTaskName(task) {
        return (
            task.name ||
            task.getName ||
            task.taskName ||
            task.title ||
            task.text ||
            "Untitled task"
        );
    }

    function resolveBackendTaskDone(task) {
        if (typeof task.done === "boolean") return task.done;
        if (typeof task.completed === "boolean") return task.completed;
        if (typeof task.isDone === "boolean") return task.isDone;
        if (typeof task.isCompleted === "boolean") return task.isCompleted;
        return false;
    }

    function mapBackendTasks(list) {
        const taskContainer = list?.taskList && typeof list.taskList === "object"
            ? list.taskList
            : list?.tasks && typeof list.tasks === "object" && !Array.isArray(list.tasks)
                ? list.tasks
                : null;

        const backendTasks = Array.isArray(list?.tasks)
            ? list.tasks
            : Array.isArray(list?.Tasks)
                ? list.Tasks
                : Array.isArray(list?.taskItems)
                    ? list.taskItems
                    : Array.isArray(list?.items)
                        ? list.items
                        : Array.isArray(list?.todos)
                            ? list.todos
                            : Array.isArray(list?.taskList)
                                ? list.taskList
                                : Array.isArray(taskContainer?.tasks)
                                    ? taskContainer.tasks
                                    : Array.isArray(taskContainer?.taskItems)
                                        ? taskContainer.taskItems
                                        : Array.isArray(taskContainer?.items)
                                            ? taskContainer.items
                                            : Array.isArray(taskContainer?.todos)
                                                ? taskContainer.todos
                                                : [];

        return backendTasks.map((task) => {
            const backendTaskId = resolveBackendTaskId(task);

            return {
                id: backendTaskId ? String(backendTaskId) : crypto.randomUUID(),
                backendId: backendTaskId ? String(backendTaskId) : null,
                text: resolveBackendTaskName(task),
                done: resolveBackendTaskDone(task),
            };
        });
    }

    function mapBackendLists(data) {
        const backendLists = Array.isArray(data)
            ? data
            : Array.isArray(data?.taskLists)
                ? data.taskLists
                : Array.isArray(data?.lists)
                    ? data.lists
                    : Array.isArray(data?.tasklists)
                        ? data.tasklists
                        : [];

        return backendLists.map((list) => {
            const backendId = resolveBackendListId(list);

            return {
                id: backendId ? String(backendId) : crypto.randomUUID(),
                backendId: backendId ? String(backendId) : null,
                title:
                    list.name ||
                    list.getName ||
                    list.listName ||
                    list.title ||
                    list.taskListName ||
                    "Untitled list",
                items: mapBackendTasks(list),
            };
        });
    }

    async function refreshLists() {
        const data = await getTaskLists();
        setLists(mapBackendLists(data));
    }

    useEffect(() => {
        let isMounted = true;

        async function loadLists() {
            try {
                const data = await getTaskLists();
                if (!isMounted) return;

                setLists(mapBackendLists(data));
            } catch (err) {
                console.error(err.message || "Failed to load lists");
            }
        }

        loadLists();

        return () => {
            isMounted = false;
        };
    }, []);

    async function handleSubmitListName(name) {
        const title = name.trim();
        if (!title) return;

        if (listNameModal.mode === "add") {
            try {
                await createTaskList(title);
                await refreshLists();
            } catch (err) {
                console.error(err.message || "Failed to create list");
                return;
            }

            closeListNameModal();
            return;
        }

        if (!listNameModal.listId) return;

        const targetList = lists.find((list) => list.id === listNameModal.listId);
        const backendId = targetList?.backendId;

        if (!backendId) {
            console.error("Missing backend list ID for rename", {
                listId: listNameModal.listId,
                targetList,
            });
            return;
        }

        try {
            await updateTaskListName(backendId, title);
        } catch (err) {
            console.error(err.message || "Failed to rename list");
            return;
        }

        setLists((prev) =>
            prev.map((list) =>
                list.id === listNameModal.listId ? { ...list, title } : list
            )
        );
        closeListNameModal();
    }

    async function handleDeleteList(listId) {
        const targetList = lists.find((list) => list.id === listId);
        const backendId = targetList?.backendId;

        if (!backendId) {
            console.error("Missing backend list ID for delete", {
                listId,
                targetList,
            });
            return;
        }

        try {
            await deleteTaskList(backendId);
            setLists((prev) => prev.filter((list) => list.id !== listId));
        } catch (err) {
            console.error(err.message || "Failed to delete list");
        }
    }

    function handleUpdateItems(listId, nextItems) {
        setLists((prev) =>
            prev.map((list) =>
                list.id === listId ? { ...list, items: nextItems } : list
            )
        );
    }

    async function handleEditTask(listId, taskId, nextText) {
        const text = nextText.trim();
        if (!text) return;

        const targetList = lists.find((list) => list.id === listId);
        const backendListId = targetList?.backendId;
        const targetTask = targetList?.items?.find((item) => item.id === taskId);
        const backendTaskId = targetTask?.backendId;
        const completed = !!targetTask?.done;

        if (!backendListId || !backendTaskId) {
            console.error("Missing backend IDs for update task name", {
                listId,
                taskId,
                targetList,
                targetTask,
            });
            return;
        }

        await updateTask(backendListId, backendTaskId, text, completed);

        setLists((prev) =>
            prev.map((list) => {
                if (list.id !== listId) return list;

                return {
                    ...list,
                    items: list.items.map((item) =>
                        item.id === taskId ? { ...item, text } : item
                    ),
                };
            })
        );
    }

    async function handleToggleTask(listId, taskId) {
        const targetList = lists.find((list) => list.id === listId);
        const backendListId = targetList?.backendId;
        const targetTask = targetList?.items?.find((item) => item.id === taskId);
        const backendTaskId = targetTask?.backendId;

        if (!backendListId || !backendTaskId || !targetTask) {
            console.error("Missing backend IDs for toggle task", {
                listId,
                taskId,
                targetList,
                targetTask,
            });
            return;
        }

        const nextCompleted = !targetTask.done;

        await updateTask(
            backendListId,
            backendTaskId,
            targetTask.text,
            nextCompleted
        );

        setLists((prev) =>
            prev.map((list) => {
                if (list.id !== listId) return list;

                return {
                    ...list,
                    items: list.items.map((item) =>
                        item.id === taskId ? { ...item, done: nextCompleted } : item
                    ),
                };
            })
        );
    }

    async function handleAddTask(listId, taskName) {
        const targetList = lists.find((list) => list.id === listId);
        const backendId = targetList?.backendId;

        if (!backendId) {
            console.error("Missing backend list ID for create task", {
                listId,
                targetList,
            });
            return;
        }

        const createdTask = await createTask(backendId, taskName);
        const createdTaskBackendId = createdTask
            ? String(
                createdTask.id ||
                createdTask.ID ||
                createdTask.getId ||
                createdTask.getID ||
                createdTask.uuid ||
                createdTask.taskId ||
                createdTask.taskID ||
                createdTask.taskUuid ||
                createdTask.taskUUID ||
                ""
            ) || null
            : null;

        setLists((prev) =>
            prev.map((list) => {
                if (list.id !== listId) return list;

                return {
                    ...list,
                    items: [
                        ...list.items,
                        {
                            id: createdTaskBackendId || crypto.randomUUID(),
                            backendId: createdTaskBackendId,
                            text: taskName,
                            done: false,
                        },
                    ],
                };
            })
        );
    }

    async function handleDeleteTask(listId, taskId) {
        const targetList = lists.find((list) => list.id === listId);
        const backendListId = targetList?.backendId;
        const targetTask = targetList?.items?.find((item) => item.id === taskId);
        const backendTaskId = targetTask?.backendId;

        if (!backendListId || !backendTaskId) {
            console.error("Missing backend IDs for delete task", {
                listId,
                taskId,
                targetList,
                targetTask,
            });
            return;
        }

        await deleteTask(backendListId, backendTaskId);

        setLists((prev) =>
            prev.map((list) => {
                if (list.id !== listId) return list;
                return {
                    ...list,
                    items: list.items.filter((item) => item.id !== taskId),
                };
            })
        );
    }

    return (
        <div className="page">
            <header className="page__header">
                <h1 className="page__title">Shared To-Do</h1>
                <p className="page__subtitle">
                    Coordinate chores, shopping, and reminders together.
                </p>
                <div>
                    <button
                        type="button"
                        className="ctaButton"
                        onClick={openAddListModal}
                    >
                        Add to-do list
                    </button>
                </div>
            </header>

            <div className="todoListsPage_container">
                {lists.map((list) => (
                    <TodoList
                        key={list.id}
                        listId={list.id}
                        title={list.title}
                        items={list.items}
                        onItemsChange={handleUpdateItems}
                        onAddTask={handleAddTask}
                        onDeleteTask={handleDeleteTask}
                        onToggleTask={handleToggleTask}
                        onRequestRename={openRenameListModal}
                        onDeleteList={handleDeleteList}
                        onEditTask={handleEditTask}
                    />
                ))}
            </div>

            <ListNameModal
                isOpen={listNameModal.isOpen}
                title={
                    listNameModal.mode === "add"
                        ? "New to-do list"
                        : "Rename to-do list"
                }
                confirmLabel={listNameModal.mode === "add" ? "Add" : "Save"}
                initialValue={listNameModal.value}
                onCancel={closeListNameModal}
                onConfirm={handleSubmitListName}
            />
        </div>
    );
}