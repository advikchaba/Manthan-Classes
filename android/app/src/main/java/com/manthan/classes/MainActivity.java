package com.manthan.classes;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {

    private static final String START_URL = "https://manthanclasses.vercel.app/";
    private static final String SITE_HOST = "manthanclasses.vercel.app";
    private static final String BG_COLOR = "#f5f5f2";

    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor(BG_COLOR));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost();
                String scheme = uri.getScheme();

                // Keep the class site inside the app.
                if (host != null && host.equalsIgnoreCase(SITE_HOST)) {
                    return false;
                }

                // Google Meet links, PDFs and anything else open in the system browser.
                if ("http".equals(scheme) || "https".equals(scheme)) {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                }
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    showOffline();
                }
            }
        });

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        }
        if (webView.getUrl() == null) {
            webView.loadUrl(START_URL);
        }
    }

    private void showOffline() {
        String html = "<!doctype html><html><head>"
                + "<meta name='viewport' content='width=device-width,initial-scale=1'>"
                + "<style>"
                + "body{margin:0;min-height:100vh;display:grid;place-items:center;background:" + BG_COLOR + ";"
                + "color:#14161a;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;text-align:center;padding:24px}"
                + "h1{font-family:Georgia,serif;font-weight:400;font-size:26px;margin:0 0 8px}"
                + "p{color:#5d636b;font-size:14px;margin:0 0 22px;line-height:1.5}"
                + "button{padding:11px 22px;border:0;border-radius:9px;background:#14161a;color:#fff;"
                + "font-size:14px;font-weight:600}"
                + "</style></head><body><div>"
                + "<h1>You're offline</h1>"
                + "<p>Manthan Classes needs an internet connection<br>to load your classes.</p>"
                + "<button onclick=\"location.href='" + START_URL + "'\">Try again</button>"
                + "</div></body></html>";
        webView.loadDataWithBaseURL(START_URL, html, "text/html", "utf-8", null);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
