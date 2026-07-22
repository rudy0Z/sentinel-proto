import { ALL_SCENES, auditMachine, TRANSITIONS } from "../src/app/domain/stateMachine";

const audit = auditMachine();
console.log("total transitions:", audit.totalTransitions);
console.log("unreachable (a real gap):", audit.unreachableScenes);
console.log("fault-injected (no inbound by design):", audit.faultOnlyScenes);
console.log("dead ends (no outbound edge):", audit.deadEndScenes);
console.log("\n--- outbound edges per scene (wildcards excluded) ---");
for (const scene of ALL_SCENES) {
  const specific = TRANSITIONS.filter((transition) => transition.from === scene);
  console.log(
    `${scene.padEnd(30)} ${String(specific.length).padStart(2)}  ${specific.map((t) => `${t.event}→${t.to}`).join(", ")}`,
  );
}
