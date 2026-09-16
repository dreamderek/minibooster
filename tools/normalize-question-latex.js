"use strict";

const fs = require("fs");
const path = require("path");

const questionDirectory = path.join(__dirname, "..", "data", "questions");
const requestedFiles = new Set(process.argv.slice(2));
const replacements = [
    [/\u0007lpha/g, "\\alpha"],
    [/\u0008ar/g, "\\bar"],
    [/\u0008eta/g, "\\beta"],
    [/\u000crac/g, "\\frac"],
];

function normalize(value) {
    if (typeof value === "string") {
        return replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
    }
    if (Array.isArray(value)) return value.map(normalize);
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, normalize(entry)]));
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

const filenames = fs.readdirSync(questionDirectory)
    .filter((filename) => /^q\d{3}\.json$/.test(filename))
    .filter((filename) => requestedFiles.size === 0 || requestedFiles.has(filename))
    .sort();

if (requestedFiles.size && filenames.length !== requestedFiles.size) {
    const missing = [...requestedFiles].filter((filename) => !filenames.includes(filename));
    throw new Error("Question files not found: " + missing.join(", "));
}

const patches = filenames.map((filename) => {
    const filePath = path.join(questionDirectory, filename);
    const before = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n").trimEnd();
    const after = `${JSON.stringify(normalize(JSON.parse(before)), null, 2)}\n`.replace(/\r\n/g, "\n").trimEnd();
    return patchFor(filename, before, after);
});

process.stdout.write(`*** Begin Patch\n${patches.join("\n")}\n*** End Patch\n`);
