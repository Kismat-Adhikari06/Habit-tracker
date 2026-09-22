/** Shared client/server types for the habit domain. */

/**
 * trackingType "budget" is an internal (non-user-selectable) mode used by
 * auto-synced phone usage habits: the value stored is minutes used, the
 * target is the daily budget, and the heatmap renders inverted (under budget
 * = bright, over = pale).
 */
export type TrackingType = "duration" | "distance" | "quantity" | "boolean" | "budget";

export type ViewMode = "daily" | "weekly" | "yearly";
