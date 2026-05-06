export declare class UpdateNotificationDto {
    title?: string;
    message?: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    isRead?: boolean;
    actionUrl?: string;
}
