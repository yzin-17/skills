import type { WhistleRoute } from "../artifact/types.js";

export function generateWhistleRules(routes: WhistleRoute[], groupName: string | null): string {
  const confirmedGroupName = requireGroupName(groupName);
  const rulesText = generateRulesText(routes);
  return `${JSON.stringify({ [confirmedGroupName]: rulesText, "": [confirmedGroupName] }, null, 2)}\n`;
}

export function generateWhistleCliModule(routes: WhistleRoute[], groupName: string | null): string {
  const confirmedGroupName = requireGroupName(groupName);
  const rulesText = generateRulesText(routes);

  return `exports.groupName = ${JSON.stringify(confirmedGroupName)};
exports.name = ${JSON.stringify(confirmedGroupName)};
exports.rules = \`${escapeTemplateLiteral(rulesText)}\`;
`;
}

function requireGroupName(groupName: string | null): string {
  const confirmedGroupName = groupName?.trim();
  if (!confirmedGroupName) {
    throw new Error("Cannot export whistle rules: groupName is pending confirmation.");
  }
  return confirmedGroupName;
}

function generateRulesText(routes: WhistleRoute[]): string {
  const lines = routes.map((route) => ruleFor(route));
  return lines.length > 0 ? `${lines.join("\n")}\n` : "";
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

function escapeTemplateLiteral(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}
