import type { StopFrame } from "../../logic/screen";
import { sizeScale } from "../../logic/stops/shared";
import type { PlayBox } from "../../types";
import { CatchProps } from "./CatchProps";
import { LearnProps } from "./LearnProps";
import { LibraryProps } from "./LibraryProps";
import { PopProps } from "./PopProps";
import { RewardsProps } from "./RewardsProps";
import { SliceProps } from "./SliceProps";

/** One layer of a stop's props: `back` is drawn behind the mascot, `front` over it. */
export function StopLayer({ stop, layer, box }: { stop: StopFrame; layer: "back" | "front"; box: PlayBox }) {
  const size = sizeScale(box);
  switch (stop.name) {
    case "pop":
      return <PopProps state={stop.state} layer={layer} size={size} />;
    case "slice":
      return layer === "front" ? <SliceProps state={stop.state} size={size} /> : null;
    case "catch":
      return layer === "front" ? <CatchProps state={stop.state} size={size} /> : null;
    case "learn":
      return <LearnProps state={stop.state} layer={layer} size={size} />;
    case "library":
      return <LibraryProps state={stop.state} layer={layer} size={size} />;
    case "rewards":
      return <RewardsProps state={stop.state} layer={layer} size={size} ground={box.ground} />;
  }
}
