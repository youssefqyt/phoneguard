package com.phoneguard.blocking

import android.content.Context
import android.content.SharedPreferences
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

/**
 * The enforcement state the accessibility service reads.
 *
 * Persisted in SharedPreferences so enforcement survives process death and
 * device reboots, and so the React Native layer and the accessibility service
 * can share one source of truth without a live binding.
 */
object EnforcementPolicy {

  private const val PREFS = "phoneguard.enforcement"
  private const val KEY_BLOCKED = "blocked_packages"
  private const val KEY_SCHEDULE_ENABLED = "schedule_enabled"
  private const val KEY_SCHEDULE_DAYS = "schedule_days"
  private const val KEY_SCHEDULE_START = "schedule_start"
  private const val KEY_SCHEDULE_END = "schedule_end"
  private const val KEY_SCHEDULE_PACKAGES = "schedule_packages"

  private fun prefs(context: Context): SharedPreferences =
    context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun blockedPackages(context: Context): Set<String> =
    prefs(context).getStringSet(KEY_BLOCKED, emptySet())?.toSet() ?: emptySet()

  fun setBlockedPackages(context: Context, packages: List<String>) {
    prefs(context).edit()
      .putStringSet(KEY_BLOCKED, packages.toSet())
      .apply()
  }

  /**
   * Applies a recurring window. `days` uses ISO weekdays (1 = Monday … 7 = Sunday).
   */
  fun setSchedule(
    context: Context,
    days: List<Int>,
    startTime: String,
    endTime: String,
    packages: List<String>
  ) {
    prefs(context).edit()
      .putBoolean(KEY_SCHEDULE_ENABLED, true)
      .putString(KEY_SCHEDULE_DAYS, days.joinToString(","))
      .putString(KEY_SCHEDULE_START, startTime)
      .putString(KEY_SCHEDULE_END, endTime)
      .putStringSet(KEY_SCHEDULE_PACKAGES, packages.toSet())
      .apply()
  }

  fun clear(context: Context) {
    prefs(context).edit().clear().apply()
  }

  /** True when `packageName` should be blocked right now. */
  fun isBlocked(context: Context, packageName: String): Boolean {
    val prefs = prefs(context)
    val always = prefs.getStringSet(KEY_BLOCKED, emptySet()) ?: emptySet()
    if (always.contains(packageName)) return true

    if (!prefs.getBoolean(KEY_SCHEDULE_ENABLED, false)) return false

    val schedulePackages =
      prefs.getStringSet(KEY_SCHEDULE_PACKAGES, emptySet()) ?: emptySet()
    if (schedulePackages.isNotEmpty() && !schedulePackages.contains(packageName)) {
      return false
    }

    val days = prefs.getString(KEY_SCHEDULE_DAYS, "")?.split(",")
      ?.mapNotNull { it.trim().toIntOrNull() } ?: emptyList()
    if (days.isNotEmpty() && !days.contains(isoWeekday())) return false

    val start = prefs.getString(KEY_SCHEDULE_START, null) ?: return false
    val end = prefs.getString(KEY_SCHEDULE_END, null) ?: return false

    return isWithinWindow(nowMinutes(), minutesOf(start), minutesOf(end))
  }

  private fun isoWeekday(): Int {
    val day = Calendar.getInstance().get(Calendar.DAY_OF_WEEK)
    return if (day == Calendar.SUNDAY) 7 else day - 1
  }

  private fun nowMinutes(): Int {
    val calendar = Calendar.getInstance()
    return calendar.get(Calendar.HOUR_OF_DAY) * 60 + calendar.get(Calendar.MINUTE)
  }

  private fun minutesOf(time: String): Int {
    val parts = time.split(":")
    val hours = parts.getOrNull(0)?.toIntOrNull() ?: 0
    val minutes = parts.getOrNull(1)?.toIntOrNull() ?: 0
    return (hours % 24) * 60 + (minutes % 60)
  }

  /** Mirrors `isWithinWindow()` on the backend, including midnight crossing. */
  private fun isWithinWindow(now: Int, start: Int, end: Int): Boolean {
    if (start == end) return true
    return if (start < end) {
      now in start until end
    } else {
      now >= start || now < end
    }
  }

  @Suppress("unused")
  private fun debugString(context: Context): String =
    String.format(
      Locale.US,
      "blocked=%s schedule=%s",
      blockedPackages(context),
      prefs(context).getBoolean(KEY_SCHEDULE_ENABLED, false)
    )
}
