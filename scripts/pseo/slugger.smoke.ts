/**
 * slugger 簡易自己テスト
 */

import { buildFinalSlug } from "./slugger.js";

const result = buildFinalSlug(
  "d-150",
  "AIMOaaSにおけるAI監査の証憑と保証：役割分界と証跡整備の観点"
);

const slug = result.final_slug;
const hasResponsibility = slug.includes("responsibility-boundary");
const hasProofAssurance = slug.includes("proof-assurance");
const hasId = /-d-150$/.test(slug);

console.log("slugger smoke test:");
console.log("  final_slug:", slug);
console.log("  topic_keys:", result.topic_keys);
console.log("  reason.fallback_used:", result.reason.fallback_used);

if (hasId && (hasResponsibility || hasProofAssurance)) {
  console.log("  PASS");
  process.exit(0);
} else {
  console.log("  FAIL: expected final_slug to contain responsibility-boundary or proof-assurance and end with -d-150");
  process.exit(1);
}
