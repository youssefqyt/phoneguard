package com.phoneguard.blocking

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
import android.widget.Toast

/**
 * Enforces limits and blocklists by watching foreground window changes.
 *
 * When a blocked package comes to the foreground the service sends the user
 * home and shows a short explanation. `EventKind`/`PackageName` from the
 * window-state-changed event is what makes this reliable across launchers.
 *
 * The service is deliberately stateless — all policy lives in
 * [EnforcementPolicy], so a rule change from the API takes effect immediately
 * without restarting the service.
 */
class PhoneGuardAccessibilityService : AccessibilityService() {

  private var lastBlockedPackage: String? = null
  private var lastBlockedAt: Long = 0L

  override fun onServiceConnected() {
    super.onServiceConnected()
    lastBlockedPackage = null
    lastBlockedAt = 0L
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null) return
    if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

    val packageName = event.packageName?.toString() ?: return
    if (packageName == this.packageName) return

    if (!EnforcementPolicy.isBlocked(this, packageName)) {
      if (lastBlockedPackage == packageName) lastBlockedPackage = null
      return
    }

    // Debounce: the same package can emit several window events in a row.
    val now = System.currentTimeMillis()
    if (lastBlockedPackage == packageName && now - lastBlockedAt < 1_500L) {
      return
    }
    lastBlockedPackage = packageName
    lastBlockedAt = now

    performGlobalAction(GLOBAL_ACTION_HOME)
    Toast.makeText(
      this,
      "This app is blocked by PhoneGuard right now.",
      Toast.LENGTH_SHORT
    ).show()
  }

  override fun onInterrupt() {
    // Nothing to clean up.
  }
}
