const fs = require("fs");
const data = JSON.parse(fs.readFileSync("bangla_2.json", "utf8"));
const searchIds = [13131, 13151, 13153, 13197];

function search(obj, path = "") {
	if (!obj || typeof obj !== "object") return;

	for (const key in obj) {
		if (obj.hasOwnProperty(key)) {
			const val = obj[key];
			if (searchIds.includes(val)) {
				console.log(`FOUND ${val} at path: ${path}${key}`);
			}
			search(val, `${path}${key}.`);
		}
	}
}

search(data);
