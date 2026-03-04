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

    async updateStatus(userId: string, isActive: boolean) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { isActive },
        });
    }
}
