const QUEUE_KEY = "sevel_offline_queue";

type QueuedWrite = {
    id: string;
    table: string;
    operation: "insert" | "update" | "upsert" | "delete";
    data?: Record<string, unknown>;
    match?: Record<string, unknown>;
    timestamp: number;
};

function getQueue(): QueuedWrite[] {
    try {
        const raw = localStorage.getItem(QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveQueue(queue: QueuedWrite[]) {
    try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {}
}

export function enqueue(write: Omit<QueuedWrite, "id" | "timestamp">) {
    const queue = getQueue();
    queue.push({ ...write, id: crypto.randomUUID(), timestamp: Date.now() });
    saveQueue(queue);
}

export function queueLength(): number {
    return getQueue().length;
}

export async function flushQueue(
    supabase: { from: (table: string) => any }
): Promise<{ flushed: number; failed: number }> {
    const queue = getQueue();
    if (!queue.length) return { flushed: 0, failed: 0 };

    let flushed = 0;
    const remaining: QueuedWrite[] = [];

    for (const item of queue) {
        try {
            const table = supabase.from(item.table);
            let result: { error: any };

            switch (item.operation) {
                case "insert":
                    result = await table.insert(item.data);
                    break;
                case "update":
                    result = await table.update(item.data).match(item.match ?? {});
                    break;
                case "delete":
                    result = await table.delete().match(item.match ?? {});
                    break;
                default:
                    result = { error: null };
            }

            if (result.error) {
                remaining.push(item);
            } else {
                flushed++;
            }
        } catch {
            remaining.push(item);
        }
    }

    saveQueue(remaining);
    return { flushed, failed: remaining.length };
}

export function setupOnlineListener(
    supabase: { from: (table: string) => any }
) {
    function handleOnline() {
        flushQueue(supabase).catch(() => {});
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
}
