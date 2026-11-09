import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { clientLocale, dirOf, pageMeta, type Locale } from "@/lib/i18n";
import { getServerLocale } from "@/lib/locale.functions";

function NotFoundComponent() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          {t({ ar: "الصفحة غير موجودة", fr: "Page introuvable", en: "Page not found" })}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t({
            ar: "الصفحة اللي تلوّج عليها ما عادش موجودة ولا تبدّل عنوانها.",
            fr: "La page que vous cherchez n'existe pas ou a été déplacée.",
            en: "The page you're looking for doesn't exist or has been moved.",
          })}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t({ ar: "الرجوع للرئيسية", fr: "Retour à l'accueil", en: "Go home" })}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  const { t } = useI18n();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t({ ar: "الصفحة ما تحلّتش", fr: "Cette page n'a pas pu s'afficher", en: "This page didn't load" })}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t({
            ar: "صار مشكل من عندنا. جرّب تعاود ولا ارجع للرئيسية.",
            fr: "Un problème est survenu de notre côté. Réessayez ou revenez à l'accueil.",
            en: "Something went wrong on our end. You can try again or head back home.",
          })}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t({ ar: "عاود جرّب", fr: "Réessayer", en: "Try again" })}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t({ ar: "الرئيسية", fr: "Accueil", en: "Go home" })}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async (): Promise<{ locale: Locale }> => {
    // Server render reads the saved-language cookie from the request; the browser reads it directly.
    const locale = typeof document === "undefined" ? await getServerLocale() : clientLocale();
    return { locale };
  },
  head: ({ match }) => ({
    // Never add og:image or twitter:image here: every page without its own would inherit it.
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "author", content: "Khardeji" },
      ...pageMeta(match.context.locale, {
        title: {
          ar: "خردجي — سوق الخردة في تونس",
          fr: "Khardeji — Marketplace de la ferraille en Tunisie",
          en: "Khardeji — Tunisia's scrap marketplace",
        },
        description: {
          ar: "اشري، بيع وزايد على الخردة، قطع غيار السيارات ومواد الرسكلة في كامل تونس.",
          fr: "Achetez, vendez et enchérissez sur la ferraille, les pièces automobiles et les matériaux de récupération partout en Tunisie.",
          en: "Buy, sell and bid on scrap metal, car parts and salvage materials across Tunisia.",
        },
      }),
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600&family=Fraunces:opsz,wght@9..144,400..700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&family=Reem+Kufi:wght@400..700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const locale = Route.useRouteContext({ select: (c) => c.locale });
  return (
    <html lang={locale} dir={dirOf(locale)}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { dir } = useI18n();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
          </main>
          <Footer />
        </div>
        <Toaster position="top-center" dir={dir} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
