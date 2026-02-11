import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto, UpdateCommentDto } from './dto';
import { Comment } from '@prisma/client';

export interface CommentWithUser extends Comment {
  user: { id: string; name: string | null; avatar: string | null };
}

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ajouter un commentaire à un post
   */
  async create(userId: string, createCommentDto: CreateCommentDto): Promise<CommentWithUser> {
    // Vérifier que le post existe
    const post = await this.prisma.post.findUnique({
      where: { id: createCommentDto.postId },
    });

    if (!post) {
      throw new NotFoundException(`Post ${createCommentDto.postId} non trouvé`);
    }

    return this.prisma.comment.create({
      data: {
        userId,
        postId: createCommentDto.postId,
        comment: createCommentDto.comment,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  /**
   * Récupérer les commentaires d'un post
   */
  async findByPost(
    postId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ comments: CommentWithUser[]; total: number }> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException(`Post ${postId} non trouvé`);
    }

    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { postId },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      }),
      this.prisma.comment.count({ where: { postId } }),
    ]);

    return { comments, total };
  }

  /**
   * Récupérer un commentaire par ID
   */
  async findOne(id: string): Promise<CommentWithUser> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    if (!comment) {
      throw new NotFoundException(`Commentaire ${id} non trouvé`);
    }

    return comment;
  }

  /**
   * Modifier un commentaire (propriétaire uniquement)
   */
  async update(id: string, userId: string, updateCommentDto: UpdateCommentDto): Promise<CommentWithUser> {
    const comment = await this.prisma.comment.findUnique({ where: { id } });

    if (!comment) {
      throw new NotFoundException(`Commentaire ${id} non trouvé`);
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres commentaires');
    }

    return this.prisma.comment.update({
      where: { id },
      data: { comment: updateCommentDto.comment },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  /**
   * Supprimer un commentaire (propriétaire uniquement)
   */
  async remove(id: string, userId: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({ where: { id } });

    if (!comment) {
      throw new NotFoundException(`Commentaire ${id} non trouvé`);
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres commentaires');
    }

    await this.prisma.comment.delete({ where: { id } });
  }

  /**
   * Compter les commentaires d'un post
   */
  async countByPost(postId: string): Promise<number> {
    return this.prisma.comment.count({ where: { postId } });
  }
}
