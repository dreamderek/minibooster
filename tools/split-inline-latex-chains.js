"use strict";

const fs = require("fs");
const path = require("path");

const questionDirectory = path.join(__dirname, "..", "data", "questions");

function splitInlineChains(value) {
    const splitValue = value.replace(/\\\(([\s\S]*?)\\\)/g, (match, math) => {
        const equalsCount = (math.match(/=/g) || []).length;
        if (equalsCount < 2 || /\\begin|\\\\/.test(math)) return match;

        const parts = math.split("=");
        const firstPart = parts.shift();
        if (firstPart === "") {
            return parts.map((part) => `\\(=${part}\\)`).join("");
        }
        return [firstPart, ...parts].map((part, index) => `\\(${index ? "=" : ""}${part}\\)`).join("");
    });
    return splitValue
        .replace(/\\\(\s*\\\)\\\(=/g, "\\(=")
        .split("\\\\(").join("\\(");
}

function transform(value) {
    if (typeof value === "string") return splitInlineChains(value);
    if (Array.isArray(value)) return value.map(transform);
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, transform(entry)]));
    }
    return value;
}

function patchFor(filename, before, after) {
    const oldLines = before.split("\n");
    const newLines = after.split("\n");
    return [
        `*** Update File: data/questions/${filename}`,
        "@@",
        ` ${oldLines[0]}`,
        ...oldLines.slice(1, -1).map((line) => `-${line}`),
        ...newLines.slice(1, -1).map((line) => `+${line}`),
        ` ${oldLines.at(-1)}`,
    ].join("\n");
}

const patches = fs.readdirSync(questionDirectory)
    .filter((filename) => /^q\d{3}\.json$/.test(filename))
    .sort()
    .map((filename) => {
        const filePath = path.join(questionDirectory, filename);
        const before = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n").trimEnd();
        const after = `${JSON.stringify(transform(JSON.parse(before)), null, 2)}\n`.replace(/\r\n/g, "\n").trimEnd();
        return patchFor(filename, before, after);
    });

process.stdout.write(`*** Begin Patch\n${patches.join("\n")}\n*** End Patch\n`);
