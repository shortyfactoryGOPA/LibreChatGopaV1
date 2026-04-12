const mockedDownloadDocument = jest.fn();
const mockedGetDocumentStatus = jest.fn();
const mockedGetSourceLanguages = jest.fn();
const mockedGetTargetLanguages = jest.fn();
const mockedUploadDocument = jest.fn();

jest.mock('deepl-node', () => ({
  Translator: jest.fn().mockImplementation(() => ({
    downloadDocument: mockedDownloadDocument,
    getDocumentStatus: mockedGetDocumentStatus,
    getSourceLanguages: mockedGetSourceLanguages,
    getTargetLanguages: mockedGetTargetLanguages,
    uploadDocument: mockedUploadDocument,
  })),
}));

import {
  createDeepLTranslatedFileName,
  downloadDeepLDocument,
  getDeepLDocumentStatus,
  getDeepLLanguages,
  isDeepLUploadMimeType,
  normalizeDeepLUploadMimeType,
  uploadDeepLDocument,
} from './deepl';

describe('deepl', () => {
  beforeEach(() => {
    process.env.DEEPL_API_KEY = 'test-deepl-key';
    delete process.env.DEEPL_API_SERVER_URL;
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.DEEPL_API_KEY;
    delete process.env.DEEPL_API_SERVER_URL;
  });

  it('normalizes custom XLIFF MIME types and validates DeepL support', () => {
    expect(normalizeDeepLUploadMimeType({ fileName: 'file.xlf', mimeType: null })).toBe(
      'application/xliff+xml',
    );
    expect(isDeepLUploadMimeType('application/xliff+xml')).toBe(true);
    expect(isDeepLUploadMimeType('image/png')).toBe(false);
  });

  it('builds a translated file name using a sanitized source file name', () => {
    expect(
      createDeepLTranslatedFileName({ fileName: 'report.docx', targetLanguage: 'fr' }),
    ).toBe('report_fr.docx');
    expect(createDeepLTranslatedFileName({ fileName: null, targetLanguage: null })).toBe(
      'translated_translated',
    );
  });

  it('retrieves and normalizes available DeepL languages', async () => {
    mockedGetSourceLanguages.mockResolvedValue([{ code: 'EN', name: 'English' }]);
    mockedGetTargetLanguages.mockResolvedValue([
      { code: 'FR', name: 'French', supportsFormality: true },
    ]);

    const result = await getDeepLLanguages();

    expect(result.sourceLanguages).toEqual([{ code: 'EN', name: 'English' }]);
    expect(result.targetLanguages).toEqual([
      { code: 'FR', name: 'French', supportsFormality: true },
    ]);
  });

  it('uploads a document and returns a normalized DeepL handle', async () => {
    mockedUploadDocument.mockResolvedValue({ documentId: 'doc-id', documentKey: 'doc-key' });

    const result = await uploadDeepLDocument({
      fileBuffer: Buffer.from('hello'),
      fileName: 'report.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      sourceLanguage: 'EN',
      targetLanguage: 'FR',
    });

    expect(result.documentId).toBe('doc-id');
    expect(result.documentKey).toBe('doc-key');
    expect(result.status).toBe('uploaded');
    expect(result.targetLanguage).toBe('FR');
  });

  it('retrieves and normalizes DeepL document status', async () => {
    mockedGetDocumentStatus.mockResolvedValue({
      status: 'translating',
      billedCharacters: null,
      secondsRemaining: 10,
      errorMessage: null,
      done: () => false,
      ok: () => true,
    });

    const result = await getDeepLDocumentStatus({ documentId: 'doc-id', documentKey: 'doc-key' });

    expect(result.status).toBe('translating');
    expect(result.isReady).toBe(false);
    expect(result.ok).toBe(true);
  });

  it('throws a configuration error when the DeepL key is missing', async () => {
    delete process.env.DEEPL_API_KEY;
    await expect(getDeepLLanguages()).rejects.toMatchObject({ statusCode: 500 });
  });
});
