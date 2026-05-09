import assert from "node:assert/strict";
import test from "node:test";
import { validateTags } from "../src/tagValidator.ts";

const tagTree = [
  "#类型/备忘",
  "#类型/灵感",
  "#领域/技术",
  "#领域/技术/智能驾驶"
];

test("删除未知标签并保留已有标签", () => {
  assert.deepEqual(validateTags(["#类型/灵感", "#不存在"], tagTree), ["#类型/灵感"]);
});

test("没有类型标签时补充备忘类型", () => {
  assert.deepEqual(validateTags(["#领域/技术"], tagTree), ["#类型/备忘", "#领域/技术"]);
});

test("标签数量不超过四个", () => {
  assert.equal(validateTags(["#类型/灵感", "#领域/技术", "#领域/技术/智能驾驶"], tagTree).length, 3);
});
