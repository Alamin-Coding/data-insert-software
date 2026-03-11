const fs = require("fs");
const questions = JSON.parse(
	fs.readFileSync("nexes_data_grade5_id46903_batch1.json", "utf8"),
);

const counts = {};
questions.forEach((q) => {
	const id = q.content_chunk_id;
	counts[id] = (counts[id] || 0) + 1;
});

console.log("Content Chunk ID Counts:");
console.log(JSON.stringify(counts, null, 2));

// Check if any these IDs match lesson IDs in bangla_2.json
const bangla = JSON.parse(fs.readFileSync("bangla_2.json", "utf8"));
const lessonIds = new Set(bangla.props.lessons.map((l) => String(l.id)));
const chapterIds = new Set(bangla.props.chapters.map((c) => String(c.id)));

console.log("\nMapping Analysis:");
Object.keys(counts).forEach((id) => {
	if (lessonIds.has(String(id))) {
		console.log(`- ID ${id}: MATCHES LESSON (${counts[id]} questions)`);
	} else if (chapterIds.has(String(id))) {
		console.log(`- ID ${id}: MATCHES CHAPTER (${counts[id]} questions)`);
	} else {
		console.log(`- ID ${id}: NO MATCH (${counts[id]} questions)`);
	}
});
