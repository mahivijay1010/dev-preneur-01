// Customizes the root HTML document for the WEB build only (Expo Router
// convention — has no effect on iOS/Android). Used here to fix Chrome/Safari's
// autofill styling: browsers force a light background + dark text on
// autofilled inputs via internal UA styles that inline React Native styles
// cannot override, so it has to be done with a real stylesheet rule.
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { colors, webAutofillFixCSS } from '@/theme';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content={colors.bg} />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: webAutofillFixCSS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
