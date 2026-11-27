import type { BurstState, CursorState, FilmFormat, MascotPose, Point, Spot, StopName } from "../types";
import { burstAt, CURSOR_TARGET, cursorAt } from "./hand-path";
import { lookAt, logoScale } from "./mascot-space";
import { byePose, helloPose, idlePose, tvPose, withGait } from "./mascot-motion";
import { ease, lerp, progress } from "./motion";
import { routeAt } from "./walk";
import { routeFor, STOP_SPOTS, STOPS, WALK_SECONDS } from "./route";
import { SCENE_STARTS, sceneAt } from "./timeline";
import { catchAt, catchPose, type CatchState } from "./stops/catch";
import { learnAt, learnPose, type LearnState } from "./stops/learn";
import { libraryAt, libraryPose, type LibraryState } from "./stops/library";
import { popAt, popPose, type PopState } from "./stops/pop";
import { rewardsAt, rewardsPose, type RewardsState } from "./stops/rewards";
import { sliceAt, slicePose, type SliceState } from "./stops/slice";

export type StopFrame =
  | { name: "pop"; state: PopState }
  | { name: "slice"; state: SliceState }
  | { name: "catch"; state: CatchState }
  | { name: "learn"; state: LearnState }
  | { name: "library"; state: LibraryState }
  | { name: "rewards"; state: RewardsState };

/** Everything the TV screen shows at one moment, in screen units. */
export type ScreenFrame = {
  spot: Spot;
  pose: MascotPose;
  cursor: CursorState | null;
  bursts: BurstState[];
  stop: StopFrame | null;
};

/** How far the eyes turn towards where the mascot is walking, in logo pixels. */
const WALK_LOOK = 7;

/** Which way the mascot walks into a stop: -1 left, 1 right. */
function headingInto(stop: StopName) {
  const index = STOPS.indexOf(stop);
  const from = index === 0 ? 0.5 : STOP_SPOTS[STOPS[index - 1]];
  return Math.sign(STOP_SPOTS[stop] - from);
}

/** Eyes follow the walk, then turn to what the stop is about once the mascot has arrived. */
function withLook(pose: MascotPose, stop: StopName, local: number, spot: Spot, target: Point | null): MascotPose {
  const walking = 1 - ease.glide(progress(local, WALK_SECONDS[stop] - 0.2, WALK_SECONDS[stop] + 0.1));
  const towards = target ? lookAt(spot, target) : { lookX: 0, lookY: 0 };
  return {
    ...pose,
    lookX: lerp(towards.lookX, WALK_LOOK * headingInto(stop), walking),
    lookY: pose.lookY + lerp(towards.lookY, 0, walking),
  };
}

function stopFrame(stop: StopName, local: number, format: FilmFormat, spot: Spot, base: MascotPose): ScreenFrame {
  const box = format.playBox;
  const frame = (state: StopFrame, pose: MascotPose, target: Point | null, cursor: CursorState | null, at: Spot = spot): ScreenFrame => ({
    spot: at,
    pose: withLook(pose, stop, local, at, target),
    cursor,
    bursts: [],
    stop: state,
  });
  switch (stop) {
    case "pop": {
      const state = popAt(local, box);
      return frame({ name: stop, state }, popPose(base, local), state.look, state.cursor);
    }
    case "slice": {
      const state = sliceAt(local, box);
      return frame({ name: stop, state }, slicePose(base, local), state.look, state.cursor);
    }
    case "catch": {
      const state = catchAt(local, box, spot);
      return frame({ name: stop, state }, catchPose(base, local), state.look, null);
    }
    case "learn": {
      const state = learnAt(local, box);
      return frame({ name: stop, state }, learnPose(base, local), state.look, state.cursor);
    }
    case "library": {
      const state = libraryAt(local, box);
      return frame({ name: stop, state }, libraryPose(base, local), state.look, state.cursor);
    }
    case "rewards": {
      const state = rewardsAt(local, box);
      // The mascot stands on the winner's bar: its spot rides the bar, its jump is a bounce above it.
      const raised = { ...spot, y: spot.y - state.surface };
      const pose = rewardsPose(base, local);
      return frame({ name: stop, state }, { ...pose, bounce: pose.bounce - state.lift / logoScale(spot.width) }, state.look, null, raised);
    }
  }
}

/**
 * The TV screen at `time` on `format`: where the mascot stands and how it
 * moves, the hand cursor, and the props of the stop being played. A pure
 * function of time, like the rest of the film.
 */
export function screenAt(time: number, format: FilmFormat): ScreenFrame {
  const scene = sceneAt(time);
  const { spot, gait } = routeAt(time, routeFor(format));
  switch (scene) {
    case "hello":
      return { spot, pose: helloPose(time), cursor: null, bursts: [], stop: null };
    case "tv":
    case "dive": {
      const burst = burstAt(time);
      return {
        spot,
        pose: tvPose(time),
        cursor: cursorAt(time),
        bursts: burst > 0 && burst < 1 ? [{ at: CURSOR_TARGET, amount: burst }] : [],
        stop: null,
      };
    }
    case "bye":
      return { spot, pose: byePose(time - SCENE_STARTS.bye, gait), cursor: null, bursts: [], stop: null };
    default: {
      const local = time - SCENE_STARTS[scene];
      return stopFrame(scene, local, format, spot, withGait(idlePose(local), gait));
    }
  }
}
