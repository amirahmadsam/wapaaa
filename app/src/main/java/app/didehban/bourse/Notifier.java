package app.didehban.bourse;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/** اعلان‌های هشدار قیمت (هم از برنامه و هم از کارگر پس‌زمینه) */
final class Notifier {
    private static final String CH = "price_alerts";

    static void show(Context c, int id, String title, String text) {
        try {
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            Notification.Builder b;
            if (Build.VERSION.SDK_INT >= 26) {
                NotificationChannel ch = new NotificationChannel(CH, "هشدار قیمت", NotificationManager.IMPORTANCE_HIGH);
                nm.createNotificationChannel(ch);
                b = new Notification.Builder(c, CH);
            } else {
                b = new Notification.Builder(c).setPriority(Notification.PRIORITY_HIGH);
            }
            Intent i = new Intent(c, MainActivity.class);
            i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pi = PendingIntent.getActivity(c, 0, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            b.setSmallIcon(android.R.drawable.ic_dialog_info)
                    .setContentTitle(title)
                    .setContentText(text)
                    .setStyle(new Notification.BigTextStyle().bigText(text))
                    .setContentIntent(pi)
                    .setAutoCancel(true);
            nm.notify(id, b.build());
        } catch (SecurityException ignored) {
            // مجوز اعلان داده نشده
        }
    }
}
