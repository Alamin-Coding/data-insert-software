const fs = require("fs");
const content = fs.readFileSync("bangla_2.json", "utf8");
const data = JSON.parse(content);

function listAllArrays(obj, path = "") {
	if (!obj || typeof obj !== "object") return;

	if (Array.isArray(obj)) {
		if (obj.length > 0) {
			console.log(`ARRAY at path: ${path} (count: ${obj.length})`);
			if (typeof obj[0] === "object" && obj[0] !== null) {
				console.log(`  Sample keys:`, Object.keys(obj[0]));
			} else {
				console.log(`  Type:`, typeof obj[0]);
			}
		}
	}

	for (const key in obj) {
		if (obj.hasOwnProperty(key)) {
			listAllArrays(obj[key], path ? `${path}.${key}` : key);
		}
	}
}

listAllArrays(data);
