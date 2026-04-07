export interface Keypoint {
  id: string;
  x: number;
  y: number;
  z: number;
}

export interface Frame {
  hand_right_keypoints: Keypoint[];
  hand_left_keypoints: Keypoint[];
  pose_keypoints: Keypoint[];
}

export interface SignTranslationMetadata {
  gloss: string;
  fps: number;
  total_frames: number;
}

export interface SignTranslationResponse {
  frames: Frame[];
  metadata: SignTranslationMetadata;
}

export interface SignTranslationData {
  id: string;
  postId: string;
  transcript: string;
  language: string;
  frames: Frame[];
  metadata: SignTranslationMetadata;
  status: string;
  errorMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
