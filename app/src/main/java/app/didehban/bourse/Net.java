package app.didehban.bourse;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.cert.X509Certificate;
import java.util.regex.Pattern;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLHandshakeException;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

/** درخواست‌های شبکه‌ی اپ (جایگزین fetch در background.js افزونه؛ بدون CORS). فقط نشانی‌های مجازِ همان افزونه. */
final class Net {
    static final String DESKTOP_UA =
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

    private static final Pattern TSETMC_API = Pattern.compile("^https://cdn\\.tsetmc\\.(com|ir)/api/");
    private static final Pattern CODAL_SEARCH = Pattern.compile("^https://search\\.codal\\.ir/api/search/v2/q\\?");
    private static final Pattern CODAL_ANY = Pattern.compile("^https://([a-z0-9-]+\\.)*codal\\.ir/", Pattern.CASE_INSENSITIVE);
    private static final int MAX_BYTES = 30 * 1024 * 1024;

    static final class Resp {
        int status;
        byte[] body = new byte[0];
        String err;
    }

    static boolean allowedJson(String kind, String url) {
        if ("fetch".equals(kind)) return TSETMC_API.matcher(url).find();
        if ("codal".equals(kind)) return CODAL_SEARCH.matcher(url).find();
        return false;
    }

    static boolean allowedBin(String url) {
        return CODAL_ANY.matcher(url).find();
    }

    // سایت‌های بورس/کدال گاهی زنجیره‌ی گواهی ناقص یا از مرجع ناشناخته برای اندروید دارند (کروم خودش کامل می‌کند، جاوا نه).
    // فقط برای همین نشانی‌های مجازِ فقط‌خواندنی و فقط اگر راه عادی خطای گواهی داد، بدون بررسی زنجیره تلاش می‌شود (نام میزبان همچنان بررسی می‌شود).
    private static SSLSocketFactory lenient;

    private static synchronized SSLSocketFactory lenientFactory() throws Exception {
        if (lenient == null) {
            TrustManager[] tm = new TrustManager[]{new X509TrustManager() {
                @Override public void checkClientTrusted(X509Certificate[] c, String a) { }
                @Override public void checkServerTrusted(X509Certificate[] c, String a) { }
                @Override public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
            }};
            SSLContext ctx = SSLContext.getInstance("TLS");
            ctx.init(null, tm, null);
            lenient = ctx.getSocketFactory();
        }
        return lenient;
    }

    static Resp get(String url, String accept) {
        Resp r = get(url, accept, false);
        if (r.err != null && r.err.contains("SSLHandshakeException")) r = get(url, accept, true);
        return r;
    }

    private static Resp get(String url, String accept, boolean skipChain) {
        Resp r = new Resp();
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL(url).openConnection();
            if (skipChain && c instanceof HttpsURLConnection) ((HttpsURLConnection) c).setSSLSocketFactory(lenientFactory());
            c.setConnectTimeout(20000);
            c.setReadTimeout(60000);
            c.setRequestMethod("GET");
            c.setRequestProperty("User-Agent", DESKTOP_UA);
            c.setRequestProperty("Accept-Language", "fa-IR,fa;q=0.9,en;q=0.5");
            if (accept != null) c.setRequestProperty("Accept", accept);
            if (url.contains("codal.ir")) {
                c.setRequestProperty("Origin", "https://codal.ir");
                c.setRequestProperty("Referer", "https://codal.ir/");
            }
            r.status = c.getResponseCode();
            InputStream in = r.status >= 400 ? c.getErrorStream() : c.getInputStream();
            if (in != null) {
                try {
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    byte[] buf = new byte[16384];
                    int n, total = 0;
                    while ((n = in.read(buf)) > 0) {
                        total += n;
                        if (total > MAX_BYTES) throw new IOException("پاسخ بیش از حد بزرگ است");
                        out.write(buf, 0, n);
                    }
                    r.body = out.toByteArray();
                } finally {
                    in.close();
                }
            }
        } catch (Exception e) {
            r.err = String.valueOf(e);
        } finally {
            if (c != null) c.disconnect();
        }
        return r;
    }
}
