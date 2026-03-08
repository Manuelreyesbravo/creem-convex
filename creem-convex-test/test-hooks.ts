// =============================================
// TEST 4: React hooks import
// =============================================
import {
  useCreemSubscription,
  useCreemAccess,
  useCreemCheckout,
  useCreemPayments,
} from "creem-convex/react";

// Verify all hooks are functions
const checks = {
  useCreemSubscription: typeof useCreemSubscription === "function",
  useCreemAccess: typeof useCreemAccess === "function",
  useCreemCheckout: typeof useCreemCheckout === "function",
  useCreemPayments: typeof useCreemPayments === "function",
};

console.log("React hooks import check:", checks);
console.log("All hooks OK:", Object.values(checks).every(Boolean));
