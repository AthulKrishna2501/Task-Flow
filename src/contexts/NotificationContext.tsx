import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { Notification, NotificationContextType } from '@/types/notifications';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types/database';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const SOUND_URL = 'https://cdn.pixabay.com/audio/2022/03/15/audio_7838575086.mp3';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const { user } = useAuth();
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Load/Save Persistence
    useEffect(() => {
        if (user) {
            const saved = localStorage.getItem(`notifications_${user.id}`);
            if (saved) {
                try {
                    setNotifications(JSON.parse(saved));
                } catch (e) {
                    console.error('Failed to parse notifications', e);
                    setNotifications([]);
                }
            } else {
                setNotifications([]);
            }

            // Initialize audio
            if (!audioRef.current) {
                audioRef.current = new Audio(SOUND_URL);
                audioRef.current.load();
            }
        } else {
            setNotifications([]);
            audioRef.current = null;
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            localStorage.setItem(`notifications_${user.id}`, JSON.stringify(notifications));
        }
    }, [notifications, user]);

    // Global Real-time Listener for Task Assignments
    useEffect(() => {
        if (!user) return;

        console.log('Setting up global notification listener for user:', user.id);

        const channel = supabase
            .channel(`global-notifications-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'tasks',
                    filter: `assigned_user_id=eq.${user.id}`
                },
                (payload) => {
                    console.log('Global notification received:', payload);
                    const newTask = payload.new as Task;
                    addNotification({
                        title: 'New Task Assigned',
                        description: `You have been assigned: "${newTask.task_name}"`,
                        type: 'task'
                    });
                }
            )
            .subscribe((status) => {
                console.log('Global notification subscription status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const playSound = () => {
        if (audioRef.current) {
            try {
                audioRef.current.currentTime = 0;
                audioRef.current.volume = 0.4;
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.warn('Audio play blocked (user interaction needed):', error);
                    });
                }
            } catch (e) {
                console.error('Failed to play sound:', e);
            }
        }
    };

    const addNotification = (notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        const newNotif: Notification = {
            ...notif,
            id: Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toISOString(),
            read: false,
        };
        setNotifications((prev) => [newNotif, ...prev]);
        playSound();
    };

    const markAsRead = (id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const markAllAsRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                addNotification,
                markAsRead,
                markAllAsRead,
                clearAll,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
