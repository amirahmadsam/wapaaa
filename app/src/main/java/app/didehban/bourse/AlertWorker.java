package app.didehban.bourse;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Map;
import java.util.TimeZone;

/** هر ~۱۵ دقیقه (حتی وقتی برنامه بسته است) قیمت نمادهای دارای هشدار را می‌خواند و هشدارهای رسیده را اعلان می‌کند. */
public class AlertWorker extends Worker {
    public AlertWorker(@NonNull Context c, @NonNull WorkerParameters p) {
        super(c, p);
    }

    private static boolean marketHours() {
        Calendar t = Calendar.getInstance(TimeZone.getTimeZone("Asia/Tehran"));
        int d = t.get(Calendar.DAY_OF_WEEK);
        if (d == Calendar.THURSDAY || d == Calendar.FRIDAY) return false;
        int m = t.get(Calendar.HOUR_OF_DAY) * 60 + t.get(Calendar.MINUTE);
        return m >= 8 * 60 + 25 && m <= 13 * 60;   // کمی بازتر از ساعت معاملات
    }

    private static double num(JSONObject o, String k) {
        return o == null ? 0 : o.optDouble(k, 0);
    }

    @NonNull
    @Override
    public Result doWork() {
        try {
            if (!marketHours()) return Result.success();
            Store st = Store.of(getApplicationContext());
            String raw = st.getRaw("app:alerts");
            if (raw == null) return Result.success();
            JSONArray arr = new JSONArray(raw);
            Map<String, double[]> px = new HashMap<>();   // کد نماد ← {قیمت، درصد تغییر}
            int fetched = 0;
            for (int i = 0; i < arr.length(); i++) {
                JSONObject a = arr.optJSONObject(i);
                if (a == null || !a.optBoolean("on", true)) continue;
                String ins = a.optString("i");
                if (ins.isEmpty() || px.containsKey(ins) || fetched >= 30) continue;
                fetched++;
                Net.Resp r = Net.get("https://cdn.tsetmc.com/api/ClosingPrice/GetClosingPriceInfo/" + ins, "application/json");
                if (r.err != null || r.status != 200) continue;
                JSONObject info = new JSONObject(new String(r.body, StandardCharsets.UTF_8)).optJSONObject("closingPriceInfo");
                if (info == null) continue;
                double last = num(info, "pDrCotVal"), close = num(info, "pClosing"), py = num(info, "priceYesterday");
                double s = last > 0 ? last : close;
                if (s <= 0) continue;
                px.put(ins, new double[]{s, py > 0 ? (s - py) / py * 100 : 0});
            }
            boolean changed = false;
            for (int i = 0; i < arr.length(); i++) {
                JSONObject a = arr.optJSONObject(i);
                if (a == null || !a.optBoolean("on", true)) continue;
                double[] p = px.get(a.optString("i"));
                if (p == null) continue;
                String t = a.optString("t");
                double v = a.optDouble("v", 0);
                boolean hit = ("above".equals(t) && p[0] >= v) || ("below".equals(t) && p[0] <= v)
                        || ("up".equals(t) && p[1] >= v) || ("down".equals(t) && p[1] <= -v);
                if (!hit) continue;
                a.put("on", false);
                a.put("fired", System.currentTimeMillis());
                a.put("firedAt", p[0]);
                changed = true;
                String sym = a.optString("s", "نماد");
                String what = "above".equals(t) ? "به " + Math.round(p[0]) + " رسید (بالاتر از " + Math.round(v) + ")"
                        : "below".equals(t) ? "به " + Math.round(p[0]) + " رسید (پایین‌تر از " + Math.round(v) + ")"
                        : "up".equals(t) ? "امروز " + String.format(java.util.Locale.US, "%.1f", p[1]) + "٪ رشد کرد"
                        : "امروز " + String.format(java.util.Locale.US, "%.1f", p[1]) + "٪ افت کرد";
                Notifier.show(getApplicationContext(), (int) (System.currentTimeMillis() & 0x7fffffff) + i, "هشدار " + sym, sym + " " + what);
            }
            if (changed) st.set("app:alerts", arr.toString());
        } catch (Exception ignored) {
        }
        return Result.success();
    }
}
