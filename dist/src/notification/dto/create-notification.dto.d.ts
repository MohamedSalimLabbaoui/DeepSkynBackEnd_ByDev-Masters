export declare class CreateNotificationDto {
    userId: string;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    actionUrl?: string;
}
