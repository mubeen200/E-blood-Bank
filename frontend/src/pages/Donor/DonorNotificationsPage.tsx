import { useEffect, useMemo, useState } from "react";
import api from "@/api/axiosClient";
import { DonorSidebar } from "@/components/layout/DonorSidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Bell,
  CheckCircle2,
  Clock,
  CalendarDays,
  Droplet,
  XCircle,
} from "lucide-react";

type DonorNotification = {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  meta?: {
    appointmentId?: string;
    locationName?: string;
    date?: string;
    timeSlot?: string;
  };
};

export function DonorNotificationsPage() {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<DonorNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const filtered = useMemo(() => {
    return onlyUnread
      ? notifications.filter((n) => !n.isRead)
      : notifications;
  }, [notifications, onlyUnread]);

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const loadNotifications = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setRefreshing(true);

      const res = await api.get("/donor/notifications");
      setNotifications(res.data?.notifications || []);
    } catch (err: any) {
      console.error("Load notifications error:", err);
      toast.error(
        err?.response?.data?.message ||
          "Failed to load notifications. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications(true);
  }, []);

  const iconForType = (type: string) => {
    switch (type) {
      case "APPOINTMENT_BOOKED":
        return <CalendarDays className="h-4 w-4 text-blue-200" />;
      case "APPOINTMENT_CANCELLED":
        return <XCircle className="h-4 w-4 text-red-300" />;
      case "DONATION_COMPLETED":
        return <Droplet className="h-4 w-4 text-red-300" />;
      case "MATCHING_REQUEST":
        return <Bell className="h-4 w-4 text-amber-300" />;
      default:
        return <Bell className="h-4 w-4 text-slate-200" />;
    }
  };

  const labelForType = (type: string) => {
    switch (type) {
      case "APPOINTMENT_BOOKED":
        return "Appointment booked";
      case "APPOINTMENT_CANCELLED":
        return "Appointment cancelled";
      case "DONATION_COMPLETED":
        return "Donation completed";
      case "MATCHING_REQUEST":
        return "Matching request";
      default:
        return "System";
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      const notif = notifications.find((n) => n._id === id);
      if (!notif || notif.isRead) return;

      await api.patch(`/donor/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err: any) {
      console.error("Mark notification read error:", err);
      toast.error("Failed to mark notification as read.");
    }
  };

  const handleMarkAllRead = async () => {
    if (!unreadCount) return;
    setMarkingAll(true);
    try {
      await api.patch("/donor/notifications/mark-all-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err: any) {
      console.error("Mark all read error:", err);
      toast.error("Failed to mark all as read.");
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="flex gap-6">
      <DonorSidebar />

      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Bell className="h-6 w-6 text-red-400" />
              Notifications
            </h1>
            <p className="text-sm text-slate-300">
              See reminders about your donation appointments and other important
              updates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={onlyUnread ? "outline" : "ghost"}
              size="sm"
              className={
                onlyUnread
                  ? "border-red-500/70 text-red-100 bg-red-900/40"
                  : "text-slate-200"
              }
              onClick={() => setOnlyUnread((v) => !v)}
            >
              <Clock className="h-4 w-4 mr-1" />
              {onlyUnread ? "Showing unread" : "Show only unread"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={markingAll || unreadCount === 0}
              onClick={handleMarkAllRead}
              className="border-slate-600 text-slate-100 hover:bg-slate-800/80"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {markingAll ? "Marking..." : "Mark all read"}
            </Button>
          </div>
        </div>

        {/* Summary */}
        <Card className="p-4 bg-slate-900/90 border-slate-700 text-white">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600/80">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase">
                  Notification overview
                </div>
                <p className="text-[11px] text-slate-300">
                  You have{" "}
                  <span className="font-semibold">{unreadCount}</span> unread
                  notification{unreadCount === 1 ? "" : "s"} out of{" "}
                  <span className="font-semibold">{notifications.length}</span>{" "}
                  total.
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              disabled={refreshing}
              onClick={() => loadNotifications(false)}
              className="text-slate-100 hover:bg-slate-800/80"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </Card>

        {/* List */}
        <section className="space-y-3">
          {loading ? (
            <Card className="p-4 bg-slate-900/90 border-slate-700 text-white">
              <p className="text-sm text-slate-300">Loading notifications…</p>
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="p-6 bg-slate-900/90 border-slate-700 text-white">
              <div className="flex flex-col items-center text-center gap-2">
                <Bell className="h-8 w-8 text-slate-400" />
                <div className="text-sm font-semibold">
                  No notifications to show.
                </div>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  Once you book appointments or when matching recipient
                  requests are added, they will appear here.
                </p>
              </div>
            </Card>
          ) : (
            filtered.map((n) => (
              <Card
                key={n._id}
                className={[
                  "p-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between",
                  n.isRead
                    ? "bg-slate-900/90 border-slate-700 text-white"
                    : "bg-red-900/80 border-red-500/70 text-white",
                ].join(" ")}
              >
                <div className="flex gap-3">
                  <div className="mt-1">{iconForType(n.type)}</div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold">{n.title}</div>
                      <span className="rounded-full border border-white/20 bg-black/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                        {labelForType(n.type)}
                      </span>
                      {!n.isRead && (
                        <span className="rounded-full bg-amber-400/90 text-black px-2 py-0.5 text-[10px] font-semibold">
                          New
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-[11px] text-slate-100">
                      {n.message}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-slate-300">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {formatDateTime(n.createdAt)}
                      </span>
                      {n.meta?.locationName && (
                        <span className="flex items-center gap-1">
                          <Droplet className="h-3 w-3" />
                          {n.meta.locationName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  {n.isRead ? (
                    <span className="text-[11px] text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Read
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkRead(n._id)}
                      className="border-white/50 text-white hover:bg-white/10"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Mark as read
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
