import type { Dictionary } from "./he";
import { ruPrimary } from "./ru-primary";
import { ruSecondary } from "./ru-secondary";

const dictionary = { ...ruPrimary, ...ruSecondary } satisfies Dictionary;

export default dictionary;
