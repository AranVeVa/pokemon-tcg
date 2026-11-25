// Google Analytics 4 (GA4) helper para SPA React + Vite
const GA_MEASUREMENT_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim();

let gaInitialized = false;

export function isAnalyticsConfigured() {
  return /^G-[A-Z0-9]{5,}$/i.test(GA_MEASUREMENT_ID) && !/X{4,}/i.test(GA_MEASUREMENT_ID);
}

export function initAnalytics() {
  if (gaInitialized || typeof window === 'undefined' || !isAnalyticsConfigured()) {
    return false;
  }

  // Evitar duplicar el script de gtag si ya existe
  if (!document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
  }

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false,
    anonymize_ip: true
  });

  gaInitialized = true;
  return true;
}

export function trackPageView(pagePath, pageTitle) {
  if (!isAnalyticsConfigured() || typeof window === 'undefined') return;
  if (!gaInitialized) initAnalytics();
  if (typeof window.gtag !== 'function') return;

  window.gtag('event', 'page_view', {
    page_path: pagePath,
    page_title: pageTitle || document.title,
    page_location: window.location.href
  });
}

export function trackEvent(eventName, params = {}) {
  if (!isAnalyticsConfigured() || typeof window === 'undefined') return;
  if (!gaInitialized) initAnalytics();
  if (typeof window.gtag !== 'function') return;

  window.gtag('event', eventName, params);
}
