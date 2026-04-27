import React, { useEffect, memo } from 'react';
import TagManager from 'react-gtm-module';
import ReactMarkdown from 'react-markdown';
import { useGetStartupConfig } from '~/data-provider';

function Footer({ className }: { className?: string }) {
  const { data: config } = useGetStartupConfig();

  const gopaTrainingUrl =
    'https://gopagroup.sharepoint.com/sites/Academy/SitePages/GOPA-Group-AI-Chatbot.aspx';
  const gopaPolicyUrl =
    'https://gopagroup.sharepoint.com/sites/GOPAGroup-LearningPlatform/SiteAssets/Forms/AllItems.aspx?id=%2Fsites%2FGOPAGroup%2DLearningPlatform%2FSiteAssets%2FSitePages%2FGOPA%2DGroup%2DAI%2DChatbot%2FGOPA%2DGroup%5FPolicy%2Don%2Dthe%2DUse%2Dof%2DGenerative%2DAI%2Epdf&parent=%2Fsites%2FGOPAGroup%2DLearningPlatform%2FSiteAssets%2FSitePages%2FGOPA%2DGroup%2DAI%2DChatbot';

  const mainContentParts = (
    typeof config?.customFooter === 'string'
      ? config.customFooter
      : `[GOPA AI Training](${gopaTrainingUrl}) | [GOPA Group Policy on the Use of Generative AI](${gopaPolicyUrl})`
  ).split('|');

  useEffect(() => {
    if (config?.analyticsGtmId != null && typeof window.google_tag_manager === 'undefined') {
      const tagManagerArgs = {
        gtmId: config.analyticsGtmId,
      };
      TagManager.initialize(tagManagerArgs);
    }
  }, [config?.analyticsGtmId]);

  const mainContentRender = mainContentParts.map((text, index) => (
    <React.Fragment key={`main-content-part-${index}`}>
      <ReactMarkdown
        components={{
          a: ({ node: _n, href, children, ...otherProps }) => {
            return (
              <a
                className="text-text-secondary underline"
                href={href}
                rel="noreferrer"
                {...otherProps}
              >
                {children}
              </a>
            );
          },

          p: ({ node: _n, ...props }) => <span {...props} />,
        }}
      >
        {text.trim()}
      </ReactMarkdown>
    </React.Fragment>
  ));

  const footerElements = mainContentRender;

  return (
    <div className="relative w-full">
      <div
        className={
          className ??
          'absolute bottom-0 left-0 right-0 hidden items-center justify-center gap-2 px-2 py-2 text-center text-xs text-text-primary sm:flex md:px-[60px]'
        }
        role="contentinfo"
      >
        {footerElements.map((contentRender, index) => {
          const isLastElement = index === footerElements.length - 1;
          return (
            <React.Fragment key={`footer-element-${index}`}>
              {contentRender}
              {!isLastElement && (
                <div
                  key={`separator-${index}`}
                  className="h-2 border-r-[1px] border-border-medium"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

const MemoizedFooter = memo(Footer);
MemoizedFooter.displayName = 'Footer';

export default MemoizedFooter;
