import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';

import { db } from '@/config/firestore';
import { storage } from '@/config/storage';
import { Evidence, EvidenceType } from '@/types/evidence';

type RawEvidence = {
  type: EvidenceType;
  authorUid: string;
  authorEmail: string;
  authorVerified: boolean;
  caption: string;
  url?: string;
  storagePath?: string;
  createdAt: Timestamp | null;
};

const safeArticleId = (articleId: string) => encodeURIComponent(articleId);

const evidenceCollection = (articleId: string) =>
  collection(db, 'articles', safeArticleId(articleId), 'evidence');

const evidenceDoc = (articleId: string, evidenceId: string) =>
  doc(db, 'articles', safeArticleId(articleId), 'evidence', evidenceId);

const toEvidence = (id: string, raw: RawEvidence): Evidence => ({
  authorEmail: raw.authorEmail,
  authorUid: raw.authorUid,
  authorVerified: raw.authorVerified ?? false,
  caption: raw.caption ?? '',
  createdAt: raw.createdAt
    ? raw.createdAt.toDate().toISOString()
    : new Date().toISOString(),
  id,
  storagePath: raw.storagePath,
  type: raw.type,
  url: raw.url,
});

const inferExtension = (uri: string): string => {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return (match?.[1] ?? 'jpg').toLowerCase();
};

const inferContentType = (extension: string): string => {
  const map: Record<string, string> = {
    bmp: 'image/bmp',
    gif: 'image/gif',
    heic: 'image/heic',
    heif: 'image/heif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    svg: 'image/svg+xml',
    webp: 'image/webp',
  };
  return map[extension] ?? 'application/octet-stream';
};

const fetchAsBlob = async (uri: string): Promise<Blob> => {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('Could not read selected image.');
  }
  return response.blob();
};

export const evidenceApi = {
  subscribe(
    articleId: string,
    callback: (items: Evidence[]) => void,
    onError?: (error: Error) => void,
  ) {
    const q = query(evidenceCollection(articleId), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        callback(
          snapshot.docs.map((snap) =>
            toEvidence(snap.id, snap.data() as RawEvidence),
          ),
        );
      },
      (error) => onError?.(error),
    );
  },

  async postLink(
    articleId: string,
    payload: {
      authorUid: string;
      authorEmail: string;
      authorVerified: boolean;
      url: string;
      caption: string;
    },
  ): Promise<string> {
    const ref = await addDoc(evidenceCollection(articleId), {
      authorEmail: payload.authorEmail,
      authorUid: payload.authorUid,
      authorVerified: payload.authorVerified,
      caption: payload.caption,
      createdAt: serverTimestamp(),
      type: 'link' as EvidenceType,
      url: payload.url,
    });
    return ref.id;
  },

  async postNote(
    articleId: string,
    payload: {
      authorUid: string;
      authorEmail: string;
      authorVerified: boolean;
      caption: string;
    },
  ): Promise<string> {
    const ref = await addDoc(evidenceCollection(articleId), {
      authorEmail: payload.authorEmail,
      authorUid: payload.authorUid,
      authorVerified: payload.authorVerified,
      caption: payload.caption,
      createdAt: serverTimestamp(),
      type: 'note' as EvidenceType,
    });
    return ref.id;
  },

  async uploadImage(
    articleId: string,
    payload: {
      authorUid: string;
      authorEmail: string;
      authorVerified: boolean;
      caption: string;
      localUri: string;
    },
  ): Promise<string> {
    const extension = inferExtension(payload.localUri);
    const contentType = inferContentType(extension);
    const storagePath = `evidence/${safeArticleId(articleId)}/${
      payload.authorUid
    }/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${extension}`;

    const storageRef = ref(storage, storagePath);
    const blob = await fetchAsBlob(payload.localUri);
    await uploadBytes(storageRef, blob, { contentType });
    const downloadUrl = await getDownloadURL(storageRef);

    const docRef = await addDoc(evidenceCollection(articleId), {
      authorEmail: payload.authorEmail,
      authorUid: payload.authorUid,
      authorVerified: payload.authorVerified,
      caption: payload.caption,
      createdAt: serverTimestamp(),
      storagePath,
      type: 'image' as EvidenceType,
      url: downloadUrl,
    });

    return docRef.id;
  },

  async remove(
    articleId: string,
    evidenceId: string,
    storagePath: string | undefined,
  ): Promise<void> {
    await deleteDoc(evidenceDoc(articleId, evidenceId));
    if (storagePath) {
      try {
        await deleteObject(ref(storage, storagePath));
      } catch {
        // Image already gone; nothing to do.
      }
    }
  },
};
