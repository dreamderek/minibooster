"use strict";

const fs = require("fs");
const path = require("path");
const questionDirectory = path.join(__dirname, "..", "data", "questions");
const sourcePrefix = /^\d{3}學測數學[AB]\s+多選第\d+題：/;

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
    .sort();
const patches = filenames.flatMap((filename) => {
    const filePath = path.join(questionDirectory, filename);
    const before = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n").trimEnd();
    const question = JSON.parse(before);
    const title = question.title.replace(sourcePrefix, "");
    if (title === question.title) return [];
    const after = `${JSON.stringify({ ...question, title }, null, 2)}\n`.replace(/\r\n/g, "\n").trimEnd();
    return [patchFor(filename, before, after)];
});

process.stdout.write(`*** Begin Patch\n${patches.join("\n")}\n*** End Patch\n`);
