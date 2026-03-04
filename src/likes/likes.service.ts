import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Like } from '@prisma/client';

@Injectable()
export class LikesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liker un post
   */
  async like(userId: string, postId: string): Promise<Like> {
    // Vérifier que le post existe
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException(`Post ${postId} non trouvé`);
    }

    // Vérifier si déjà liké
    const existingLike = await this.prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existingLike) {
      throw new ConflictException('Vous avez déjà liké ce post');
    }

    return this.prisma.like.create({
      data: { userId, postId },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  /**
   * Unliker un post
   */
  async unlike(userId: string, postId: string): Promise<void> {
    const existingLike = await this.prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (!existingLike) {
      throw new NotFoundException('Like non trouvé');
    }

    await this.prisma.like.delete({
      where: { userId_postId: { userId, postId } },
    });
  }

  /**
   * Toggle like/unlike un post
   */
  async toggle(
    userId: string,
    postId: string,
  ): Promise<{ liked: boolean; likesCount: number }> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException(`Post ${postId} non trouvé`);
    }

    const existingLike = await this.prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existingLike) {
      await this.prisma.like.delete({
        where: { userId_postId: { userId, postId } },
      });
    } else {
      await this.prisma.like.create({
        data: { userId, postId },
      });
    }

    const likesCount = await this.prisma.like.count({ where: { postId } });

    return { liked: !existingLike, likesCount };
  }

  /**
   * Récupérer les likes d'un post
   */
  async findByPost(
    postId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ likes: Like[]; total: number }> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException(`Post ${postId} non trouvé`);
    }

    const skip = (page - 1) * limit;

    const [likes, total] = await Promise.all([
      this.prisma.like.findMany({
        where: { postId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      }),
      this.prisma.like.count({ where: { postId } }),
    ]);

    return { likes, total };
  }

  /**
   * Vérifier si un utilisateur a liké un post
   */
  async hasLiked(userId: string, postId: string): Promise<boolean> {
    const like = await this.prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });
    return !!like;
  }
}
