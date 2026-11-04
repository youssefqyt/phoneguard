package com.phoneguard.usage

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.os.Process
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.TimeUnit

/** A single app's usage for a day. */
data class UsageEntry(
  val packageName: String,
  val appName: String?,
  val totalSeconds: Int,
  val launches: Int,
  val lastUsedAt: Long?
)

/** An installed app, used by the limit picker. */
data class InstalledApp(
  val packageName: String,
  val appName: String,
  val isSystem: Boolean
)

/**
 * Reads device usage through [UsageStatsManager].
 *
 * Requires the `PACKAGE_USAGE_STATS` special permission, which the user grants
 * manually in Settings → Special app access → Usage access.
 *
 * Days are bucketed in **UTC** to match the API's day boundaries.
 */
class UsageStatsRepository(private val context: Context) {

  private val usageStatsManager: UsageStatsManager?
    get() = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager

  private fun dayFormatter(): SimpleDateFormat =
    SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
      timeZone = TimeZone.getTimeZone("UTC")
    }

  /** True when the user has granted usage access to this app. */
  fun hasUsageAccess(): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager
      ?: return false
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      appOps.unsafeCheckOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        Process.myUid(),
        context.packageName
      )
    } else {
      @Suppress("DEPRECATION")
      appOps.checkOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        Process.myUid(),
        context.packageName
      )
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  /**
   * Returns per-app foreground time for the given `YYYY-MM-DD` (UTC).
   * Empty when usage access has not been granted.
   */
  fun queryDay(dateKey: String): List<UsageEntry> {
    val manager = usageStatsManager ?: return emptyList()
    if (!hasUsageAccess()) return emptyList()

    val start = parseDay(dateKey) ?: return emptyList()
    val end = start + TimeUnit.DAYS.toMillis(1)

    val launchCounts = countLaunches(manager, start, end)
    val packageManager = context.packageManager
    val appNames = appNameCache(packageManager)

    @Suppress("DEPRECATION")
    val stats = manager.queryUsageStats(UsageStatsManager.INTERVAL_BEST, start, end)
      ?: return emptyList()

    val aggregated = HashMap<String, Long>()
    val lastUsed = HashMap<String, Long>()

    for (stat in stats) {
      if (stat.lastTimeUsed < start || stat.lastTimeUsed >= end) continue
      val foreground = stat.totalTimeInForeground
      if (foreground <= 0) continue
      aggregated[stat.packageName] =
        (aggregated[stat.packageName] ?: 0L) + foreground
      val previous = lastUsed[stat.packageName] ?: 0L
      if (stat.lastTimeUsed > previous) lastUsed[stat.packageName] = stat.lastTimeUsed
    }

    return aggregated.entries
      .map { (packageName, millis) ->
        UsageEntry(
          packageName = packageName,
          appName = appNames[packageName],
          totalSeconds = (millis / 1000L).toInt(),
          launches = launchCounts[packageName] ?: 0,
          lastUsedAt = lastUsed[packageName]
        )
      }
      .filter { it.totalSeconds > 0 }
      .sortedByDescending { it.totalSeconds }
  }

  /** Installed, launchable apps (used by the app-limit picker). */
  fun getInstalledApps(): List<InstalledApp> {
    val packageManager = context.packageManager
    val intent = android.content.Intent(android.content.Intent.ACTION_MAIN).apply {
      addCategory(android.content.Intent.CATEGORY_LAUNCHER)
    }

    return packageManager
      .queryIntentActivities(intent, 0)
      .asSequence()
      .map { it.activityInfo.applicationInfo }
      .distinctBy { it.packageName }
      .filter { it.packageName != context.packageName }
      .map { info ->
        InstalledApp(
          packageName = info.packageName,
          appName = packageManager.getApplicationLabel(info).toString(),
          isSystem = (info.flags and ApplicationInfo.FLAG_SYSTEM) != 0
        )
      }
      .sortedBy { it.appName.lowercase(Locale.US) }
      .toList()
  }

  /** Total foreground time across all apps for a day, in seconds. */
  fun screenTimeSeconds(dateKey: String): Int =
    queryDay(dateKey).sumOf { it.totalSeconds }

  // -------------------------------------------------------------------------

  private fun parseDay(dateKey: String): Long? =
    try {
      dayFormatter().parse(dateKey)?.time
    } catch (_: Exception) {
      null
    }

  /**
   * Counts app launches by tallying `ACTIVITY_RESUMED` events for the day.
   * UsageStats itself does not expose launch counts.
   */
  private fun countLaunches(
    manager: UsageStatsManager,
    start: Long,
    end: Long
  ): Map<String, Int> {
    val counts = HashMap<String, Int>()
    try {
      val events = manager.queryEvents(start, end) ?: return counts
      val event = UsageEvents.Event()
      val resumedType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        UsageEvents.Event.ACTIVITY_RESUMED
      } else {
        @Suppress("DEPRECATION")
        UsageEvents.Event.MOVE_TO_FOREGROUND
      }
      while (events.hasNextEvent()) {
        events.getNextEvent(event)
        if (event.eventType == resumedType) {
          val pkg = event.packageName ?: continue
          counts[pkg] = (counts[pkg] ?: 0) + 1
        }
      }
    } catch (_: Exception) {
      // Event history can be unavailable; launches are non-critical.
    }
    return counts
  }

  private fun appNameCache(packageManager: PackageManager): Map<String, String> {
    val names = HashMap<String, String>()
    try {
      for (info in packageManager.getInstalledApplications(0)) {
        names[info.packageName] =
          packageManager.getApplicationLabel(info).toString()
      }
    } catch (_: Exception) {
      // ignore
    }
    return names
  }

  companion object {
    /** Midnight UTC for "today", used as a default. */
    fun todayKey(): String {
      val calendar = Calendar.getInstance(TimeZone.getTimeZone("UTC"))
      return String.format(
        Locale.US,
        "%04d-%02d-%02d",
        calendar.get(Calendar.YEAR),
        calendar.get(Calendar.MONTH) + 1,
        calendar.get(Calendar.DAY_OF_MONTH)
      )
    }
  }
}
