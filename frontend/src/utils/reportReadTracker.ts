const storageKey = (userId: string) => `viewed_reports_${userId}`;

type ViewedMap = Record<string, string>; // reportId → ISO timestamp

const load = (userId: string): ViewedMap => {
    try {
        const raw = localStorage.getItem(storageKey(userId));
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

const save = (userId: string, map: ViewedMap): void => {
    localStorage.setItem(storageKey(userId), JSON.stringify(map));
};

export const markViewed = (userId: string, reportId: string): void => {
    const map = load(userId);
    map[reportId] = new Date().toISOString();
    save(userId, map);
};

export const isUnread = (report: any, userId: string): boolean => {
    const map = load(userId);
    if (!map[report.id]) return true;
    return new Date(report.updatedAt) > new Date(map[report.id]);
};

export const countUnread = (reports: any[], userId: string): number =>
    reports.filter(r => isUnread(r, userId)).length;
