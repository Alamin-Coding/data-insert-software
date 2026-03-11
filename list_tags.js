const fs = require("fs");
const questions = JSON.parse(
	fs.readFileSync("nexes_data_grade5_id46903_batch1.json", "utf8"),
);

const tagNames = new Set();
questions.forEach((q) => {
	if (q.tags) {
		q.tags.forEach((t) => tagNames.add(t.full_name));
	}
});

console.log("Unique Tag Names found in batch:");
console.log(Array.from(tagNames).sort());
