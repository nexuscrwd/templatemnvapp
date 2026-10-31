/**
 * Gerenciador de Ativos PWA Dinâmicos (White-label & Multi-estabelecimento)
 * Injeta dinamicamente o Web App Manifest e Favicons com base no logo/ícone do salão
 */

export interface PwaCustomAssets {
  name: string;
  shortName: string;
  iconUrl?: string;
  themeColor?: string;
  backgroundColor?: string;
  slogan?: string;
}

let activeBlobManifestUrl: string | null = null;

export function updateDynamicPwaAssets(
  name?: string,
  iconUrl?: string,
  themeColor?: string,
  slogan?: string,
  isDarkTheme?: boolean
) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  try {
    const finalName = name || 'Meu Estabelecimento';
    const finalShortName = finalName.length > 14 ? finalName.slice(0, 14).trim() : finalName;
    const finalIcon = iconUrl || '';
    const finalSlogan = (slogan || '').trim();

    const effectiveIsDark = isDarkTheme !== undefined
      ? isDarkTheme
      : (typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false);

    const resolvedBgColor = effectiveIsDark ? '#151A1E' : '#FFFFFF';
    const effectiveThemeColor = themeColor || (effectiveIsDark ? '#151A1E' : '#20C933');

    // 1. Atualizar Título da Página (Apenas Nome e Slogan)
    document.title = finalSlogan ? `${finalName} — ${finalSlogan}` : finalName;
    
    const appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitleMeta) {
      appleTitleMeta.setAttribute('content', finalShortName);
    }

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', effectiveThemeColor);
    }

    const appleStatusMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleStatusMeta) {
      appleStatusMeta.setAttribute('content', effectiveIsDark ? 'black-translucent' : 'default');
    }

    // Atualizar Meta Description e OpenGraph (apenas Nome do App e Slogan)
    const shareDesc = finalSlogan || finalName;
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      descMeta.setAttribute('content', shareDesc);
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', finalName);
    }

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      ogDesc.setAttribute('content', shareDesc);
    }

    // 2. Atualizar Favicons e Apple Touch Icons Dinamicamente
    if (finalIcon) {
      const appleTouchIcons = document.querySelectorAll('link[rel="apple-touch-icon"]');
      appleTouchIcons.forEach((el) => el.setAttribute('href', finalIcon));

      const standardIcons = document.querySelectorAll('link[rel="icon"]');
      standardIcons.forEach((el) => el.setAttribute('href', finalIcon));
    }

    // 3. Gerar e Injetar Web App Manifest Dinâmico (Blob URL)
    const isSvg = finalIcon.includes('image/svg+xml') || finalIcon.endsWith('.svg');
    const dynamicManifest = {
      id: '/',
      name: finalSlogan ? `${finalName} — ${finalSlogan}` : finalName,
      short_name: finalShortName,
      description: shareDesc,
      start_url: '/?source=pwa',
      scope: '/',
      display: 'standalone',
      display_override: ['standalone', 'minimal-ui', 'window-controls-overlay'],
      orientation: 'portrait-primary',
      background_color: resolvedBgColor,
      theme_color: effectiveThemeColor,
      prefer_related_applications: false,
      categories: ['lifestyle', 'beauty', 'shopping', 'utilities'],
      icons: [
        {
          src: finalIcon,
          sizes: 'any',
          type: isSvg ? 'image/svg+xml' : 'image/png',
          purpose: 'any maskable'
        },
        {
          src: finalIcon,
          sizes: '192x192',
          type: isSvg ? 'image/svg+xml' : 'image/png',
          purpose: 'any maskable'
        },
        {
          src: finalIcon,
          sizes: '512x512',
          type: isSvg ? 'image/svg+xml' : 'image/png',
          purpose: 'any maskable'
        }
      ]
    };

    const manifestBlob = new Blob([JSON.stringify(dynamicManifest, null, 2)], {
      type: 'application/manifest+json'
    });

    if (activeBlobManifestUrl) {
      URL.revokeObjectURL(activeBlobManifestUrl);
    }

    activeBlobManifestUrl = URL.createObjectURL(manifestBlob);

    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = activeBlobManifestUrl;

  } catch (error) {
    console.warn('Erro ao atualizar manifesto PWA dinâmico:', error);
  }
}

export function initializeStoredPwaAssets() {
  if (typeof window === 'undefined') return;

  try {
    const savedSettings = localStorage.getItem('vagou_salon_admin_settings');
    const storedIcon = localStorage.getItem('vagou_salon_icon') || localStorage.getItem('vagou_salon_logo_dark');
    const storedColor = localStorage.getItem('vagou_accent_color') || '#20C933';

    let name = 'Meu Estabelecimento';
    let icon = storedIcon || '';
    let color = storedColor;
    let slogan = '';
    let isDarkTheme: boolean | undefined = undefined;

    const userPref = localStorage.getItem('vagou_user_theme_preference');
    if (userPref === 'dark') isDarkTheme = true;
    else if (userPref === 'light') isDarkTheme = false;

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.pwaName || parsed.salonName) name = parsed.pwaName || parsed.salonName;
        if (parsed.salonIcon || parsed.salonLogoDark || parsed.salonLogo) {
          icon = parsed.salonIcon || parsed.salonLogoDark || parsed.salonLogo;
        }
        if (parsed.accentColor) color = parsed.accentColor;
        if (parsed.slogan) slogan = parsed.slogan;
        if (isDarkTheme === undefined) {
          if (parsed.defaultTheme === 'dark') isDarkTheme = true;
          else if (parsed.defaultTheme === 'light') isDarkTheme = false;
        }
      } catch {}
    }

    updateDynamicPwaAssets(name, icon, color, slogan, isDarkTheme);
  } catch {
    // ignore
  }
}

