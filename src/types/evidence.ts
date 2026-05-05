export type EvidenceType = 'link' | 'image' | 'note';

export type Evidence = {
  id: string;
  type: EvidenceType;
  authorUid: string;
  authorEmail: string;
  authorVerified: boolean;
  caption: string;
  url?: string;
  storagePath?: string;
  createdAt: string;
  pending?: boolean;
  localUri?: string;
};

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
