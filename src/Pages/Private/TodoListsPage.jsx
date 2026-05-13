import { useEffect, useMemo, useState } from "react";
import ListNameModal from "../../Components/ListNameModal.jsx";
import TodoList from "../../Components/TodoList.jsx";
import NoFamilyBanner from "../../Components/NoFamilyBanner.jsx";
import AddButton from "../../Components/AddButton.jsx";
import SegmentedControl from "../../Components/SegmentedControl.jsx";
import { getFamilyMembers } from "../../api/families.js";
import { fetchCurrentPersona } from "../../api/persona.js";
import {
    createTask,
    createTaskList,
    deleteTask,
    deleteTaskList,
    getTaskLists,
    updateTask,
    updateTaskListName,
} from "../../api/tasks.js";
import "./TodoListsPage/todoListsPage.css";
import "./TodoListsPage/todoListsPagedesktop.css";
import "./TodoListsPage/todoListsPagemobile.css";

export default function TodoListsPage() {
    const LIST_ID_KEYS = [
        "id",
        "listId",
        "taskListId",
    ];
    const NESTED_LIST_ID_KEYS = ["id"];
    const TASK_ID_KEYS = ["id", "taskId", "todoId", "uuid", "taskUuid", "todoUuid"];
    const NESTED_TASK_ID_KEYS = ["id", "taskId", "todoId", "uuid"];
    const TASK_NAME_KEYS = ["name", "taskName", "title", "text"];

    function pickFirstPresentValue(source, keys) {
        if (!source || typeof source !== "object") return null;

        for (const key of keys) {
            const value = source[key];
            if (value !== null && value !== undefined && value !== "") {
                return value;
            }
        }

        return null;
    }

    const [lists, setLists] = useState([]);
    const [familyMembers, setFamilyMembers] = useState([]);
    const [hasFamily, setHasFamily] = useState(true);
    const [todoFilter, setTodoFilter] = useState("Shared");

    useEffect(() => {
        fetchCurrentPersona()
            .then((data) => setHasFamily(Boolean(data?.family)))
            .catch(() => setHasFamily(true));
    }, []);
    const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
    const [participantsDropdownOpen, setParticipantsDropdownOpen] = useState(false);
    const [listNameModal, setListNameModal] = useState({
        isOpen: false,
        mode: "add",
        listId: null,
        value: "",
    });

    function openAddListModal() {
        setSelectedParticipantIds([]);
        setParticipantsDropdownOpen(false);
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

        setSelectedParticipantIds(
            Array.isArray(targetList.participantIds) ? targetList.participantIds : []
        );
        setParticipantsDropdownOpen(false);

        setListNameModal({
            isOpen: true,
            mode: "rename",
            listId,
            value: targetList.title,
        });
    }

    function closeListNameModal() {
        setParticipantsDropdownOpen(false);
        setListNameModal((prev) => ({ ...prev, isOpen: false }));
    }

    function toggleParticipant(participantId) {
        setSelectedParticipantIds((current) => {
            if (current.includes(participantId)) {
                return current.filter((id) => id !== participantId);
            }
            return [...current, participantId];
        });
    }

    function resolveBackendListId(list) {
        return (
            pickFirstPresentValue(list, LIST_ID_KEYS) ||
            pickFirstPresentValue(list?.taskList, NESTED_LIST_ID_KEYS)
        );
    }

    function resolveBackendTaskId(task) {
        return (
            pickFirstPresentValue(task, TASK_ID_KEYS) ||
            pickFirstPresentValue(task?.task, NESTED_TASK_ID_KEYS) ||
            pickFirstPresentValue(task?.todo, NESTED_TASK_ID_KEYS) ||
            pickFirstPresentValue(task?.taskItem, NESTED_TASK_ID_KEYS)
        );
    }

    function resolveBackendTaskName(task) {
        return pickFirstPresentValue(task, TASK_NAME_KEYS) || "Untitled task";
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
            : null;

        const backendTasks = Array.isArray(list?.tasks)
            ? list.tasks
            : Array.isArray(taskContainer?.tasks)
                ? taskContainer.tasks
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
                : [];

        return backendLists.map((list) => {
            const backendId = resolveBackendListId(list);
            const participantCandidates =
                list.participantIds ||
                list.participants ||
                list.memberIds ||
                list.members ||
                list.assigneeIds ||
                list.assignees ||
                list?.taskList?.participantIds ||
                [];

            const participantIds = Array.isArray(participantCandidates)
                ? [...new Set(
                    participantCandidates
                        .map((participant) => {
                            if (participant === null || participant === undefined) return null;

                            if (typeof participant === "string" || typeof participant === "number") {
                                const value = Number(participant);
                                return Number.isInteger(value) ? value : null;
                            }

                            if (typeof participant !== "object") return null;

                            const participantId =
                                participant.id ||
                                participant.personaId ||
                                participant.userId ||
                                participant.memberId;

                            const normalized = Number(participantId);
                            return Number.isInteger(normalized) ? normalized : null;
                        })
                        .filter((value) => value !== null)
                )]
                : [];

            return {
                id: backendId ? String(backendId) : crypto.randomUUID(),
                backendId: backendId ? String(backendId) : null,
                title:
                    list.name ||
                    list.title ||
                    list.taskListName ||
                    "Untitled list",
                participantIds,
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

        async function loadData() {
            try {
                const [listsData, membersData] = await Promise.all([
                    getTaskLists(),
                    getFamilyMembers(),
                ]);
                if (!isMounted) return;

                setLists(mapBackendLists(listsData));
                setFamilyMembers(Array.isArray(membersData) ? membersData : []);
            } catch (err) {
                console.error(err.message || "Failed to load task list data");
            }
        }

        loadData();

        return () => {
            isMounted = false;
        };
    }, []);

    const selectedParticipantLabels = useMemo(() => {
        if (selectedParticipantIds.length === 0) {
            return "Family";
        }

        const membersById = new Map(familyMembers.map((member) => [member.id, member.name]));
        return selectedParticipantIds
            .map((participantId) => membersById.get(participantId) || participantId)
            .join(", ");
    }, [familyMembers, selectedParticipantIds]);

    const visibleLists = useMemo(() => {
        return lists.filter((list) => {
            const participantCount = Array.isArray(list.participantIds)
                ? list.participantIds.length
                : 0;

            if (todoFilter === "Mine") {
                return participantCount === 1;
            }

            return participantCount !== 1;
        });
    }, [lists, todoFilter]);

    async function handleSubmitListName(name) {
        const title = name.trim();
        if (!title) return;

        if (listNameModal.mode === "add") {
            try {
                await createTaskList(title, selectedParticipantIds);
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
            await updateTaskListName(backendId, title, selectedParticipantIds);
        } catch (err) {
            console.error(err.message || "Failed to rename list");
            return;
        }

        setLists((prev) =>
            prev.map((list) =>
                list.id === listNameModal.listId
                    ? { ...list, title, participantIds: [...new Set(selectedParticipantIds)] }
                    : list
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
            ? String(resolveBackendTaskId(createdTask) || "") || null
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

    if (!hasFamily) {
        return <NoFamilyBanner onFamilyJoined={() => setHasFamily(true)} />;
    }

    return (
        <div className="page">
            <header className="page__header todoListsPage_header">
                <h1 className="page__title">Our Priorities,</h1>
                <h1 className="page__title">Our Future</h1>
                <p className="page__subtitle">
                    Focus on what trully Matters.
                </p>
            </header>

            <div className="todoListsPage_actions">
                <SegmentedControl
                    options={["Mine", "Shared"]}
                    value={todoFilter}
                    onChange={setTodoFilter}
                />
                <AddButton onClick={openAddListModal} />
            </div>

            <div className="todoListsPage_container">
                {visibleLists.map((list) => (
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
                        : "Edit to-do list"
                }
                confirmLabel={listNameModal.mode === "add" ? "Add" : "Save"}
                initialValue={listNameModal.value}
                showParticipants
                familyMembers={familyMembers}
                selectedParticipantIds={selectedParticipantIds}
                participantsDropdownOpen={participantsDropdownOpen}
                selectedParticipantLabel={selectedParticipantLabels}
                onToggleParticipantsDropdown={() =>
                    setParticipantsDropdownOpen((current) => !current)
                }
                onToggleParticipant={toggleParticipant}
                onCancel={closeListNameModal}
                onConfirm={handleSubmitListName}
            />
        </div>
    );
}