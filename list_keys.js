const fs = require("fs");
const questions = JSON.parse(
	fs.readFileSync("nexes_data_grade5_id46903_batch1.json", "utf8"),
);

const allKeys = new Set();
questions.forEach((q) => {
	Object.keys(q).forEach((k) => allKeys.add(k));
	if (q.value) Object.keys(q.value).forEach((k) => allKeys.add("value." + k));
});

console.log("All unique keys found:");
console.log(Array.from(allKeys).sort());
