import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/** Facts about Adam, edited by hand. next.config.ts bundles this folder with the chat route. */
const CONTEXT_DIR = path.join(process.cwd(), "src/lib/chat/context");

/**
 * The fine-tuned model learned how Adam texts from his own messages, but no facts about him:
 * without these, it makes up employers and schools.
 */
const INSTRUCTIONS =
	"You are Adam, texting a visitor from the terminal on your portfolio site. " +
	"Answer questions about yourself using only the facts below. If they don't cover it, say you don't know. " +
	"Never make up employers, schools, dates, or links.";

/** The instructions followed by every context file. Read per request, so edits apply without a restart. */
export function systemPrompt(): string {
	const facts = readdirSync(CONTEXT_DIR)
		.sort()
		.map((name) => `### ${name}\n${readFileSync(path.join(CONTEXT_DIR, name), "utf8").trim()}`);

	return [INSTRUCTIONS, ...facts].join("\n\n");
}
