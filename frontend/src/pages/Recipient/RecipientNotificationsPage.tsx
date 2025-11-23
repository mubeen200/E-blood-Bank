import { useEffect, useState } from "react";
import { RecipientSidebar } from "@/components/layout/RecipientSidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import api from "@/api/axiosClient";
import { toast } from "sonner";
import { Bell, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

type NotificationItem = {
  _id: string;
  title: string;
  message?: string;
  type?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
};

type Filter = "ALL" | "UNREAD" | "READ";

export function RecipientNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get("/recipient/notifications");
      const list: NotificationItem[] = res.data?.notifications || [];
      setNotifications(list);
      setUnreadCount(res.data?.unreadCount || 0);
    } catch (err: any) {
      console.error("Load recipient notifications error:", err);
      toast.error(
        err?.response?.data?.message ||
          "Failed to load notifications. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await api.patch(`/recipient/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === id ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0));
    } catch (err: any) {
      console.error("Mark notification read error:", err);
      toast.error(
        err?.response?.data?.message ||
          "Failed to mark notification as read."
      );
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      await api.patch("/recipient/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read.");
    } catch (err: any) {
      console.error("Mark all notifications read error:", err);
      toast.error(
        err?.response?.data?.message ||
          "Failed to mark all notifications as read."
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === "UNREAD") return !n.isRead;
    if (filter === "READ") return n.isRead;
    return true;
  });

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const filterButtonClasses = (current: Filter) =>
    [
      "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
      filter === current
        ? "bg-red-600 text-white border-red-400"
        : "bg-black/10 text-red-100/80 border-white/20 hover:bg-white/10",
    ].join(" ");

  const typeIcon = (type?: string) => {
    if (type === "EMERGENCY_REQUEST") {
      return <AlertTriangle className="h-4 w-4 text-amber-300" />;
    }
    if (type === "REQUEST") {
      return <DropletIcon />;
    }
    return <Info className="h-4 w-4 text-blue-200" />;
  };

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <div className="w-full lg:w-72 shrink-0">
        <RecipientSidebar active="notifications" />
      </div>

      {/* Main content */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Bell className="h-6 w-6 text-red-400" />
            Notifications
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            System alerts about your blood requests, emergencies and account
            activity appear here.
          </p>
        </div>

        {/* Filters & actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300">Filter:</span>
            <button
              type="button"
              className={filterButtonClasses("ALL")}
              onClick={() => setFilter("ALL")}
            >
              All
            </button>
            <button
              type="button"
              className={filterButtonClasses("UNREAD")}
              onClick={() => setFilter("UNREAD")}
            >
              Unread
              {unreadCount > 0 && (
                <span className="ml-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 text-[10px] text-white px-1">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              className={filterButtonClasses("READ")}
              onClick={() => setFilter("READ")}
            >
              Read
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={markingAll || unreadCount === 0}
              onClick={handleMarkAllRead}
              className="border-slate-600 bg-slate-900/70 text-slate-100 hover:bg-slate-800"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {markingAll ? "Marking…" : "Mark all as read"}
            </Button>
          </div>
        </div>

        {/* Notifications list */}
        <Card className="bg-slate-900/90 border-slate-700 text-white p-4">
          {loading ? (
            <div className="py-10 flex items-center justify-center text-sm text-slate-300">
              Loading notifications…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-300">
              <p>No notifications found.</p>
              <p className="text-xs text-slate-500 mt-1">
                You’ll see alerts here when you submit blood requests or
                emergencies.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((n) => (
                <li key={n._id}>
                  <div
                    className={[
                      "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 rounded-2xl border px-3 py-3.5",
                      n.isRead
                        ? "border-slate-700 bg-slate-950/60"
                        : "border-red-500/70 bg-red-900/20",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {typeIcon(n.type)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{n.title}</p>
                          {!n.isRead && (
                            <span className="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                              New
                            </span>
                          )}
                        </div>
                        {n.message && (
                          <p className="text-xs text-slate-200">
                            {n.message}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-400">
                          {formatDateTime(n.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      {n.link && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="border-slate-500 bg-slate-900/80 text-xs"
                        >
                          <Link to={n.link}>View details</Link>
                        </Button>
                      )}

                      {!n.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkRead(n._id)}
                          className="text-xs text-red-200 hover:bg-red-900/50"
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

// small droplet icon for request notifications
function DropletIcon() {
  return (
    <svg
      className="h-4 w-4 text-red-300"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path d="M10.5 2.5a.75.75 0 0 0-1 0C8.3 3.55 4.5 7.53 4.5 11a5 5 0 0 0 10 0c0-3.47-3.8-7.45-4.5-8.5z" />
    </svg>
  );
}
