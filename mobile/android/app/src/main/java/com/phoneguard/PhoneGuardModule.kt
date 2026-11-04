package com.phoneguard

import android.content.Intent
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.phoneguard.blocking.EnforcementPolicy
import com.phoneguard.usage.UsageStatsRepository

/**
 * Native bridge for usage collection and enforcement.
 * Mirrors the `UsageBridge` interface in `src/native/UsageBridge.ts`.
 */
class PhoneGuardModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  private val repository by lazy { UsageStatsRepository(reactContext) }

  override fun getName(): String = "PhoneGuard"

  // -------------------------------------------------------------------------
  // Permissions
  // -------------------------------------------------------------------------

  @ReactMethod
  fun hasUsageAccess(promise: Promise) {
    promise.resolve(repository.hasUsageAccess())
  }

  @ReactMethod
  fun requestUsageAccess(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun hasAccessibility(promise: Promise) {
    promise.resolve(isAccessibilityEnabled())
  }

  @ReactMethod
  fun requestAccessibility(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.resolve(false)
    }
  }

  // -------------------------------------------------------------------------
  // Data
  // -------------------------------------------------------------------------

  @ReactMethod
  fun queryUsage(dateKey: String, promise: Promise) {
    try {
      val entries = repository.queryDay(dateKey)
      val apps = Arguments.createArray()
      var screenTimeSeconds = 0

      for (entry in entries) {
        screenTimeSeconds += entry.totalSeconds
        val map = Arguments.createMap().apply {
          putString("packageName", entry.packageName)
          putString("appName", entry.appName)
          putInt("totalSeconds", entry.totalSeconds)
          putInt("launches", entry.launches)
          entry.lastUsedAt?.let { putDouble("lastUsedAt", it.toDouble()) }
        }
        apps.pushMap(map)
      }

      val summary = Arguments.createMap().apply {
        putInt("screenTimeSeconds", screenTimeSeconds)
        // Pickups / notifications / unlocks require a privileged
        // BroadcastReceiver; they are not exposed by UsageStatsManager.
        putInt("pickups", 0)
        putInt("notifications", 0)
        putInt("unlocks", 0)
      }

      val result = Arguments.createMap().apply {
        putString("date", dateKey)
        putArray("apps", apps)
        putMap("summary", summary)
      }
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("USAGE_QUERY_FAILED", error)
    }
  }

  @ReactMethod
  fun getInstalledApps(promise: Promise) {
    try {
      val array = Arguments.createArray()
      for (app in repository.getInstalledApps()) {
        array.pushMap(
          Arguments.createMap().apply {
            putString("packageName", app.packageName)
            putString("appName", app.appName)
            putBoolean("isSystem", app.isSystem)
          }
        )
      }
      promise.resolve(array)
    } catch (error: Exception) {
      promise.reject("INSTALLED_APPS_FAILED", error)
    }
  }

  // -------------------------------------------------------------------------
  // Enforcement
  // -------------------------------------------------------------------------

  @ReactMethod
  fun setBlockedApps(packages: ReadableArray, promise: Promise) {
    try {
      EnforcementPolicy.setBlockedPackages(
          reactContext,
          readableArrayToStrings(packages)
      )
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("SET_BLOCKED_FAILED", error)
    }
  }

  @ReactMethod
  fun setSchedule(payload: ReadableMap, promise: Promise) {
    try {
      val days = payload.getArray("days")?.let { readableArrayToInts(it) } ?: emptyList()
      val startTime = payload.getString("startTime") ?: "22:00"
      val endTime = payload.getString("endTime") ?: "07:00"
      val packages =
        payload.getArray("packages")?.let { readableArrayToStrings(it) } ?: emptyList()

      EnforcementPolicy.setSchedule(
        reactContext,
        days,
        startTime,
        endTime,
        packages
      )
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("SET_SCHEDULE_FAILED", error)
    }
  }

  @ReactMethod
  fun clearEnforcement(promise: Promise) {
    try {
      EnforcementPolicy.clear(reactContext)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("CLEAR_FAILED", error)
    }
  }

  @ReactMethod
  fun getCapabilities(promise: Promise) {
    val hasUsage = repository.hasUsageAccess()
    val hasAccessibility = isAccessibilityEnabled()

    val map = Arguments.createMap().apply {
      putBoolean("canReadUsage", true)
      putBoolean("canBlockApps", true)
      putBoolean("hasUsagePermission", hasUsage)
      putBoolean("hasAccessibilityPermission", hasAccessibility)
      putBoolean("requiresScreenTimeEntitlement", false)
      if (!hasUsage || !hasAccessibility) {
        putString(
          "reason",
          buildString {
            if (!hasUsage) append("Usage access not granted. ")
            if (!hasAccessibility) append("Accessibility service not enabled.")
          }.trim()
        )
      }
    }
    promise.resolve(map)
  }

  // -------------------------------------------------------------------------

  private fun isAccessibilityEnabled(): Boolean {
    val expected = "${reactContext.packageName}/${PhoneGuardAccessibilityServiceClass()}"
    val enabled = Settings.Secure.getString(
      reactContext.contentResolver,
      Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
    ) ?: return false
    return enabled.split(':').any { it.equals(expected, ignoreCase = true) }
  }

  private fun PhoneGuardAccessibilityServiceClass(): String =
    "com.phoneguard.blocking.PhoneGuardAccessibilityService"

  private fun readableArrayToStrings(array: ReadableArray): List<String> {
    val values = ArrayList<String>(array.size())
    for (index in 0 until array.size()) {
      array.getString(index)?.let { values.add(it) }
    }
    return values
  }

  private fun readableArrayToInts(array: ReadableArray): List<Int> {
    val values = ArrayList<Int>(array.size())
    for (index in 0 until array.size()) {
      values.add(array.getInt(index))
    }
    return values
  }
}
