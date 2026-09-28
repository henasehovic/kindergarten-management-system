import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  fetchAlerts,
  getRequests,
  markAllRead,
  markRead,
  updateRequestStatus,
} from '../../lib/adminDataService'

const AdminDataContext = createContext(null)

export const useAdminData = () => useContext(AdminDataContext)

export function AdminDataProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [requests, setRequests] = useState([])
  const [activity, setActivity] = useState([])
  const [todayOverview, setTodayOverview] = useState({
    childrenPresent: 0,
    childrenAbsent: 0,
    staffPresent: 0,
    staffAbsent: 0,
    overduePayments: 0,
    availableSpots: 0,
    eventsToday: 0,
    birthdaysToday: 0,
  })
  const [loadingData, setLoadingData] = useState(true)

  const refresh = useCallback(async () => {
    setLoadingData(true)
    try {
      const [alerts, requestData] = await Promise.all([fetchAlerts(), getRequests()])
      setNotifications(alerts.notifications || [])
      setActivity(alerts.activity || [])
      setTodayOverview(alerts.today || {})
      setRequests(requestData || [])
    } catch (err) {
      console.error('Admin data refresh failed', err)
      setRequests([])
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications])
  const pendingRequests = useMemo(() => requests.filter((r) => r.status === 'new'), [requests])

  const addNotification = useCallback(async (payload) => {
    const note = { id: payload.id || `note-${Date.now()}`, isRead: false, createdAt: new Date().toISOString(), ...payload }
    setNotifications((prev) => [note, ...prev])
    return note
  }, [])

  const setNotificationRead = useCallback(async (id, isRead = true) => {
    setNotifications((prev) => markRead(id, isRead, prev))
  }, [])

  const markAllNotificationsRead = useCallback(async () => {
    setNotifications((prev) => markAllRead(prev))
  }, [])

  const handleUpdateRequestStatus = useCallback(async (id, status) => {
    const updatedReq = await updateRequestStatus(id, status)
    const refreshed = await getRequests()
    setRequests(refreshed)
    return updatedReq
  }, [])

  // Placeholder create handler to keep context API stable (requests are created via public endpoints)
  const handleCreateRequest = useCallback(async (data) => {
    return data
  }, [])

  const value = useMemo(
    () => ({
      notifications,
      requests,
      activity,
      todayOverview,
      loadingData,
      unreadCount,
      pendingRequests,
      refresh,
      addNotification,
      setNotificationRead,
      markAllNotificationsRead,
      createRequest: handleCreateRequest,
      updateRequestStatus: handleUpdateRequestStatus,
    }),
    [
      activity,
      addNotification,
      handleCreateRequest,
      handleUpdateRequestStatus,
      loadingData,
      markAllNotificationsRead,
      notifications,
      pendingRequests,
      refresh,
      requests,
      setNotificationRead,
      todayOverview,
      unreadCount,
    ]
  )

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>
}
