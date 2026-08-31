import { enPrimary } from "./en-primary";
import { enSecondary } from "./en-secondary";
import type { Dictionary } from "./he";

const dictionary = { ...enPrimary, ...enSecondary } satisfies Dictionary;

export default dictionary;
