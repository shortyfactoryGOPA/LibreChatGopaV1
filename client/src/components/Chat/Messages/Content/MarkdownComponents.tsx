import React, { memo, useMemo, useRef, useEffect } from 'react';
import { useRecoilValue } from 'recoil';
import { useToastContext } from '@librechat/client';
import { FileSources, PermissionTypes, Permissions, apiBaseUrl } from 'librechat-data-provider';
import type { TFile } from 'librechat-data-provider';
import Mermaid, { MermaidErrorBoundary } from '~/components/Messages/Content/Mermaid';
import CodeBlock from '~/components/Messages/Content/CodeBlock';
import useHasAccess from '~/hooks/Roles/useHasAccess';
import { useFileDownload } from '~/data-provider';
import { useCodeBlockContext, useMessageContext } from '~/Providers';
import { handleDoubleClick } from '~/utils';
import { useLocalize } from '~/hooks';
import store from '~/store';

type TCodeProps = {
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
};

export const code: React.ElementType = memo(function MarkdownCode({
  className,
  children,
}: TCodeProps) {
  const canRunCode = useHasAccess({
    permissionType: PermissionTypes.RUN_CODE,
    permission: Permissions.USE,
  });
  const match = /language-(\w+)/.exec(className ?? '');
  const lang = match && match[1];
  const isMath = lang === 'math';
  const isMermaid = lang === 'mermaid';
  const isSingleLine = typeof children === 'string' && children.split('\n').length === 1;

  const { getNextIndex, resetCounter } = useCodeBlockContext();
  const blockIndex = useRef(getNextIndex(isMath || isMermaid || isSingleLine)).current;

  useEffect(() => {
    resetCounter();
  }, [children, resetCounter]);

  if (isMath) {
    return <>{children}</>;
  } else if (isMermaid) {
    const content = typeof children === 'string' ? children : String(children);
    return (
      <MermaidErrorBoundary code={content}>
        <Mermaid id={`mermaid-${blockIndex}`}>{content}</Mermaid>
      </MermaidErrorBoundary>
    );
  } else if (isSingleLine) {
    return (
      <code onDoubleClick={handleDoubleClick} className={className}>
        {children}
      </code>
    );
  } else {
    return (
      <CodeBlock
        lang={lang ?? 'text'}
        codeChildren={children}
        blockIndex={blockIndex}
        allowExecution={canRunCode}
      />
    );
  }
});
code.displayName = 'MarkdownCode';

export const codeNoExecution: React.ElementType = memo(function MarkdownCodeNoExecution({
  className,
  children,
}: TCodeProps) {
  const match = /language-(\w+)/.exec(className ?? '');
  const lang = match && match[1];

  if (lang === 'math') {
    return children;
  } else if (lang === 'mermaid') {
    const content = typeof children === 'string' ? children : String(children);
    return <Mermaid>{content}</Mermaid>;
  } else if (typeof children === 'string' && children.split('\n').length === 1) {
    return (
      <code onDoubleClick={handleDoubleClick} className={className}>
        {children}
      </code>
    );
  } else {
    return <CodeBlock lang={lang ?? 'text'} codeChildren={children} allowExecution={false} />;
  }
});
codeNoExecution.displayName = 'MarkdownCodeNoExecution';

type TAnchorProps = {
  href: string;
  children: React.ReactNode;
};

export const a: React.ElementType = memo(function MarkdownAnchor({ href, children }: TAnchorProps) {
  const user = useRecoilValue(store.user);
  const { showToast } = useToastContext();
  const localize = useLocalize();
  const { messageId } = useMessageContext();
  const messageAttachmentsMap = useRecoilValue(store.messageAttachmentsMap);
  const messageAttachments = messageAttachmentsMap[messageId] ?? [];

  const {
    file_id = '',
    filename = '',
    filepath,
    isDownloadUrl = false,
  } = useMemo(() => {
    // Normalize: strip absolute localhost origin to get just the path
    let normalizedHref = href ?? '';
    try {
      const url = new URL(href);
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        normalizedHref = url.pathname + url.search + url.hash;
      }
    } catch {
      // href is relative or non-parseable — use as-is
    }

    // Pattern 1: /api/files/download/{userId}/{file_id} (azure_responses and similar)
    const downloadPattern = new RegExp(`files/download/${user?.id}/([^/\\s]+)`);
    const downloadMatch = normalizedHref.match(downloadPattern);
    if (downloadMatch) {
      return { file_id: downloadMatch[1], filename: '', filepath: normalizedHref, isDownloadUrl: true };
    }

    // Pattern 2: files/{userId}/{file_id}/{filename} or outputs/{userId}/{file_id}/{filename}
    const uploadPattern = new RegExp(`(?:files|outputs)/${user?.id}/([^\\s]+)`);
    const uploadMatch = normalizedHref.match(uploadPattern);
    if (uploadMatch?.[0]) {
      const path = uploadMatch[0];
      const parts = path.split('/');
      const name = parts.pop();
      const file_id = parts.pop();
      return { file_id, filename: name, filepath: path, isDownloadUrl: false };
    }

    // Pattern 3: empty href or sandbox: URL (Azure code_interpreter file reference)
    // Resolve via the message's azure_responses attachment
    if (!normalizedHref || normalizedHref.startsWith('sandbox:')) {
      const azureFile = messageAttachments.find(
        (a): a is TFile =>
          'source' in a &&
          (a as TFile).source === FileSources.azure_responses &&
          !!(a as TFile).file_id &&
          !!(a as TFile).filepath,
      );
      if (azureFile) {
        return {
          file_id: azureFile.file_id,
          filename: azureFile.filename ?? '',
          filepath: azureFile.filepath,
          isDownloadUrl: true,
        };
      }
    }

    return { file_id: '', filename: '', filepath: '', isDownloadUrl: false };
  }, [user?.id, href, messageAttachments]);

  const { refetch: downloadFile } = useFileDownload(user?.id ?? '', file_id);
  const props: { target?: string; onClick?: React.MouseEventHandler } = { target: '_blank' };

  if (!file_id) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }

  const handleDownload = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    try {
      const stream = await downloadFile();
      if (stream.data == null || stream.data === '') {
        console.error('Error downloading file: No data found');
        showToast({
          status: 'error',
          message: localize('com_ui_download_error'),
        });
        return;
      }
      const link = document.createElement('a');
      link.href = stream.data;
      link.setAttribute('download', filename || 'download');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(stream.data);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  props.onClick = handleDownload;
  delete props.target;

  // Keep download URLs as relative paths — works on both port 3080 and 3090 via proxy
  const domainServerBaseUrl = `${apiBaseUrl()}/api`;
  const resolvedHref = isDownloadUrl
    ? (filepath ?? '')
    : filepath?.startsWith('files/')
      ? `${domainServerBaseUrl}/${filepath}`
      : `${domainServerBaseUrl}/files/${filepath}`;

  return (
    <a href={resolvedHref} {...props}>
      {children}
    </a>
  );
});
a.displayName = 'MarkdownAnchor';

type TParagraphProps = {
  children: React.ReactNode;
};

export const p: React.ElementType = memo(function MarkdownParagraph({ children }: TParagraphProps) {
  return <p className="mb-2 whitespace-pre-wrap">{children}</p>;
});
p.displayName = 'MarkdownParagraph';

type TImageProps = {
  src?: string;
  alt?: string;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
};

export const img: React.ElementType = memo(function MarkdownImage({
  src,
  alt,
  title,
  className,
  style,
}: TImageProps) {
  // Get the base URL from the API endpoints
  const baseURL = apiBaseUrl();

  // If src starts with /images/, prepend the base URL
  const fixedSrc = useMemo(() => {
    if (!src) return src;

    // If it's already an absolute URL or doesn't start with /images/, return as is
    if (src.startsWith('http') || src.startsWith('data:') || !src.startsWith('/images/')) {
      return src;
    }

    // Prepend base URL to the image path
    return `${baseURL}${src}`;
  }, [src, baseURL]);

  return <img src={fixedSrc} alt={alt} title={title} className={className} style={style} />;
});
img.displayName = 'MarkdownImage';
