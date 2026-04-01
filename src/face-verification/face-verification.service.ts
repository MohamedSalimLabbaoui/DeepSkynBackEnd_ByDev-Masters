import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../analysis/services/supabase.service';
import * as crypto from 'crypto';

export interface FaceVerificationResult {
  verified: boolean;
  confidence: number;
  message: string;
  needsProfilePhoto: boolean;
}

export interface FaceDescriptor {
  descriptor: number[];
}

@Injectable()
export class FaceVerificationService {
  // Seuil de similarité pour considérer que c'est le même visage (0-1)
  // Distance euclidienne < 0.6 = même visage pour face-api.js
  private readonly SIMILARITY_THRESHOLD = 0.5;

  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
  ) {}

  /**
   * Vérifie si le visage correspond à la photo de profil de l'utilisateur
   * La référence faciale doit être créée à partir de la photo de profil
   */
  async verifyFace(
    userId: string,
    faceDescriptor: number[],
    imageBase64?: string,
  ): Promise<FaceVerificationResult> {
    // Récupérer les infos de l'utilisateur avec sa photo de profil
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, avatar: true },
    });

    const userName = user?.name || user?.email?.split('@')[0] || 'utilisateur';

    // Vérifier si l'utilisateur a une photo de profil
    if (!user?.avatar) {
      return {
        verified: false,
        confidence: 0,
        message: `${userName}, vous devez d'abord définir une photo de profil pour activer la vérification faciale.`,
        needsProfilePhoto: true,
      };
    }

    // Récupérer la référence faciale de l'utilisateur
    const faceReference = await this.prisma.faceReference.findUnique({
      where: { userId },
    });

    // Si pas de référence faciale, l'utilisateur doit d'abord enregistrer son visage
    // via sa photo de profil
    if (!faceReference) {
      return {
        verified: false,
        confidence: 0,
        message: `${userName}, veuillez d'abord enregistrer votre référence faciale depuis votre photo de profil dans les paramètres.`,
        needsProfilePhoto: true,
      };
    }

    // Comparer le visage avec la référence
    const storedDescriptor = faceReference.descriptor as number[];
    const similarity = this.calculateSimilarity(faceDescriptor, storedDescriptor);

    if (similarity >= this.SIMILARITY_THRESHOLD) {
      return {
        verified: true,
        confidence: similarity,
        message: `Identité vérifiée. Bonjour ${userName} !`,
        needsProfilePhoto: false,
      };
    }

    return {
      verified: false,
      confidence: similarity,
      message: `Vous n'êtes pas ${userName}. Cette analyse est réservée au propriétaire du compte.`,
      needsProfilePhoto: false,
    };
  }

  /**
   * Enregistre le descripteur facial à partir de la photo de profil
   * Cette méthode doit être appelée quand l'utilisateur met à jour sa photo de profil
   */
  async registerFaceFromProfilePhoto(
    userId: string,
    descriptor: number[],
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    if (!user?.avatar) {
      throw new BadRequestException('Vous devez d\'abord définir une photo de profil');
    }

    await this.prisma.faceReference.upsert({
      where: { userId },
      update: {
        descriptor: descriptor,
        imageUrl: user.avatar,
        updatedAt: new Date(),
      },
      create: {
        userId,
        descriptor: descriptor,
        imageUrl: user.avatar,
      },
    });
  }

  /**
   * Enregistre un visage comme référence pour l'utilisateur
   */
  async registerFaceReference(
    userId: string,
    descriptor: number[],
    imageBase64?: string,
  ): Promise<void> {
    let imageUrl: string | null = null;

    // Si une image est fournie, la stocker sur Supabase
    if (imageBase64) {
      const buffer = Buffer.from(imageBase64, 'base64');
      const filename = `face-reference-${userId}-${crypto.randomUUID()}.jpg`;
      
      const file = {
        originalname: filename,
        buffer,
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const uploadResult = await this.supabaseService.uploadImage(file, userId);
      imageUrl = uploadResult.url;
    }

    await this.prisma.faceReference.upsert({
      where: { userId },
      update: {
        descriptor: descriptor,
        imageUrl: imageUrl || '',
        updatedAt: new Date(),
      },
      create: {
        userId,
        descriptor: descriptor,
        imageUrl: imageUrl || '',
      },
    });
  }

  /**
   * Calcule la similarité entre deux descripteurs de visage
   * Retourne une valeur entre 0 (différent) et 1 (identique)
   */
  private calculateSimilarity(desc1: number[], desc2: number[]): number {
    if (desc1.length !== desc2.length) {
      throw new BadRequestException('Les descripteurs de visage ont des dimensions différentes');
    }

    // Distance euclidienne
    let sumSquares = 0;
    for (let i = 0; i < desc1.length; i++) {
      const diff = desc1[i] - desc2[i];
      sumSquares += diff * diff;
    }
    const euclideanDistance = Math.sqrt(sumSquares);

    // Pour face-api.js, une distance < 0.6 = même visage
    // On convertit en score de similarité (0-1)
    const maxExpectedDistance = 1.2;
    const similarity = Math.max(0, 1 - (euclideanDistance / maxExpectedDistance));

    return similarity;
  }

  /**
   * Vérifie si l'utilisateur a une référence faciale enregistrée
   */
  async hasFaceReference(userId: string): Promise<boolean> {
    const reference = await this.prisma.faceReference.findUnique({
      where: { userId },
    });
    return !!reference;
  }

  /**
   * Supprime la référence faciale d'un utilisateur (pour réinitialisation)
   */
  async deleteFaceReference(userId: string): Promise<void> {
    await this.prisma.faceReference.delete({
      where: { userId },
    }).catch(() => {
      // Ignorer si la référence n'existe pas
    });
  }

  /**
   * Récupère la référence faciale d'un utilisateur
   */
  async getFaceReference(userId: string) {
    return this.prisma.faceReference.findUnique({
      where: { userId },
      select: {
        id: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Récupère l'URL de la photo de profil de l'utilisateur
   */
  async getProfilePhotoUrl(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });
    return user?.avatar || null;
  }
}
