import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FaceVerificationService, FaceVerificationResult } from './face-verification.service';
import { VerifyFaceDto } from './dto/verify-face.dto';

@ApiTags('Face Verification')
@Controller('face-verification')
@UseGuards(KeycloakAuthGuard)
@ApiBearerAuth()
export class FaceVerificationController {
  constructor(private readonly faceVerificationService: FaceVerificationService) {}

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Vérifie si le visage correspond à l'utilisateur connecté" })
  @ApiResponse({
    status: 200,
    description: 'Résultat de la vérification faciale',
    schema: {
      properties: {
        verified: { type: 'boolean' },
        confidence: { type: 'number' },
        message: { type: 'string' },
        needsProfilePhoto: { type: 'boolean' },
      },
    },
  })
  async verifyFace(
    @CurrentUser('userId') userId: string,
    @Body() verifyFaceDto: VerifyFaceDto,
  ): Promise<FaceVerificationResult> {
    return this.faceVerificationService.verifyFace(
      userId,
      verifyFaceDto.descriptor,
      verifyFaceDto.imageBase64,
    );
  }

  @Get('status')
  @ApiOperation({ summary: "Vérifie si l'utilisateur a une référence faciale et une photo de profil" })
  @ApiResponse({
    status: 200,
    description: 'Statut de la référence faciale',
  })
  async getFaceStatus(@CurrentUser('userId') userId: string) {
    const hasFaceReference = await this.faceVerificationService.hasFaceReference(userId);
    const faceReference = hasFaceReference
      ? await this.faceVerificationService.getFaceReference(userId)
      : null;
    const profilePhotoUrl = await this.faceVerificationService.getProfilePhotoUrl(userId);

    return {
      hasFaceReference,
      hasProfilePhoto: !!profilePhotoUrl,
      profilePhotoUrl,
      faceReference,
    };
  }

  @Post('register-from-profile')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Enregistre la référence faciale à partir de la photo de profil" })
  @ApiResponse({
    status: 201,
    description: 'Référence faciale enregistrée depuis la photo de profil',
  })
  async registerFromProfile(
    @CurrentUser('userId') userId: string,
    @Body() verifyFaceDto: VerifyFaceDto,
  ) {
    await this.faceVerificationService.registerFaceFromProfilePhoto(
      userId,
      verifyFaceDto.descriptor,
    );

    return {
      success: true,
      message: 'Référence faciale enregistrée depuis votre photo de profil',
    };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Enregistre ou met à jour la référence faciale de l'utilisateur" })
  @ApiResponse({
    status: 201,
    description: 'Référence faciale enregistrée avec succès',
  })
  async registerFace(
    @CurrentUser('userId') userId: string,
    @Body() verifyFaceDto: VerifyFaceDto,
  ) {
    await this.faceVerificationService.registerFaceReference(
      userId,
      verifyFaceDto.descriptor,
      verifyFaceDto.imageBase64,
    );

    return {
      success: true,
      message: 'Référence faciale enregistrée avec succès',
    };
  }

  @Delete('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprime la référence faciale pour permettre une réinitialisation' })
  @ApiResponse({
    status: 200,
    description: 'Référence faciale supprimée',
  })
  async resetFaceReference(@CurrentUser('userId') userId: string) {
    await this.faceVerificationService.deleteFaceReference(userId);

    return {
      success: true,
      message: 'Référence faciale supprimée. Veuillez enregistrer une nouvelle référence depuis votre photo de profil.',
    };
  }
}
