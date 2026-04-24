import type { ActionNode } from "../model/nodes";

export const INTERNAL_TO_V2_ACTION_TYPE: Record<ActionNode["actionType"], string> = {
  msg: "msg",
  pick: "pick",
  goto: "goto",
  selector: "selector",
  req: "req",
  pwd: "pwd",
};

