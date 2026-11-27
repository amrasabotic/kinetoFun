import { describe, expect, it } from "vitest";
import { FORMATS } from "../../constants";
import { mascotHeight } from "../mascot-space";
import { groundSpot, STOP_SPOTS } from "../route";
import { catchAt, catchPose, landingOf, STARS } from "./catch";
import { BLOCKS, learnAt } from "./learn";
import { libraryAt, PICK, tileSize } from "./library";
import { popAt, POPS } from "./pop";
import { JUMP, mascotHeightAbove, rewardsAt } from "./rewards";
import { cutOf, sliceAt } from "./slice";
import { idlePose } from "../mascot-motion";

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

for (const format of Object.values(FORMATS)) {
  const box = format.playBox;

  describe(`stops on ${format.key}`, () => {
    describe("pop", () => {
      it("lands the cursor on each balloon as it pops, and the balloon is gone after", () => {
        for (const pop of POPS) {
          const before = popAt(pop.at - 1e-4, box);
          const balloon = before.balloons[pop.balloon];
          expect(balloon).not.toBeNull();
          expect(distance(before.cursor.point, balloon!)).toBeLessThan(balloon!.r * 0.5);
          expect(popAt(pop.at + 0.01, box).balloons[pop.balloon]).toBeNull();
        }
      });

      it("floats every balloon off the top before the stop ends", () => {
        const end = popAt(2.6, box);
        for (const balloon of end.balloons) if (balloon) expect(balloon.y + balloon.r * 3).toBeLessThan(0);
      });
    });

    describe("slice", () => {
      it("cuts every fruit with a blade that passes through it", () => {
        for (let i = 0; i < 3; i++) {
          const cut = cutOf(i, box);
          expect(cut.distance, `fruit ${i}`).toBeLessThan(25 * (box.mascot / 176));
        }
      });

      it("draws a blade trail only while a swipe runs", () => {
        expect(sliceAt(0.5, box).trail).toHaveLength(0);
        expect(sliceAt(1.05, box).trail.length).toBeGreaterThan(1);
      });

      it("has thrown and cut everything, and let it fall away, by the end", () => {
        const end = sliceAt(2.6, box);
        expect(end.whole).toHaveLength(0);
        for (const half of end.halves) expect(half.opacity).toBe(0);
      });
    });

    describe("catch", () => {
      const spot = groundSpot(box, STOP_SPOTS.catch);

      it("drops each star into the hand that catches it", () => {
        STARS.forEach((star, i) => {
          const falling = catchAt(star.at - 0.005, box, spot).stars;
          const landing = landingOf(i, spot);
          expect(falling.some((s) => distance(s, landing) < 12)).toBe(true);
        });
      });

      it("pops the second hand out for the catch and puts it away after", () => {
        expect(catchPose(idlePose(0), 0.2).hand2).toBe(0);
        expect(catchPose(idlePose(0), STARS[1].at).hand2).toBe(1);
        expect(catchPose(idlePose(0), 2.7).hand2).toBe(0);
      });
    });

    describe("learn", () => {
      it("rests every block on the ground beside the mascot, clear of it", () => {
        const blocks = learnAt(0.95, box).blocks;
        const mascot = groundSpot(box, STOP_SPOTS.learn);
        expect(blocks).toHaveLength(3);
        for (const block of blocks) {
          expect(block.y + block.size / 2).toBeLessThanOrEqual(box.ground);
          expect(block.x - block.size / 2).toBeGreaterThan(mascot.x + mascot.width * 0.28);
          expect(block.x + block.size / 2).toBeLessThanOrEqual(box.x + box.width);
        }
      });

      it("lights each block as the cursor taps it", () => {
        BLOCKS.forEach((block, i) => {
          const at = learnAt(block.tap, box);
          expect(distance(at.cursor.point, at.blocks[i])).toBeLessThan(4);
          expect(at.blocks[i].lit).toBe(0);
          expect(learnAt(block.tap + 0.3, box).blocks[i].lit).toBe(1);
        });
      });
    });

    describe("library", () => {
      it("fits two rows of tiles above the mascot's head", () => {
        const size = tileSize(box);
        expect(box.y + 4 + size * 2.14).toBeLessThanOrEqual(box.ground - mascotHeight(box.mascot));
      });

      it("rests only whole tiles inside the play box", () => {
        for (const tile of libraryAt(1.6, box).tiles) {
          expect(tile.opacity).toBe(1);
          expect(tile.x - tile.size / 2).toBeGreaterThanOrEqual(box.x - 1e-6);
          expect(tile.x + tile.size / 2).toBeLessThanOrEqual(box.x + box.width + 1e-6);
        }
      });

      it("keeps the cursor on the picked tile while its ring fills", () => {
        const at = libraryAt(PICK.select - 0.01, box);
        const picked = at.tiles.find((tile) => tile.hovered > 0);
        expect(picked).toBeDefined();
        expect(distance(at.cursor.point, picked!)).toBeLessThan(4);
        expect(at.cursor.fill).toBeGreaterThan(0.95);
      });

      it("has slid every tile away by the end", () => {
        expect(libraryAt(2.8, box).tiles).toHaveLength(0);
      });
    });

    describe("rewards", () => {
      it("never lets the winner's bar rise through the jumping mascot", () => {
        for (let t = JUMP.start; t <= JUMP.land + 0.2; t += 0.005) {
          expect(mascotHeightAbove(t, box)).toBeGreaterThanOrEqual(rewardsAt(t, box).surface - 1e-6);
        }
      });

      it("stands the mascot on the bar after landing and lowers both together at the end", () => {
        const standing = rewardsAt(2, box);
        expect(standing.lift).toBeCloseTo(0, 6);
        expect(standing.surface).toBeGreaterThan(0);
        const end = rewardsAt(3, box);
        expect(end.bars.every((bar) => bar.height === 0)).toBe(true);
        expect(end.surface).toBe(0);
      });

      it("counts each ticket that reaches the counter", () => {
        expect(rewardsAt(1.5, box).counter.value).toBe(120);
        expect(rewardsAt(2.7, box).counter.value).toBe(170);
      });
    });
  });
}
