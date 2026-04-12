import os from 'os';
import path from 'path';
import { existsSync } from 'fs';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { MongoMemoryServer } from 'mongodb-memory-server';
import deeplJobSchema from '~/schema/deeplJob';
import { createDeepLJobMethods } from './deeplJob';
import type { IDeepLJobAnalytics } from '~/types';

jest.setTimeout(300000);

let mongoServer: MongoMemoryServer | null = null;
let methods: ReturnType<typeof createDeepLJobMethods>;

const getMongoMemoryServerOptions = () => {
  const preferredBinaryPath = path.join(
    os.homedir(),
    '.cache',
    'mongodb-binaries',
    'mongod-x64-win32-7.0.14.exe',
  );
  if (!existsSync(preferredBinaryPath)) {
    return undefined;
  }
  return { binary: { systemBinary: preferredBinaryPath } };
};

describe('DeepL Job Methods', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create(getMongoMemoryServerOptions());
    await mongoose.connect(mongoServer.getUri());
    if (!mongoose.models.DeepLJobAnalytics) {
      mongoose.model<IDeepLJobAnalytics>('DeepLJobAnalytics', deeplJobSchema);
    }
    methods = createDeepLJobMethods(mongoose);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer != null) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
  });

  it('should create a DeepL job with schema defaults', async () => {
    const created = await methods.createDeepLJob({
      documentId: uuidv4(),
      userId: new mongoose.Types.ObjectId().toString(),
      userEmail: 'user@example.com',
      fileName: 'document.docx',
      sourceLanguage: 'EN',
      targetLanguage: 'FR',
    });

    expect(created).not.toBeNull();
    expect(created?.status).toBe('uploaded');
    expect(created?.statusChecks).toBe(0);
    expect(created?.downloadAttempts).toBe(0);
  });

  it('should update the latest job by document id and increment counters', async () => {
    const documentId = uuidv4();
    await methods.createDeepLJob({ documentId, status: 'uploaded', fileName: 'draft.docx' });

    const updated = await methods.updateDeepLJobByDocumentId(documentId, {
      status: 'translating',
      latestStatusProviderDetails: { translatedCharacters: 42 },
      $inc: { statusChecks: 1 },
    });

    expect(updated).not.toBeNull();
    expect(updated?.status).toBe('translating');
    expect(updated?.statusChecks).toBe(1);
    expect(updated?.latestStatusProviderDetails).toEqual({ translatedCharacters: 42 });
  });

  it('should search DeepL jobs with filters and pagination', async () => {
    const matchingUserId = new mongoose.Types.ObjectId().toString();

    await methods.createDeepLJob({
      documentId: uuidv4(),
      userId: matchingUserId,
      userEmail: 'match@example.com',
      fileName: 'important-report.docx',
      status: 'done',
      sourceLanguage: 'EN',
      targetLanguage: 'FR',
    });

    await methods.createDeepLJob({
      documentId: uuidv4(),
      userId: new mongoose.Types.ObjectId().toString(),
      userEmail: 'other@example.com',
      fileName: 'other.docx',
      status: 'done',
    });

    const result = await methods.searchDeepLJobs({ userId: matchingUserId });

    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].userId).toBe(matchingUserId);
    expect(result.pagination.totalJobs).toBe(1);
  });

  it('should return null silently when updateDeepLJobByDocumentId receives no documentId', async () => {
    const result = await methods.updateDeepLJobByDocumentId('', { status: 'done' });
    expect(result).toBeNull();
  });
});
