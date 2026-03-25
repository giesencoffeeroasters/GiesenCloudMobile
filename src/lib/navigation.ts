type BackCapableRouter = {
  back: () => void;
  canGoBack: () => boolean;
  replace: (href: string) => void;
};

export function goBackOrReplace(
  router: BackCapableRouter,
  fallbackHref: string,
): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallbackHref);
}
