const fs = require('fs');

const content = fs.readFileSync(process.argv[2], 'utf8');
const lines = content.split('\n');

let questionsCount = 0;
let answersCount = 0;

let InQuestion = false;
let hasAnswer = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  if (line.startsWith('Question #')) {
    if (InQuestion && hasAnswer) answersCount++;
    questionsCount++;
    InQuestion = true;
    hasAnswer = false;
  }
  
  if (InQuestion && line.startsWith('Correct Answer:')) {
    const ansPart = line.replace('Correct Answer:', '').trim();
    if (ansPart.length > 0) hasAnswer = true;
  }
  
  if (InQuestion && line.startsWith('Solution:')) {
     if (i + 1 < lines.length && lines[i+1].trim() !== '') {
         hasAnswer = true;
     }
  }
  if (InQuestion && line.startsWith('Explanation:')) {
     if (i + 1 < lines.length && lines[i+1].trim() !== '') {
         hasAnswer = true;
     }
  }
}
if (InQuestion && hasAnswer) answersCount++;

console.log(`Questions: ${questionsCount}, Answers: ${answersCount}`);
