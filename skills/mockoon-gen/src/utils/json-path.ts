export function pathFor(parts: Array<string | number>): string {
  return parts
    .map((part, index) => {
      if (typeof part === "number") return `[${part}]`;
      return index === 0 ? part : `.${part}`;
    })
    .join("");
}
