import { hePrimary } from "./he-primary";
import { heSecondary } from "./he-secondary";

const dictionary = { ...hePrimary, ...heSecondary };

export type Dictionary = typeof dictionary;
export default dictionary;
