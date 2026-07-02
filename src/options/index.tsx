import React from "react";
import { createRoot } from "react-dom/client";
import { Options } from "@/components/options/Options";
import "@/index.css";

const root = createRoot(document.getElementById("root")!);
root.render(<Options />);
