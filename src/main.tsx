import { render } from "solid-js/web";
import { App } from "./app/App";
import "./styles/base.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("The application root element is missing.");
}

render(() => <App />, root);
