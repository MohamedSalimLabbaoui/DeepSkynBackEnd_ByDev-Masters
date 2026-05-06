export declare class BroadcastNotificationDto {
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    actionUrl?: string;
}
