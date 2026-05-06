export declare class AdminUsersQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: 'active' | 'inactive';
    subscriptionStatus?: string;
    skinType?: string;
}
