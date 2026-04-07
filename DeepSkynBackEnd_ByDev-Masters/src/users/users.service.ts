import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma } from '@prisma/client';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async findOne(id: string) {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }

    async update(id: string, updateUserDto: UpdateUserDto) {
        return this.prisma.user.update({
            where: { id },
            data: updateUserDto,
        });
    }

    async findById(id: string) {
        return this.prisma.user.findUnique({
            where: { id },
            include: {
                skinProfile: true,
                routines: {
                    where: { isActive: true },
                    orderBy: { createdAt: 'desc' },
                    take: 5
                },
                _count: {
                    select: {
                        posts: true,
                        followers: true,
                        following: true
                    }
                }
            }
        });
    }

    async findByIdWithFollowStatus(id: string, viewerId?: string) {
        const user = await this.findById(id);
        if (!user) return null;

        let isFollowing = false;
        if (viewerId && viewerId !== id) {
            const follow = await this.prisma.follower.findUnique({
                where: {
                    followerId_followingId: {
                        followerId: viewerId,
                        followingId: id
                    }
                }
            });
            isFollowing = !!follow;
        }

        return { ...user, isFollowing };
    }

    async findAllForAdmin(query: AdminUsersQueryDto) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;

        const where: Prisma.UserWhereInput = {
            ...(query.search
                ? {
                    OR: [
                        { email: { contains: query.search, mode: 'insensitive' } },
                        { name: { contains: query.search, mode: 'insensitive' } },
                    ],
                }
                : {}),
            ...(query.role ? { role: query.role } : {}),
            ...(query.status ? { isActive: query.status === 'active' } : {}),
            ...(query.subscriptionStatus
                ? { subscription: { is: { status: query.subscriptionStatus } } }
                : {}),
            ...(query.skinType
                ? { skinProfile: { is: { skinType: query.skinType } } }
                : {}),
        };

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    skinProfile: {
                        select: {
                            skinType: true,
                            healthScore: true,
                        },
                    },
                    subscription: {
                        select: {
                            plan: true,
                            status: true,
                            endDate: true,
                        },
                    },
                    _count: {
                        select: {
                            analyses: true,
                            posts: true,
                        },
                    },
                },
            }),
            this.prisma.user.count({ where }),
        ]);

        return { users, total, page, limit };
    }

    async findOneForAdmin(userId: string) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                skinProfile: true,
                subscription: true,
                analyses: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                },
                routines: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                _count: {
                    select: {
                        posts: true,
                        comments: true,
                        likes: true,
                        analyses: true,
                    },
                },
            },
        });
    }

    async findSuggestions(userId: string, limit: number = 20) {
        // Find users that are public and NOT the current user
        // and that the current user is NOT already following
        const connections = await this.prisma.follower.findMany({
            where: { OR: [{ followerId: userId }, { followingId: userId }] },
            select: { followerId: true, followingId: true }
        });
        const followingIds = connections.map(f => f.followerId === userId ? f.followingId : f.followerId);

        return this.prisma.user.findMany({
            where: {
                id: { not: userId, notIn: followingIds },
                isPublic: true,
                isActive: true,
            },
            take: limit,
            select: {
                id: true,
                name: true,
                avatar: true,
                isPublic: true,
                skinProfile: {
                    select: { skinType: true }
                },
                _count: {
                    select: { followers: true }
                }
            }
        });
    }

    async toggleFollow(followerId: string, followingId: string) {
        if (followerId === followingId) throw new Error("Vous ne pouvez pas vous suivre vous-même");

        const existing = await this.prisma.follower.findFirst({
            where: {
                OR: [
                    { followerId, followingId },
                    { followerId: followingId, followingId: followerId }
                ]
            }
        });

        if (existing) {
            await this.prisma.follower.delete({
                where: { id: existing.id }
            });
            return { followed: false };
        } else {
            await this.prisma.follower.create({
                data: { followerId, followingId }
            });
            return { followed: true };
        }
    }

    async updateStatus(userId: string, isActive: boolean) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { isActive },
        });
    }

    async getUserStats(userId: string) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [postsCount, followersCount, followingCount, recentFollowers, totalLikes, totalComments, weeklyPosts, aggregates] = await Promise.all([
            this.prisma.post.count({ where: { userId, status: 'published' } }),
            this.prisma.follower.count({ where: { OR: [{ followingId: userId }, { followerId: userId }] } }),
            this.prisma.follower.count({ where: { OR: [{ followingId: userId }, { followerId: userId }] } }),
            this.prisma.follower.findMany({
                where: { OR: [{ followingId: userId }, { followerId: userId }] },
                take: 15, // Let's bring more friends to the grid!
                orderBy: { createdAt: 'desc' },
                include: {
                    follower: { select: { id: true, avatar: true, name: true } },
                    following: { select: { id: true, avatar: true, name: true } }
                }
            }),
            this.prisma.like.count({ where: { post: { userId } } }),
            this.prisma.comment.count({ where: { post: { userId } } }),
            this.prisma.post.findMany({
                where: { userId, createdAt: { gte: sevenDaysAgo } },
                select: { createdAt: true }
            }),
            this.prisma.post.aggregate({
                where: { userId },
                _sum: {
                    views: true,
                    impressions: true
                }
            })
        ]);

        // Calculate weekly activity (posts per day for the last 7 days)
        const dayCounts = new Array(7).fill(0);
        const now = new Date();
        weeklyPosts.forEach(post => {
            const diffDays = Math.floor((now.getTime() - post.createdAt.getTime()) / (1000 * 3600 * 24));
            if (diffDays >= 0 && diffDays < 7) {
                dayCounts[6 - diffDays]++;
            }
        });

        const avatars = recentFollowers
            .map(f => f.followerId === userId ? f.following.avatar : f.follower.avatar)
            .filter((a): a is string => !!a);

        const followersList = recentFollowers.map(f => {
            const friend = f.followerId === userId ? f.following : f.follower;
            return {
                id: friend.id,
                name: friend.name || 'Anonyme',
                avatar: friend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name || 'A')}`,
                time: this.getRelativeTime(f.createdAt),
                views: Math.floor(Math.random() * 100) + 50 
            };
        });

        return {
            posts: postsCount,
            followers: followersCount,
            following: followingCount,
            recentFollowersAvatars: avatars,
            totalLikes,
            totalComments,
            weeklyActivity: dayCounts,
            followersDetail: followersList,
            storyViews: aggregates._sum.views || 0,
            impressions: aggregates._sum.impressions || 0,
            shares: Math.floor(totalLikes * 0.1) // Shares still mocked if no field exists, or use likes ratio
        };
    }

    private getRelativeTime(date: Date): string {
        const now = new Date();
        const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (diffSeconds < 60) return "À l'instant";
        if (diffSeconds < 3600) return `Il y a ${Math.floor(diffSeconds / 60)}m`;
        if (diffSeconds < 86400) return `Il y a ${Math.floor(diffSeconds / 3600)}h`;
        return `Il y a ${Math.floor(diffSeconds / 86400)}j`;
    }
}
