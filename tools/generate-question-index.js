"use strict";

const fs = require("fs");
const path = require("path");

const questionsDirectory = path.join(__dirname, "..", "data", "questions");
const indexPath = path.join(questionsDirectory, "index.json");
const questionFilenamePattern = /^q\d{3}\.json$/;

function readQuestionIds() {
    const entries = fs.readdirSync(questionsDirectory, { withFileTypes: true });
    const questionFiles = entries
        .filter((entry) => entry.isFile() && questionFilenamePattern.test(entry.name) && entry.name !== "q000.json")
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right, "en"));

    if (questionFiles.length === 0) {
        throw new Error("No question files matching qNNN.json were found.");
    }

    return questionFiles.map((filename) => {
        const questionPath = path.join(questionsDirectory, filename);
        try {
            JSON.parse(fs.readFileSync(questionPath, "utf8"));
        } catch (error) {
            throw new Error(`${filename} is not valid JSON: ${error.message}`);
        }
        return path.basename(filename, ".json");
    });
}

try {
    const questionIds = readQuestionIds();
    const index = {
        version: 1,
        questionIds,
    };

    fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 4)}\n`, "utf8");
    console.log(`Updated data/questions/index.json with ${questionIds.length} question IDs.`);
} catch (error) {
    console.error(`Unable to generate question index: ${error.message}`);
    process.exitCode = 1;
}
