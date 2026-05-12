import { useEffect, useState } from 'react';
import { ErrorTypes, registerPage } from 'librechat-data-provider';
import { OpenIDIcon, useToastContext } from '@librechat/client';
import { useOutletContext, useSearchParams, useLocation } from 'react-router-dom';
import type { TLoginLayoutContext } from '~/common';
import { getLoginError, persistRedirectToSession } from '~/utils';
import { ErrorMessage } from '~/components/Auth/ErrorMessage';
import SocialButton from '~/components/Auth/SocialButton';
import { useAuthContext } from '~/hooks/AuthContext';
import { useLocalize } from '~/hooks';
import LoginForm from './LoginForm';

interface LoginLocationState {
  redirect_to?: string;
}

function Login() {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const { error, setError, login } = useAuthContext();
  const { startupConfig } = useOutletContext<TLoginLayoutContext>();

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const disableAutoRedirect = searchParams.get('redirect') === 'false';

  const [isAutoRedirectDisabled, setIsAutoRedirectDisabled] = useState(disableAutoRedirect);

  useEffect(() => {
    const redirectTo = searchParams.get('redirect_to');
    if (redirectTo) {
      persistRedirectToSession(redirectTo);
    } else {
      const state = location.state as LoginLocationState | null;
      if (state?.redirect_to) {
        persistRedirectToSession(state.redirect_to);
      }
    }

    const oauthError = searchParams?.get('error');
    if (oauthError && oauthError === ErrorTypes.AUTH_FAILED) {
      showToast({
        message: localize('com_auth_error_oauth_failed'),
        status: 'error',
      });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('error');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, showToast, localize, location.state]);

  useEffect(() => {
    if (disableAutoRedirect) {
      setIsAutoRedirectDisabled(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('redirect');
      setSearchParams(newParams, { replace: true });
    }
  }, [disableAutoRedirect, searchParams, setSearchParams]);

  const shouldAutoRedirect =
    startupConfig?.openidLoginEnabled &&
    startupConfig?.openidAutoRedirect &&
    startupConfig?.serverDomain &&
    !isAutoRedirectDisabled;

  useEffect(() => {
    if (shouldAutoRedirect) {
      console.log('Auto-redirecting to OpenID provider...');
      window.location.href = `${startupConfig.serverDomain}/oauth/openid`;
    }
  }, [shouldAutoRedirect, startupConfig]);

  if (shouldAutoRedirect) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <p className="text-lg font-semibold">
          {localize('com_ui_redirecting_to_provider', { 0: startupConfig.openidLabel })}
        </p>
        <div className="mt-4">
          <SocialButton
            key="openid"
            enabled={startupConfig.openidLoginEnabled}
            serverDomain={startupConfig.serverDomain}
            oauthPath="openid"
            Icon={() =>
              startupConfig.openidImageUrl ? (
                <img src={startupConfig.openidImageUrl} alt="OpenID Logo" className="h-5 w-5" />
              ) : (
                <OpenIDIcon />
              )
            }
            label={startupConfig.openidLabel}
            id="openid"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-4 text-gray-900 dark:text-white">
      <div className="h-20 w-20 overflow-hidden rounded-2xl border border-gray-200 shadow-sm dark:border-gray-700">
        <img
          src="/assets/icon_06_half_crest.svg"
          alt="GOPA AI Chatbot visual"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="w-full text-center">
        <h1 className="text-3xl font-semibold">GOPA AI Chatbot</h1>
      </div>
      <section className="w-full rounded-md border border-border-light bg-white px-5 py-4 shadow-sm dark:bg-gray-900/70">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-amber-400 bg-amber-50/80 text-amber-500 shadow-[0_0_0_3px_rgba(251,191,36,0.12)] dark:border-amber-500 dark:bg-amber-500/10 dark:text-amber-300">
            <span aria-hidden="true" className="font-serif text-xl italic leading-none tracking-tight">
              i
            </span>
          </div>
          <p className="text-[15px] leading-9 text-gray-800 dark:text-gray-100">
            {'I confirm that I have completed the '}
            <a
              className="font-semibold text-amber-500 underline underline-offset-4 transition-colors hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
              href="https://gopagroup.sharepoint.com/sites/Academy/SitePages/GOPA-Group-AI-Chatbot.aspx"
              target="_blank"
              rel="noreferrer"
            >
              GOPA AI Training
            </a>
            {' and that I have read and agree with the '}
            <a
              className="font-semibold text-amber-500 underline underline-offset-4 transition-colors hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
              href="https://gopagroup.sharepoint.com/sites/GOPAGroup-LearningPlatform/SiteAssets/Forms/AllItems.aspx?id=%2Fsites%2FGOPAGroup%2DLearningPlatform%2FSiteAssets%2FSitePages%2FGOPA%2DGroup%2DAI%2DChatbot%2FGOPA%2DGroup%5FPolicy%2Don%2Dthe%2DUse%2Dof%2DGenerative%2DAI%2Epdf&parent=%2Fsites%2FGOPAGroup%2DLearningPlatform%2FSiteAssets%2FSitePages%2FGOPA%2DGroup%2DAI%2DChatbot"
              target="_blank"
              rel="noreferrer"
            >
              GOPA Group Policy on the Use of Generative AI
            </a>
            {'. I acknowledge the importance of adhering to these guidelines to maintain the integrity and effectiveness of our GOPA AI Chatbot.'}
          </p>
        </div>
      </section>
      {error != null && (
        <div className="w-full">
          <ErrorMessage>{localize(getLoginError(error))}</ErrorMessage>
        </div>
      )}
      {startupConfig?.emailLoginEnabled === true && (
        <div className="w-full">
          <LoginForm
            onSubmit={login}
            startupConfig={startupConfig}
            error={error}
            setError={setError}
          />
        </div>
      )}
      {startupConfig?.registrationEnabled === true && (
        <p className="my-4 text-center text-sm font-light text-gray-700 dark:text-white">
          {' '}
          {localize('com_auth_no_account')}{' '}
          <a
            href={registerPage()}
            className="inline-flex p-1 text-sm font-medium text-amber-600 underline decoration-transparent transition-all duration-200 hover:text-amber-700 hover:decoration-amber-700 focus:text-amber-700 focus:decoration-amber-700 dark:text-amber-400 dark:hover:text-amber-300 dark:hover:decoration-amber-300 dark:focus:text-amber-300 dark:focus:decoration-amber-300"
          >
            {localize('com_auth_sign_up')}
          </a>
        </p>
      )}
    </div>
  );
}

export default Login;
