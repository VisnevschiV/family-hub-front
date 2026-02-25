import { useEffect, useState } from "react";
import ListNameModal from "../../Components/ListNameModal.jsx";
import TodoList from "../../Components/TodoList.jsx";
import {
    createTaskList,
    deleteTaskList,
    getTaskLists,
} from "../../api/tasks.js";
import "./TodoListsPage.css";

const DEBUG_LIST_ID = "699ef2578fd6125c2bdd8c90";

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
                items: [],
            };
        });
    }

    function debugListIdPresence(data) {
        const backendLists = Array.isArray(data)
            ? data
            : Array.isArray(data?.taskLists)
                ? data.taskLists
                : Array.isArray(data?.lists)
                    ? data.lists
                    : Array.isArray(data?.tasklists)
                        ? data.tasklists
                        : [];

        const rawIds = backendLists
            .map((list) => resolveBackendListId(list))
            .filter(Boolean)
            .map(String);

        const hasTargetId = rawIds.includes(DEBUG_LIST_ID);

        console.log("[tasks][read-debug] target id present:", hasTargetId, {
            targetId: DEBUG_LIST_ID,
            receivedIds: rawIds,
            totalLists: backendLists.length,
        });

        if (backendLists.length > 0) {
            const first = backendLists[0];
            console.log("[tasks][read-debug] first list raw keys:", Object.keys(first));
            console.log("[tasks][read-debug] first list raw object:", first);
            console.log("[tasks][read-debug] first list id candidates:", {
                id: first.id,
                ID: first.ID,
                getId: first.getId,
                getID: first.getID,
                uuid: first.uuid,
                listId: first.listId,
                listID: first.listID,
                taskListId: first.taskListId,
                taskListID: first.taskListID,
                nestedTaskList: first.taskList,
            });
        }
    }

    async function refreshLists() {
        const data = await getTaskLists();
        debugListIdPresence(data);
        setLists(mapBackendLists(data));
    }

    useEffect(() => {
        let isMounted = true;

        async function loadLists() {
            try {
                const data = await getTaskLists();
                if (!isMounted) return;

                debugListIdPresence(data);
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

    function handleEditTask(listId, taskId, nextText) {
        const text = nextText.trim();
        if (!text) return;

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