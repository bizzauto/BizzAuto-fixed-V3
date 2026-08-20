import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { notificationsAPI } from '../lib/api';

interface Notification {
	id: string;
	title: string;
	message: string;
	type: 'info' | 'success' | 'warning' | 'critical';
	isRead: boolean;
	createdAt: string;
	link?: string;
}

const typeConfig = {
	info: { icon: <Info size={16} />, bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
	success: { icon: <Check size={16} />, bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
	warning: { icon: <AlertTriangle size={16} />, bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800' },
	critical: { icon: <AlertCircle size={16} />, bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
};

const NotificationCenter: React.FC<{ onNavigate?: (tab: string) => void; onClose?: () => void }> = ({ onNavigate, onClose }) => {
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [filter, setFilter] = useState<'all' | 'unread'>('all');
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchNotifications = async () => {
			try {
				setLoading(true);
				const res = await notificationsAPI.list();
				const backendNotifications = res.data?.data?.notifications || [];
				const mapped = backendNotifications.map((n: any) => ({
					id: n.id,
					title: n.title,
					message: n.message,
					type: (n.type === 'lead_captured' || n.type === 'campaign_sent' || n.type === 'payment_received') ? 'info' :
						(n.type === 'warning' || n.priority === 'high') ? 'warning' :
						(n.type === 'error' || n.priority === 'critical') ? 'critical' : 'info',
					isRead: n.isRead,
					createdAt: n.createdAt ? new Date(n.createdAt).toLocaleDateString() : '',
					link: n.link,
				}));
				setNotifications(mapped);
			} catch (err) {
				console.error('Failed to fetch notifications:', err);
				setNotifications([]);
			} finally {
				setLoading(false);
			}
		};
		fetchNotifications();
	}, []);

	const unreadCount = notifications.filter(n => !n.isRead).length;
	const filtered = filter === 'unread' ? notifications.filter(n => !n.isRead) : notifications;

	const markRead = async (id: string) => {
		try {
			await notificationsAPI.markRead(id);
			setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
		} catch (err) {
			console.error('Failed to mark notification as read:', err);
		}
	};

	const markAllRead = async () => {
		try {
			await notificationsAPI.markAllRead();
			setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
		} catch (err) {
			console.error('Failed to mark all notifications as read:', err);
		}
	};

	const deleteNotif = async (id: string) => {
		try {
			await notificationsAPI.delete(id);
			setNotifications(prev => prev.filter(n => n.id !== id));
		} catch (err) {
			console.error('Failed to delete notification:', err);
		}
	};

	const handleNotifClick = (n: Notification) => {
		markRead(n.id);
		if (n.link && onNavigate) onNavigate(n.link);
		if (onClose) onClose();
	};

	if (loading) {
		return (
			<div className="w-96 max-h-[500px] flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
				<div className="flex items-center justify-center p-8">
					<div className="flex flex-col items-center gap-2">
						<div className="w-6 h-6 border-2 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
						<p className="text-xs text-gray-400">Loading...</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="w-96 max-h-[500px] flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
			<div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
				<div className="flex items-center gap-2">
					<Bell size={18} className="text-gray-700 dark:text-gray-300" />
					<h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
					{unreadCount > 0 && (
						<span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">{unreadCount}</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					{unreadCount > 0 && (
						<button onClick={markAllRead} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1" title="Mark all read">
							<CheckCheck size={14} /> Mark all read
						</button>
					)}
					{onClose && (
						<button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
							<X size={16} className="text-gray-500" />
						</button>
					)}
				</div>
			</div>

			<div className="flex border-b border-gray-200 dark:border-gray-700">
				<button
					onClick={() => setFilter('all')}
					className={`flex-1 py-2 text-sm font-medium ${filter === 'all' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
				>
					All ({notifications.length})
				</button>
				<button
					onClick={() => setFilter('unread')}
					className={`flex-1 py-2 text-sm font-medium ${filter === 'unread' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
				>
					Unread ({unreadCount})
				</button>
			</div>

			<div className="flex-1 overflow-y-auto">
				{filtered.length === 0 ? (
					<div className="p-8 text-center">
						<Bell size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
						<p className="text-gray-500 dark:text-gray-400 text-sm">No notifications</p>
					</div>
				) : (
					filtered.map(n => {
						const cfg = typeConfig[n.type];
						return (
							<div
								key={n.id}
								onClick={() => handleNotifClick(n)}
								className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors relative ${!n.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
							>
								<div className="flex gap-3">
									<div className={`flex-shrink-0 w-8 h-8 rounded-full ${cfg.bg} ${cfg.text} flex items-center justify-center`}>
										{cfg.icon}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-start justify-between gap-2">
											<p className={`text-sm font-medium ${n.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>{n.title}</p>
											<span className="text-xs text-gray-400 whitespace-nowrap">{n.createdAt}</span>
										</div>
										<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
									</div>
									<div className="flex flex-col gap-1 flex-shrink-0">
										{!n.isRead && (
											<button onClick={(e) => { e.stopPropagation(); markRead(n.id); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Mark read">
												<Check size={12} className="text-gray-400" />
											</button>
										)}
										<button onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded" title="Delete">
											<Trash2 size={12} className="text-gray-400 hover:text-red-500" />
										</button>
									</div>
								</div>
								{!n.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full absolute top-4 right-4" />}
							</div>
						);
					})
				)}
			</div>
		</div>
	);
};

export default NotificationCenter;