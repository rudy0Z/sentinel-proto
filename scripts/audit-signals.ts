import { getSignalHistory } from "../src/app/domain/talon";
import { ALL_SCENES } from "../src/app/domain/stateMachine";

console.log("scene".padEnd(30), "thermal series → current");
for (const scene of ALL_SCENES) {
  const history = getSignalHistory(scene);
  const endsCorrectly =
    history.thermal[history.thermal.length - 1] === history.current.thermal &&
    history.confidence[history.confidence.length - 1] === history.current.confidence;
  console.log(
    scene.padEnd(30),
    JSON.stringify(history.thermal).padEnd(30),
    `conf=${history.current.confidence}`.padEnd(10),
    endsCorrectly ? "OK" : "MISMATCH — chart would disagree with its own number",
  );
}
