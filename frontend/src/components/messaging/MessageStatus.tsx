'use client';

import React, { useState, useRef, useEffect } from 'react';

interface MessageStatusProps {
    isOwnMessage: boolean;
    deliveredAt: string | null;
    readAt: string | null;
    createdAt: string;
}

export const MessageStatus: React.FC<MessageStatusProps> = ({
    isOwnMessage,
    deliveredAt,
    readAt,
    createdAt,
}) => {
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    const contextMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
                setShowContextMenu(false);
            }
        };

        if (showContextMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showContextMenu]);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setContextMenuPosition({ x: e.clientX, y: e.clientY });
        setShowContextMenu(true);
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleString([], {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    if (!isOwnMessage) return null;

    const getStatusIcon = () => {
        if (readAt) {
            // Blue double checkmark for read
            return (
                <span className="text-blue-500 font-bold" title="Read">
                    ✓✓
                </span>
            );
        } else if (deliveredAt) {
            // Gray double checkmark for delivered
            return (
                <span className="text-gray-400 font-bold" title="Delivered">
                    ✓✓
                </span>
            );
        } else {
            // Single checkmark for sent
            return (
                <span className="text-gray-400 font-bold" title="Sent">
                    ✓
                </span>
            );
        }
    };

    return (
        <>
            <span
                className="text-xs cursor-context-menu select-none"
                onContextMenu={handleContextMenu}
            >
                {getStatusIcon()}
            </span>

            {showContextMenu && (
                <div
                    ref={contextMenuRef}
                    className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-2 px-3 min-w-[200px]"
                    style={{
                        left: `${contextMenuPosition.x}px`,
                        top: `${contextMenuPosition.y}px`,
                    }}
                >
                    <div className="text-sm font-semibold text-gray-700 mb-2 pb-2 border-b">
                        Message Info
                    </div>
                    <div className="space-y-2 text-xs">
                        <div>
                            <div className="text-gray-500 font-medium">Sent</div>
                            <div className="text-gray-900">{formatTimestamp(createdAt)}</div>
                        </div>
                        {deliveredAt && (
                            <div>
                                <div className="text-gray-500 font-medium">Delivered</div>
                                <div className="text-gray-900">{formatTimestamp(deliveredAt)}</div>
                            </div>
                        )}
                        {readAt && (
                            <div>
                                <div className="text-gray-500 font-medium">Read</div>
                                <div className="text-gray-900">{formatTimestamp(readAt)}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};
