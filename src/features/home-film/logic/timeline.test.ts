import { describe, expect, it } from "vitest";
import { SCENES } from "../constants";
import { FILM_LENGTH, SCENE_STARTS, sceneAt, sceneEnd } from "./timeline";

describe("timeline", () => {
  it("adds the scenes up to the film's length", () => {
    expect(FILM_LENGTH).toBe(27);
  });

  it("starts each scene where the one before it ends", () => {
    SCENES.forEach((scene, i) => {
      const next = SCENES[i + 1];
      expect(sceneEnd(scene.name)).toBeCloseTo(next ? SCENE_STARTS[next.name] : FILM_LENGTH, 9);
      expect(sceneEnd(scene.name) - SCENE_STARTS[scene.name]).toBeCloseTo(scene.seconds, 9);
    });
  });

  it("names the scene on screen, switching exactly at each start", () => {
    expect(sceneAt(0)).toBe("hello");
    for (const scene of SCENES) {
      expect(sceneAt(SCENE_STARTS[scene.name])).toBe(scene.name);
      expect(sceneAt(sceneEnd(scene.name) - 1e-6)).toBe(scene.name);
    }
  });
});
