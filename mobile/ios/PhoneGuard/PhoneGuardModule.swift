//
//  PhoneGuardModule.swift
//  PhoneGuard
//
//  iOS side of the native usage/enforcement bridge.
//
//  IMPORTANT — read this before assuming the iOS build is "missing something".
//
//  Apple does not expose a general-purpose usage-stats or app-blocking API to
//  third-party apps the way Android does. The only sanctioned mechanism is the
//  Screen Time stack:
//
//    • Family Controls  — `com.apple.developer.family-controls` entitlement,
//                         which Apple must approve per-account.
//    • Device Activity  — `DeviceActivityMonitor` / `DeviceActivityReport`
//                         extensions for schedules and usage reporting.
//    • Managed Settings — `ManagedSettingsStore` to shield apps/categories.
//
//  Those frameworks only work inside app extensions (not the main app target),
//  so a complete implementation is a multi-target project, not a single file.
//  This module therefore reports capabilities honestly so the JS layer can
//  degrade gracefully instead of pretending the data exists.
//
//  To complete iOS support:
//    1. Request the Family Controls entitlement in the Apple Developer portal.
//    2. Add two targets: a Device Activity Monitor extension and a Device
//       Activity Report extension.
//    3. Replace the stubs below with `ManagedSettingsStore` shielding and
//       `DeviceActivityReport` reads.
//    4. Flip `canReadUsage` / `canBlockApps` to true when the entitlement is
//       present (check `AuthorizationCenter.shared.authorizationStatus`).
//

import Foundation
import UIKit

@objc(PhoneGuard)
final class PhoneGuardModule: NSObject {

  /// The Family Controls entitlement is not present in a standard build.
  private var hasScreenTimeEntitlement: Bool {
    // When the entitlement is added, replace with:
    //   if #available(iOS 15.0, *) {
    //     return AuthorizationCenter.shared.authorizationStatus == .approved
    //   }
    return false
  }

  @objc static func requiresMainQueueSetup() -> Bool { false }

  // MARK: - Capabilities

  @objc func getCapabilities(_ resolve: RCTPromiseResolveBlock,
                             reject: RCTPromiseRejectBlock) {
    let entitled = hasScreenTimeEntitlement
    resolve([
      "canReadUsage": entitled,
      "canBlockApps": entitled,
      "hasUsagePermission": entitled,
      "hasAccessibilityPermission": false,
      "requiresScreenTimeEntitlement": true,
      "reason": entitled
        ? NSNull()
        : "iOS requires Apple's Screen Time (Family Controls) entitlement. Until it is granted, usage tracking and app blocking are unavailable on this device.",
    ])
  }

  // MARK: - Permissions

  @objc func hasUsageAccess(_ resolve: RCTPromiseResolveBlock,
                            reject: RCTPromiseRejectBlock) {
    resolve(hasScreenTimeEntitlement)
  }

  @objc func requestUsageAccess(_ resolve: RCTPromiseResolveBlock,
                                reject: RCTPromiseRejectBlock) {
    // With the entitlement this becomes:
    //   AuthorizationCenter.shared.requestAuthorization { result in ... }
    openSettings()
    resolve(false)
  }

  @objc func hasAccessibility(_ resolve: RCTPromiseResolveBlock,
                              reject: RCTPromiseRejectBlock) {
    // No accessibility-service equivalent is needed on iOS.
    resolve(false)
  }

  @objc func requestAccessibility(_ resolve: RCTPromiseResolveBlock,
                                  reject: RCTPromiseRejectBlock) {
    openSettings()
    resolve(false)
  }

  // MARK: - Data (stubs until the entitlement is granted)

  @objc func queryUsage(_ dateKey: String,
                        resolve: RCTPromiseResolveBlock,
                        reject: RCTPromiseRejectBlock) {
    resolve([
      "date": dateKey,
      "apps": [],
      "summary": [
        "screenTimeSeconds": 0,
        "pickups": 0,
        "notifications": 0,
        "unlocks": 0,
      ],
    ])
  }

  @objc func getInstalledApps(_ resolve: RCTPromiseResolveBlock,
                              reject: RCTPromiseRejectBlock) {
    // With Family Controls this returns `FamilyActivitySelection` tokens, which
    // are opaque and cannot be mapped to package identifiers like Android's.
    resolve([])
  }

  // MARK: - Enforcement (stubs)

  @objc func setBlockedApps(_ packages: [String],
                            resolve: RCTPromiseResolveBlock,
                            reject: RCTPromiseRejectBlock) {
    // Real implementation: ManagedSettingsStore().shield.applications = ...
    resolve(false)
  }

  @objc func setSchedule(_ payload: NSDictionary,
                         resolve: RCTPromiseResolveBlock,
                         reject: RCTPromiseRejectBlock) {
    // Real implementation: DeviceActivityCenter().startMonitoring(...)
    resolve(false)
  }

  @objc func clearEnforcement(_ resolve: RCTPromiseResolveBlock,
                              reject: RCTPromiseRejectBlock) {
    resolve(false)
  }

  // MARK: - Helpers

  private func openSettings() {
    DispatchQueue.main.async {
      guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
      UIApplication.shared.open(url)
    }
  }
}
