package com.habittracker.app;

import android.app.AppOpsManager;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.os.Process;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Native bridge to Android's UsageStatsManager ("Usage access").
 *
 * A PWA cannot reach this API — only a native Android app with the
 * PACKAGE_USAGE_STATS permission can. This plugin is that door:
 * it reads per-app foreground time inside a given window (usually from
 * the moment the user set their budget, or from midnight) for the tracked
 * social apps plus the user's total screen time, and hands the numbers
 * to the web layer.
 */
@CapacitorPlugin(name = "UsageStats")
public class UsageStatsPlugin extends Plugin {

    private static final Map<String, String> APP_PACKAGES = new HashMap<>();

    static {
        APP_PACKAGES.put("instagram", "com.instagram.android");
        APP_PACKAGES.put("tiktok", "com.zhiliaoapp.musically");
        APP_PACKAGES.put("twitter", "com.twitter.android");
        APP_PACKAGES.put("youtube", "com.google.android.youtube");
    }

    private boolean hasUsageAccess() {
        AppOpsManager appOps = (AppOpsManager) getContext().getSystemService(Context.APP_OPS_SERVICE);
        if (appOps == null) return false;
        int mode = appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                getContext().getPackageName()
        );
        return mode == AppOpsManager.MODE_ALLOWED;
    }

    private static double minutes(long ms) {
        return Math.round(ms / 60000.0 * 10) / 10.0;
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", hasUsageAccess());
        call.resolve(ret);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        if (getActivity() == null) {
            call.reject("No activity available");
            return;
        }
        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getActivity().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void querySince(PluginCall call) {
        if (!hasUsageAccess()) {
            call.reject("Usage access not granted", "NO_USAGE_ACCESS_PERMISSION");
            return;
        }

        UsageStatsManager usm = (UsageStatsManager) getContext().getSystemService(Context.USAGE_STATS_SERVICE);
        if (usm == null) {
            call.reject("UsageStatsManager unavailable");
            return;
        }

        long now = System.currentTimeMillis();
        long from = (long) call.getDouble("since", 0.0).doubleValue();
        if (from <= 0) {
            // Fallback: start of the device's current day.
            Calendar calendar = Calendar.getInstance();
            calendar.set(Calendar.HOUR_OF_DAY, 0);
            calendar.set(Calendar.MINUTE, 0);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            from = calendar.getTimeInMillis();
        }
        if (from > now) from = now;

        JSObject apps = new JSObject();
        long totalMs = 0L;

        // Walk the foreground event stream and accumulate time per app only
        // for events inside [from, now] — so recording starts the moment the
        // user sets the budget, regardless of earlier usage today.
        UsageEvents events = usm.queryEvents(from, now);
        if (events != null) {
            UsageEvents.Event event = new UsageEvents.Event();
            // package name -> timestamp of its last ACTIVITY_RESUMED
            Map<String, Long> resumed = new HashMap<>();
            while (events.hasNextEvent()) {
                events.getNextEvent(event);
                int type = event.getEventType();
                String pkg = event.getPackageName();
                if (type == UsageEvents.Event.ACTIVITY_RESUMED) {
                    resumed.put(pkg, event.getTimeStamp());
                } else if (type == UsageEvents.Event.ACTIVITY_PAUSED
                        || type == UsageEvents.Event.ACTIVITY_STOPPED) {
                    Long start = resumed.remove(pkg);
                    if (start != null) {
                        long durationMs = Math.max(0, event.getTimeStamp() - start);
                        totalMs += durationMs;
                        addAppMinutes(apps, pkg, durationMs);
                    }
                }
            }
            // Still foreground when the query ran: count up to now.
            for (Map.Entry<String, Long> entry : resumed.entrySet()) {
                long durationMs = Math.max(0, now - entry.getValue());
                totalMs += durationMs;
                addAppMinutes(apps, entry.getKey(), durationMs);
            }
        }

        String date = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date(now));
        JSObject ret = new JSObject();
        ret.put("date", date);
        ret.put("totalMinutes", minutes(totalMs));
        ret.put("apps", apps);
        call.resolve(ret);
    }

    private void addAppMinutes(JSObject apps, String packageName, long durationMs) {
        if (durationMs <= 0) return;
        for (Map.Entry<String, String> entry : APP_PACKAGES.entrySet()) {
            if (entry.getValue().equals(packageName)) {
                double current = apps.optDouble(entry.getKey(), 0.0);
                apps.put(entry.getKey(), current + minutes(durationMs));
                return;
            }
        }
    }
}