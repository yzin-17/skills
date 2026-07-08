import type { WhistleRoute } from "../artifact/types.js";

export function generateWhistleRules(routes: WhistleRoute[], groupName: string | null): string {
  const confirmedGroupName = groupName?.trim();
  if (!confirmedGroupName) {
    throw new Error("Cannot export whistle rules: groupName is pending confirmation.");
  }

  const lines = routes.map((route) => ruleFor(route));
  const rulesText = lines.length > 0 ? `${lines.join("\n")}\n` : "";
  return `${JSON.stringify({ [confirmedGroupName]: rulesText, "": [confirmedGroupName] }, null, 2)}\n`;
}

function ruleFor(route: WhistleRoute): string {
  if (route.apiHost === "pending-confirmation") {
    throw new Error(`Cannot export whistle rule for ${route.operationId}: apiHost is pending confirmation.`);
  }

  if (route.targetPort === null) {
    throw new Error(`Cannot export whistle rule for ${route.operationId}: targetPort is pending confirmation.`);
  }

  return `${route.apiHost}${route.sourcePattern} http://127.0.0.1:${route.targetPort}${route.targetPath}`;
}
